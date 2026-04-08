using System.Security.Cryptography;
using System.Text.Json;
using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Multi-signer envelope-based signing flow.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/envelopes")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class EnvelopeController : ControllerBase
{
    private readonly IMerchantRepository _merchantRepo;
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly IClaimRepository _claimRepo;
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly IOutboxQueueRepository _outboxRepo;
    private readonly IAuditLogRepository _auditRepo;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;

    public EnvelopeController(
        IMerchantRepository merchantRepo,
        ISigningEnvelopeRepository envelopeRepo,
        IClaimRepository claimRepo,
        ISigningRequestRepository signingRequestRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditLogRepository auditRepo,
        ITokenService tokenService,
        IConfiguration config)
    {
        _merchantRepo = merchantRepo;
        _envelopeRepo = envelopeRepo;
        _claimRepo = claimRepo;
        _signingRequestRepo = signingRequestRepo;
        _outboxRepo = outboxRepo;
        _auditRepo = auditRepo;
        _tokenService = tokenService;
        _config = config;
    }

    /// <summary>
    /// Initiates a signing envelope for one or more signers and documents.
    /// </summary>
    [HttpPost]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(typeof(InitiateEnvelopeResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] InitiateEnvelopeRequest request,
        CancellationToken ct)
    {
        // Merchant resolved by filter
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        // ── Validate request ────────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");
        if (request.Documents is null || request.Documents.Count == 0)
            return BadRequest("At least one document is required.");
        if (request.Signers is null || request.Signers.Count == 0)
            return BadRequest("At least one signer is required.");

        // ── Validate & decode documents ─────────────────────────────────────
        var allowedTypes = new[]
        {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
        };

        var docEntities = new List<Document>();
        foreach (var d in request.Documents)
        {
            if (string.IsNullOrWhiteSpace(d.DocumentBase64))
                return BadRequest($"Document '{d.DocumentFileName}' has no content.");

            byte[] bytes;
            try { bytes = Convert.FromBase64String(d.DocumentBase64); }
            catch { return BadRequest($"Document '{d.DocumentFileName}' has invalid base64 content."); }

            // Resolve content type: explicit field wins, then fall back to file extension
            var rawType = d.DocumentContentType?.Trim().ToLowerInvariant()
                          ?? Path.GetExtension(d.DocumentFileName).TrimStart('.').ToLowerInvariant();

            var contentType = rawType switch
            {
                "pdf"  or "application/pdf"                                                                                  => "application/pdf",
                "docx" or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"                          => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "doc"  or "application/msword"                                                                               => "application/msword",
                _      => string.Empty
            };

            if (!allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
                return BadRequest($"Unsupported content type '{rawType}' for '{d.DocumentFileName}'. Accepted: pdf, doc, docx.");

            docEntities.Add(new Document
            {
                Id                = Guid.NewGuid(),
                ClaimId           = Guid.Empty, // envelope-level; ClaimId not relevant here
                DocumentTitle     = d.DocumentTitle,
                DocumentFileName  = d.DocumentFileName,
                ContentBytes      = bytes,
                ContentType       = contentType,
                Hash              = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
                CreatedAt         = DateTime.UtcNow
            });
        }

        // ── Build envelope ──────────────────────────────────────────────────
        var envelope = new SigningEnvelope
        {
            Id         = Guid.NewGuid(),
            MerchantId = merchant.Id,
            Title      = request.Title.Trim(),
            Status     = EnvelopeStatus.Sent,
            CreatedAt  = DateTime.UtcNow,
            Documents  = docEntities,
            Signers    = request.Signers
                .OrderBy(s => s.Order)
                .Select(s => new Signer
                {
                    Id         = Guid.NewGuid(),
                    Name       = s.Name,
                    Email      = s.Email,
                    Role       = s.Role,
                    Order      = s.Order,
                    Message    = s.Message,
                    Status     = SigningStatus.Pending,
                    CreatedAt  = DateTime.UtcNow
                }).ToList()
        };

        // Set back-ref on documents
        foreach (var doc in envelope.Documents)
            doc.EnvelopeId = envelope.Id;

        await _envelopeRepo.AddAsync(envelope, ct);
        await _envelopeRepo.SaveChangesAsync(ct);

        // ── Create SigningRequest + send invitation for each signer ─────────
        var baseUrl = _config["App:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        var expiry  = DateTime.UtcNow.AddDays(7);

        // Use first document for the signing token (multi-document support can be extended)
        var primaryDoc = docEntities.First();

        foreach (var signer in envelope.Signers)
        {
            // Each signer needs their own claim (identity record)
            var claimId = Guid.NewGuid();
            var claim = new Claim
            {
                Id            = claimId,
                ClaimantName  = signer.Name,
                ClaimantEmail = signer.Email,
                Status        = ClaimStatus.Active,
                CreatedAt     = DateTime.UtcNow
            };
            await _claimRepo.AddAsync(claim, ct);

            var token = _tokenService.GenerateToken(claimId, primaryDoc.Id, out _);

            var signingRequest = new SigningRequest
            {
                Id         = Guid.NewGuid(),
                Token      = token,
                ClaimId    = claimId,
                DocumentId = primaryDoc.Id,
                Status     = SigningStatus.Pending,
                ExpiresAt  = expiry,
                CreatedAt  = DateTime.UtcNow
            };
            await _signingRequestRepo.AddAsync(signingRequest, ct);

            var signingLink = $"{baseUrl}/sign/{token}";
            var emailPayload = JsonSerializer.Serialize(new SendEmailPayload(
                signer.Email,
                signer.Name,
                signingLink,
                expiry,
                "Invitation"));

            await _outboxRepo.AddAsync(new OutboxQueue
            {
                Id        = Guid.NewGuid(),
                JobType   = JobTypes.SendEmail,
                Payload   = emailPayload,
                Status    = JobStatus.Pending,
                CreatedAt = DateTime.UtcNow
            }, ct);

            await _auditRepo.AppendAsync(new AuditLog
            {
                Id               = Guid.NewGuid(),
                SigningRequestId = signingRequest.Id,
                ClaimId          = claimId,
                Action           = "EnvelopeSigningInitiated",
                IpAddress        = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                UserAgent        = Request.Headers.UserAgent.ToString(),
                Timestamp        = DateTime.UtcNow
            }, ct);
        }

        await _signingRequestRepo.SaveChangesAsync(ct);
        await _outboxRepo.SaveChangesAsync(ct);
        await _auditRepo.SaveChangesAsync(ct);

        // ── Increment merchant usage ─────────────────────────────────────────
        merchant.RequestUsed++;
        await _merchantRepo.UpdateAsync(merchant, ct);
        await _merchantRepo.SaveChangesAsync(ct);

        // ── Build response ───────────────────────────────────────────────────
        var response = new InitiateEnvelopeResponse(
            envelope.Id,
            envelope.Title,
            envelope.Status.ToString(),
            envelope.CreatedAt,
            envelope.Documents.Select(d => new DocumentSummary(d.Id, d.DocumentTitle)).ToList(),
            envelope.Signers.Select(s => new SignerSummary(s.Name, s.Role, s.Email, s.Status.ToString())).ToList()
        );

        return CreatedAtAction(nameof(GetById), new { id = envelope.Id }, response);
    }

    /// <summary>Returns a signing envelope by ID (merchant-scoped).</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InitiateEnvelopeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        return Ok(MapToResponse(envelope));
    }

    /// <summary>Returns all envelopes for the authenticated merchant.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InitiateEnvelopeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelopes = await _envelopeRepo.GetByMerchantAsync(merchant.Id, ct);
        return Ok(envelopes.Select(MapToResponse));
    }

    private static InitiateEnvelopeResponse MapToResponse(SigningEnvelope e) => new(
        e.Id,
        e.Title,
        e.Status.ToString(),
        e.CreatedAt,
        e.Documents.Select(d => new DocumentSummary(d.Id, d.DocumentTitle)).ToList(),
        e.Signers.Select(s => new SignerSummary(s.Name, s.Role, s.Email, s.Status.ToString())).ToList()
    );
}
