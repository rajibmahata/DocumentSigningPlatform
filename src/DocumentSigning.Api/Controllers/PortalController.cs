using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using iText.Forms;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController : ControllerBase
{
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly IDocumentRepository _docRepo;
    private readonly IClaimRepository _claimRepo;
    private readonly IAuditLogRepository _auditRepo;
    private readonly ITokenService _tokenService;
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly ISignedDocumentRepository _signedDocRepo;

    public PortalController(
        ISigningRequestRepository signingRequestRepo,
        IDocumentRepository docRepo,
        IClaimRepository claimRepo,
        IAuditLogRepository auditRepo,
        ITokenService tokenService,
        ISigningEnvelopeRepository envelopeRepo,
        ISignedDocumentRepository signedDocRepo)
    {
        _signingRequestRepo = signingRequestRepo;
        _docRepo = docRepo;
        _claimRepo = claimRepo;
        _auditRepo = auditRepo;
        _tokenService = tokenService;
        _envelopeRepo = envelopeRepo;
        _signedDocRepo = signedDocRepo;
    }

    /// <summary>
    /// Validates a signing token and returns the document preview.
    /// Called by the Blazor portal before rendering the document.
    /// </summary>
    [HttpGet("validate/{token}")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(typeof(DocumentPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<IActionResult> Validate(string token, CancellationToken ct)
    {
        var signingRequest = await _signingRequestRepo.GetByTokenAsync(token, ct);
        if (signingRequest is null) return NotFound("Token not found.");

        if (signingRequest.ExpiresAt < DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, "Token has expired.");

        if (signingRequest.Status == Core.Enums.SigningStatus.Signed)
            return BadRequest("This document has already been signed.");

        // Validate HMAC signature
        if (!_tokenService.ValidateTokenSignature(token, signingRequest.ClaimId, signingRequest.DocumentId))
            return BadRequest("Invalid token signature.");

        var doc = await _docRepo.GetByIdAsync(signingRequest.DocumentId, ct);
        if (doc is null) return NotFound("Document not found.");

        var claim = await _claimRepo.GetByIdAsync(signingRequest.ClaimId, ct);
        if (claim is null) return NotFound("Claim not found.");

        // Audit: portal opened
        await _auditRepo.AppendAsync(new Core.Entities.AuditLog
        {
            Id = Guid.NewGuid(),
            SigningRequestId = signingRequest.Id,
            ClaimId = signingRequest.ClaimId,
            Action = "PortalOpened",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = Request.Headers.UserAgent.ToString(),
            Timestamp = DateTime.UtcNow
        }, ct);
        await _auditRepo.SaveChangesAsync(ct);

        return Ok(new DocumentPreviewResponse(
            Convert.ToBase64String(doc.ContentBytes),
            doc.ContentType,
            claim.ClaimantName,
            doc.DocumentFileName,
            signingRequest.ExpiresAt));
    }

    /// <summary>
    /// Streams the raw document bytes for inline preview or download.
    /// Re-validates the signing token — no audit log recorded (already logged on portal open).
    /// </summary>
    [HttpGet("document/{token}")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<IActionResult> GetDocument(string token, CancellationToken ct)
    {
        var signingRequest = await _signingRequestRepo.GetByTokenAsync(token, ct);
        if (signingRequest is null) return NotFound("Token not found.");

        if (signingRequest.ExpiresAt < DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, "Token has expired.");

        if (!_tokenService.ValidateTokenSignature(token, signingRequest.ClaimId, signingRequest.DocumentId))
            return BadRequest("Invalid token signature.");

        var doc = await _docRepo.GetByIdAsync(signingRequest.DocumentId, ct);
        if (doc is null) return NotFound("Document not found.");

        Response.Headers.Append("Cache-Control", "no-store, no-cache");
        return File(doc.ContentBytes, doc.ContentType);
    }

    /// <summary>
    /// Returns platform-wide stats: total envelopes sent and total documents signed.
    /// Public endpoint — no authentication required.
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(PlatformStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var sent   = await _envelopeRepo.CountAllAsync(ct);
        var signed = await _signedDocRepo.CountAllAsync(ct);
        return Ok(new PlatformStatsResponse(sent, signed));
    }

    /// <summary>
    /// Returns all envelopes (active + historical) where the logged-in user is a signer,
    /// including envelope details, merchant name, documents, and signing token/expiry.
    /// Requires JWT authentication.
    /// </summary>
    [HttpGet("my-envelopes")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(List<MyEnvelopeResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyEnvelopes(CancellationToken ct)
    {
        var email = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
                 ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                 ?? User.FindFirst("email")?.Value;

        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized("Email claim not found in token.");

        var envelopes = await _envelopeRepo.GetAllBySignerEmailAsync(email, ct);

        var result = new List<MyEnvelopeResponse>();

        foreach (var envelope in envelopes)
        {
            var signer = envelope.Signers.FirstOrDefault(s =>
                string.Equals(s.Email, email, StringComparison.OrdinalIgnoreCase));
            if (signer is null) continue;

            // Find the signing request for this signer's first document in this envelope
            var firstDoc = envelope.Documents.FirstOrDefault();
            string token    = string.Empty;
            DateTime expiry = DateTime.UtcNow;

            if (firstDoc is not null)
            {
                // Look up via ClaimId — fallback to a direct query by documentId + envelopeId
                var sr = await _signingRequestRepo.GetByDocumentAndEnvelopeAsync(firstDoc.Id, envelope.Id, ct);
                if (sr is not null)
                {
                    token  = sr.Token;
                    expiry = sr.ExpiresAt;
                }
            }

            var docs = envelope.Documents
                .Select(d => new MyEnvelopeDocumentSummary(d.DocumentTitle, d.DocumentFileName))
                .ToList();

            result.Add(new MyEnvelopeResponse(
                envelope.Id,
                envelope.Title,
                envelope.Status.ToString(),
                envelope.CreatedAt,
                envelope.Merchant?.Name ?? "—",
                signer.Role,
                token,
                expiry,
                docs));
        }

        return Ok(result);
    }

    /// <summary>
    /// DEBUG ONLY — dumps all text that iText7 can extract from the PDF attached to the
    /// given signing token: content stream text, annotation /Contents, AcroForm field
    /// names/values/tooltips, and widget AP/N appearance stream text.
    /// Use this to diagnose why a placeholder is not being found.
    /// </summary>
    [HttpGet("debug/pdf-text/{token}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DebugPdfText(string token, CancellationToken ct)
    {
        var signingRequest = await _signingRequestRepo.GetByTokenAsync(token, ct);
        if (signingRequest is null) return NotFound("Token not found.");

        var doc = await _docRepo.GetByIdAsync(signingRequest.DocumentId, ct);
        if (doc is null) return NotFound("Document not found.");

        if (!doc.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Document is not a PDF.");

        var result = new System.Text.StringBuilder();

        using var ms     = new MemoryStream(doc.ContentBytes);
        using var reader = new PdfReader(ms);
        reader.SetUnethicalReading(true);
        using var pdfDoc = new PdfDocument(reader);

        int totalPages = pdfDoc.GetNumberOfPages();
        result.AppendLine($"Pages: {totalPages}");

        // ── Content stream text ───────────────────────────────────────────
        for (int p = 1; p <= totalPages; p++)
        {
            var strategy = new SimpleTextExtractionStrategy();
            var text = PdfTextExtractor.GetTextFromPage(pdfDoc.GetPage(p), strategy);
            result.AppendLine($"\n=== PAGE {p} CONTENT STREAM TEXT ===");
            result.AppendLine(string.IsNullOrWhiteSpace(text) ? "(empty)" : text);
        }

        // ── Annotation /Contents ──────────────────────────────────────────
        result.AppendLine("\n=== ANNOTATION /Contents ===");
        for (int p = 1; p <= totalPages; p++)
        {
            foreach (var annot in pdfDoc.GetPage(p).GetAnnotations())
            {
                var contents = annot.GetContents()?.ToUnicodeString();
                var subtype  = annot.GetPdfObject().GetAsName(iText.Kernel.Pdf.PdfName.Subtype)?.GetValue();
                result.AppendLine($"  Page {p} [{subtype}] Contents: {contents ?? "(null)"}");
            }
        }

        // ── AcroForm fields ───────────────────────────────────────────────
        result.AppendLine("\n=== ACROFORM FIELDS ===");
        try
        {
            var acroForm = PdfAcroForm.GetAcroForm(pdfDoc, false);
            if (acroForm is null)
            {
                result.AppendLine("  (no AcroForm)");
            }
            else
            {
                foreach (var (fName, field) in acroForm.GetAllFormFields())
                {
                    var value   = field.GetValueAsString();
                    var tooltip = field.GetPdfObject().GetAsString(iText.Kernel.Pdf.PdfName.TU)?.ToUnicodeString();
                    result.AppendLine($"  Name: '{fName}'  Value: '{value}'  Tooltip: '{tooltip}'");
                }
            }
        }
        catch (Exception ex)
        {
            result.AppendLine($"  (AcroForm error: {ex.Message})");
        }

        // ── Widget AP/N appearance stream text ────────────────────────────
        result.AppendLine("\n=== WIDGET AP/N APPEARANCE STREAMS ===");
        for (int p = 1; p <= totalPages; p++)
        {
            foreach (var annot in pdfDoc.GetPage(p).GetAnnotations())
            {
                try
                {
                    var apDict = annot.GetPdfObject().GetAsDictionary(iText.Kernel.Pdf.PdfName.AP);
                    if (apDict is null) continue;
                    var nStream = apDict.GetAsStream(iText.Kernel.Pdf.PdfName.N);
                    if (nStream is null) continue;

                    var apStrategy = new SimpleTextExtractionStrategy();
                    var resDict    = nStream.GetAsDictionary(iText.Kernel.Pdf.PdfName.Resources);
                    var resources  = resDict is not null
                        ? new iText.Kernel.Pdf.PdfResources(resDict)
                        : new iText.Kernel.Pdf.PdfResources();
                    var processor  = new PdfCanvasProcessor(apStrategy);
                    processor.ProcessContent(nStream.GetBytes(), resources);
                    var apText = apStrategy.GetResultantText();
                    result.AppendLine($"  Page {p} AP/N: '{apText}'");
                }
                catch (Exception ex)
                {
                    result.AppendLine($"  Page {p} AP/N error: {ex.Message}");
                }
            }
        }

        return Content(result.ToString(), "text/plain");
    }
}
