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
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly IWebhookService _webhookService;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepo;

    public SignatureSubmitController(
        ISigningRequestRepository signingRequestRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditService audit,
        ITokenService tokenService,
        IDocumentRepository documentRepo,
        IClaimRepository claimRepo,
        ISigningEnvelopeRepository envelopeRepo,
        IWebhookService webhookService,
        IEmailService emailService,
        IUserRepository userRepo)
    {
        _signingRequestRepo = signingRequestRepo;
        _outboxRepo = outboxRepo;
        _audit = audit;
        _tokenService = tokenService;
        _documentRepo = documentRepo;
        _claimRepo = claimRepo;
        _envelopeRepo = envelopeRepo;
        _webhookService = webhookService;
        _emailService = emailService;
        _userRepo = userRepo;
    }

    /// <summary>
    /// Claimant submits their drawn/typed signature for stamping.
    /// Enqueues a <c>StampDoc</c> background job.
    /// </summary>
    /// <remarks>
    /// The <c>token</c> is the unique signing token embedded in the invitation link sent to the signer.
    ///
    /// **Request body**
    /// - `signatureBase64` (string, required) — base64-encoded PNG of the drawn or typed signature image.
    ///
    /// **Response codes**
    /// - `202 Accepted` — signature queued for stamping.
    /// - `400 Bad Request` — missing/invalid signature data or token already processed.
    /// - `404 Not Found` — token does not exist.
    /// - `409 Conflict` — concurrent submission detected; request already being processed.
    /// - `410 Gone` — token has expired.
    /// </remarks>
    /// <param name="token">The signer's unique invitation token (from the signing link).</param>
    /// <param name="request">Body containing the base64-encoded signature image.</param>
    /// <param name="ct">Cancellation token.</param>
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

    /// <summary>
    /// Signer rejects the document — marks the envelope as <c>Rejected</c>.
    /// </summary>
    /// <remarks>
    /// Only valid when the signing request is still <c>Pending</c>.
    /// Once rejected the envelope status is set to <c>Rejected</c> and no further signing can occur.
    ///
    /// **Request body**
    /// - `reason` (string, optional) — free-text explanation from the signer.
    ///
    /// **Response codes**
    /// - `204 No Content` — rejection recorded successfully.
    /// - `400 Bad Request` — signing request is not in Pending state, or token signature is invalid.
    /// - `404 Not Found` — token does not exist.
    /// - `410 Gone` — token has expired.
    /// </remarks>
    /// <param name="token">The signer's unique invitation token (from the signing link).</param>
    /// <param name="request">Optional body containing the rejection reason.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpPost("reject/{token}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status410Gone)]
    public async Task<IActionResult> Reject(
        string token,
        [FromBody] RejectSignatureRequest request,
        CancellationToken ct)
    {
        var signingRequest = await _signingRequestRepo.GetByTokenAsync(token, ct);
        if (signingRequest is null) return NotFound("Token not found.");

        if (signingRequest.ExpiresAt < DateTime.UtcNow)
            return StatusCode(StatusCodes.Status410Gone, "Token has expired.");

        if (signingRequest.Status != SigningStatus.Pending)
            return BadRequest("This signing request is no longer pending.");

        if (!_tokenService.ValidateTokenSignature(token, signingRequest.ClaimId, signingRequest.DocumentId))
            return BadRequest("Invalid token signature.");

        // Mark signing request as Failed (rejection is a terminal state for the request)
        signingRequest.Status = SigningStatus.Failed;
        await _signingRequestRepo.UpdateAsync(signingRequest, ct);
        await _signingRequestRepo.SaveChangesAsync(ct);

        // Load claim first so we have the email to find the matching Signer
        var claim = await _claimRepo.GetByIdAsync(signingRequest.ClaimId, ct);

        // Mark envelope as Rejected and update the individual Signer status
        var document = await _documentRepo.GetWithEnvelopeAsync(signingRequest.DocumentId, ct);
        if (document?.Envelope is not null)
        {
            document.Envelope.Status = EnvelopeStatus.Rejected;

            // Update the specific signer's status so the dashboard reflects Rejected
            if (claim is not null)
            {
                var signer = document.Envelope.Signers
                    .FirstOrDefault(s => s.Email.Equals(claim.ClaimantEmail, StringComparison.OrdinalIgnoreCase));
                if (signer is not null)
                {
                    signer.Status = SigningStatus.Rejected;
                    signer.RejectionReason = request.Reason;
                }
            }

            await _envelopeRepo.UpdateAsync(document.Envelope, ct);
            await _envelopeRepo.SaveChangesAsync(ct);
        }
        var merchantId       = document?.Envelope?.MerchantId;
        var merchantUserId   = document?.Envelope?.Merchant?.UserId;

        // ── Webhook: envelope.rejected ───────────────────────────────────────
        if (merchantId.HasValue)
        {
            await _webhookService.TriggerAsync(
                WebhookEvents.EnvelopeRejected,
                merchantId.Value,
                new
                {
                    envelopeId  = document?.Envelope?.Id,
                    status      = "Rejected",
                    signerEmail = claim?.ClaimantEmail,
                    reason      = request.Reason,
                },
                ct);
        }

        var metadata = System.Text.Json.JsonSerializer.Serialize(new
        {
            claimantName  = claim?.ClaimantName  ?? "Unknown",
            claimantEmail = claim?.ClaimantEmail ?? "Unknown",
            reason        = request.Reason ?? string.Empty,
            merchantId    = merchantId?.ToString() ?? "—"
        });

        _audit.Log(new AuditEntry(
            Action:      AuditActions.EnvelopeRejected,
            EntityType:  AuditEntities.Envelope,
            EntityId:    document?.Envelope?.Id ?? signingRequest.DocumentId,
            UserId:      merchantUserId,
            MerchantId:  merchantId,
            Description: $"Document rejected by {claim?.ClaimantName ?? "signer"}: {request.Reason ?? "no reason given"}",
            Metadata:    metadata,
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString(),
            SigningRequestId: signingRequest.Id,
            ClaimId:     signingRequest.ClaimId));

        // ── Notification emails ─────────────────────────────────────────────────
        var envelopeTitle = document?.Envelope?.Title ?? "document";
        var signerName    = claim?.ClaimantName  ?? "Signer";
        var signerEmail   = claim?.ClaimantEmail ?? string.Empty;

        // Email to signer — confirmation that rejection was recorded
        if (!string.IsNullOrEmpty(signerEmail))
        {
            _ = _emailService.SendEnvelopeRejectedToSignerAsync(
                    signerEmail, signerName, envelopeTitle, request.Reason, ct)
                .ContinueWith(t => _audit.Log(new AuditEntry(
                    Action: "EmailFailed", EntityType: AuditEntities.Envelope,
                    EntityId: document?.Envelope?.Id ?? signingRequest.DocumentId,
                    MerchantId: merchantId,
                    Description: $"Failed to send rejection confirmation to signer: {t.Exception?.Message}")),
                    System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
        }

        // Email to merchant — notify about the rejection
        if (merchantUserId.HasValue)
        {
            var merchantUser = await _userRepo.GetByIdAsync(merchantUserId.Value, ct);
            if (merchantUser is not null)
            {
                _ = _emailService.SendEnvelopeRejectedToMerchantAsync(
                        merchantUser.Email, merchantUser.Name,
                        signerName, signerEmail,
                        envelopeTitle, request.Reason, ct)
                    .ContinueWith(t => _audit.Log(new AuditEntry(
                        Action: "EmailFailed", EntityType: AuditEntities.Envelope,
                        EntityId: document?.Envelope?.Id ?? signingRequest.DocumentId,
                        MerchantId: merchantId,
                        Description: $"Failed to send rejection alert to merchant: {t.Exception?.Message}")),
                        System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
            }
        }

        return NoContent();
    }
}

