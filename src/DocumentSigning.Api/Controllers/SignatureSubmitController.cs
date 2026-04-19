using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class SignatureSubmitController : ControllerBase
{
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly IOutboxQueueRepository _outboxRepo;
    private readonly IAuditService _audit;
    private readonly ITokenService _tokenService;
    private readonly IDocumentRepository _documentRepo;
    private readonly IClaimRepository _claimRepo;

    public SignatureSubmitController(
        ISigningRequestRepository signingRequestRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditService audit,
        ITokenService tokenService,
        IDocumentRepository documentRepo,
        IClaimRepository claimRepo)
    {
        _signingRequestRepo = signingRequestRepo;
        _outboxRepo = outboxRepo;
        _audit = audit;
        _tokenService = tokenService;
        _documentRepo = documentRepo;
        _claimRepo = claimRepo;
    }

    /// <summary>
    /// Claimant submits their drawn/typed signature for stamping.
    /// Enqueues a StampDoc background job.
    /// </summary>
    [HttpPost("submit/{token}")]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<IActionResult> Submit(
        string token,
        [FromBody] SubmitSignatureRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SignatureBase64))
            return BadRequest("SignatureBase64 is required.");

        var signingRequest = await _signingRequestRepo.GetByTokenAsync(token, ct);
        if (signingRequest is null) return NotFound("Token not found.");

        if (signingRequest.ExpiresAt < DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, "Token has expired.");

        if (signingRequest.Status != SigningStatus.Pending)
            return BadRequest("This signing request is no longer pending.");

        if (!_tokenService.ValidateTokenSignature(token, signingRequest.ClaimId, signingRequest.DocumentId))
            return BadRequest("Invalid token signature.");

        // Validate base64 signature image
        try { _ = Convert.FromBase64String(request.SignatureBase64); }
        catch { return BadRequest("SignatureBase64 is not valid base64."); }

        // Atomically lock the signing request for processing
        var locked = await _signingRequestRepo.TryLockForProcessingAsync(token, ct);
        if (!locked) return Conflict("Signing request is already being processed.");

        // Enqueue StampDoc job
        var stampPayload = JsonSerializer.Serialize(new StampPdfPayload(
            signingRequest.DocumentId,
            signingRequest.Id,
            signingRequest.ClaimId,
            request.SignatureBase64));

        await _outboxRepo.AddAsync(new OutboxQueue
        {
            Id = Guid.NewGuid(),
            JobType = JobTypes.StampDoc,
            Payload = stampPayload,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _outboxRepo.SaveChangesAsync(ct);

        // --- Enrich audit with MerchantId and claimant details ---
        var document = await _documentRepo.GetWithEnvelopeAsync(signingRequest.DocumentId, ct);
        var claim    = await _claimRepo.GetByIdAsync(signingRequest.ClaimId, ct);

        var merchantId   = document?.Envelope?.MerchantId;
        var merchantUserId = document?.Envelope?.Merchant?.UserId;

        var metadata = JsonSerializer.Serialize(new
        {
            claimantName   = claim?.ClaimantName  ?? "Unknown",
            claimantEmail  = claim?.ClaimantEmail ?? "Unknown",
            merchantId     = merchantId?.ToString() ?? "—",
            merchantOwnerUserId = merchantUserId?.ToString() ?? "—",
            signingRequestId    = signingRequest.Id,
        });

        var description = claim is not null
            ? $"Signature submitted by {claim.ClaimantName} ({claim.ClaimantEmail})"
            : "Signature submitted for stamping";

        // Audit: signature submitted
        _audit.Log(new AuditEntry(
            Action:      AuditActions.SignatureSubmitted,
            EntityType:  AuditEntities.Document,
            EntityId:    signingRequest.DocumentId,
            UserId:      merchantUserId,
            MerchantId:  merchantId,
            Description: description,
            Metadata:    metadata,
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString(),
            SigningRequestId: signingRequest.Id,
            ClaimId:     signingRequest.ClaimId));

        return Accepted(new { Message = "Signature received. Document will be stamped shortly." });
    }
}
