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
    private readonly IAuditLogRepository _auditRepo;
    private readonly ITokenService _tokenService;

    public SignatureSubmitController(
        ISigningRequestRepository signingRequestRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditLogRepository auditRepo,
        ITokenService tokenService)
    {
        _signingRequestRepo = signingRequestRepo;
        _outboxRepo = outboxRepo;
        _auditRepo = auditRepo;
        _tokenService = tokenService;
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

        // Audit: signature submitted
        await _auditRepo.AppendAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            SigningRequestId = signingRequest.Id,
            ClaimId = signingRequest.ClaimId,
            Action = "SignatureSubmitted",
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = Request.Headers.UserAgent.ToString(),
            Timestamp = DateTime.UtcNow
        }, ct);
        await _auditRepo.SaveChangesAsync(ct);

        return Accepted(new { Message = "Signature received. Document will be stamped shortly." });
    }
}
