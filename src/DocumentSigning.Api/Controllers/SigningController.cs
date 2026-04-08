using System.Security.Cryptography;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/signing")]
public class SigningController : ControllerBase
{
    private readonly IClaimRepository _claimRepo;
    private readonly IDocumentRepository _docRepo;
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly IOutboxQueueRepository _outboxRepo;
    private readonly IAuditLogRepository _auditRepo;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;

    public SigningController(
        IClaimRepository claimRepo,
        IDocumentRepository docRepo,
        ISigningRequestRepository signingRequestRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditLogRepository auditRepo,
        ITokenService tokenService,
        IConfiguration config)
    {
        _claimRepo = claimRepo;
        _docRepo = docRepo;
        _signingRequestRepo = signingRequestRepo;
        _outboxRepo = outboxRepo;
        _auditRepo = auditRepo;
        _tokenService = tokenService;
        _config = config;
    }

    /// <summary>
    /// Firm POSTs a document to initiate the signing flow for a claimant.
    /// </summary>
    /// <remarks>
    /// <para>Accepted document formats:</para>
    /// <list type="bullet">
    /// <item><description><c>application/pdf</c> — PDF documents</description></item>
    /// <item><description><c>application/vnd.openxmlformats-officedocument.wordprocessingml.document</c> — DOCX documents</description></item>
    /// </list>
    /// <para><b>DocumentBase64</b> must be the base64-encoded bytes of the file.</para>
    /// </remarks>
    [HttpPost("initiate")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(typeof(InitiateSigningResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Initiate(
        [FromBody] InitiateSigningRequest request,
        CancellationToken ct)
    {
        // Server always generates a fresh ClaimId — callers do not supply one
        var claimId = Guid.NewGuid();

        if (string.IsNullOrWhiteSpace(request.DocumentBase64))
            return BadRequest("Document content is required.");

        byte[] docBytes;
        try
        {
            docBytes = Convert.FromBase64String(request.DocumentBase64);
        }
        catch
        {
            return BadRequest("DocumentBase64 is not valid base64.");
        }

        // Normalise shorthand aliases → full MIME type
        var contentType = request.DocumentContentType?.Trim().ToLowerInvariant() switch
        {
            "pdf"  => "application/pdf",
            "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc"  => "application/msword",
            var v  => v ?? string.Empty
        };

        var allowedTypes = new[]
        {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
        };
        if (!allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(
                "Unsupported document content type. Accepted: pdf, docx, doc, application/pdf, " +
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword");

        // Always create a new claim since a fresh ClaimId is generated per request
        var claim = await _claimRepo.GetByIdAsync(claimId, ct);
        if (claim is null)
        {
            claim = new Claim
            {
                Id = claimId,
                ClaimantName = request.ClaimantName,
                ClaimantEmail = request.ClaimantEmail,
                Status = ClaimStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            await _claimRepo.AddAsync(claim, ct);
            await _claimRepo.SaveChangesAsync(ct);
        }

        // Hash the document for integrity check
        var hash = Convert.ToHexString(SHA256.HashData(docBytes)).ToLowerInvariant();

        var document = new Core.Entities.Document
        {
            Id = Guid.NewGuid(),
            ClaimId = claimId,
            ContentBytes = docBytes,
            ContentType = contentType,
            Hash = hash,
            CreatedAt = DateTime.UtcNow
        };
        await _docRepo.AddAsync(document, ct);
        await _docRepo.SaveChangesAsync(ct);

        // Generate HMAC-signed token
        var token = _tokenService.GenerateToken(claimId, document.Id, out _);
        var expiry = DateTime.UtcNow.AddDays(7);

        var signingRequest = new SigningRequest
        {
            Id = Guid.NewGuid(),
            Token = token,
            ClaimId = claimId,
            DocumentId = document.Id,
            Status = SigningStatus.Pending,
            ExpiresAt = expiry,
            CreatedAt = DateTime.UtcNow
        };
        await _signingRequestRepo.AddAsync(signingRequest, ct);
        await _signingRequestRepo.SaveChangesAsync(ct);

        // Build signing portal URL
        var baseUrl = _config["App:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        var signingLink = $"{baseUrl}/sign/{token}";

        // Enqueue invitation email
        var emailPayload = JsonSerializer.Serialize(new SendEmailPayload(
            request.ClaimantEmail,
            request.ClaimantName,
            signingLink,
            expiry,
            "Invitation"));

        await _outboxRepo.AddAsync(new OutboxQueue
        {
            Id = Guid.NewGuid(),
            JobType = JobTypes.SendEmail,
            Payload = emailPayload,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _outboxRepo.SaveChangesAsync(ct);

        // Audit
        await _auditRepo.AppendAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            SigningRequestId = signingRequest.Id,
            ClaimId = claimId,
            Action = "SigningInitiated",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = Request.Headers.UserAgent.ToString(),
            Timestamp = DateTime.UtcNow
        }, ct);
        await _auditRepo.SaveChangesAsync(ct);

        return CreatedAtAction(
            nameof(GetStatus),
            new { signingRequestId = signingRequest.Id },
            new InitiateSigningResponse(claimId, signingRequest.Id, expiry));
    }

    /// <summary>Returns the current status of a signing request.</summary>
    [HttpGet("status/{signingRequestId:guid}")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(typeof(SigningStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(Guid signingRequestId, CancellationToken ct)
    {
        var sr = await _signingRequestRepo.GetByIdAsync(signingRequestId, ct);
        if (sr is null) return NotFound();

        return Ok(new SigningStatusResponse(sr.Id, sr.Status.ToString(), sr.SignedAt));
    }
}
