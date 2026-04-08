using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
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

    public PortalController(
        ISigningRequestRepository signingRequestRepo,
        IDocumentRepository docRepo,
        IClaimRepository claimRepo,
        IAuditLogRepository auditRepo,
        ITokenService tokenService)
    {
        _signingRequestRepo = signingRequestRepo;
        _docRepo = docRepo;
        _claimRepo = claimRepo;
        _auditRepo = auditRepo;
        _tokenService = tokenService;
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
            signingRequest.ExpiresAt));
    }
}
