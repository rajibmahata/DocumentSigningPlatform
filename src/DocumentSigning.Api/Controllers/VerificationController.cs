using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Signer identity verification (government-issued ID check).
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/verification")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class VerificationController : ControllerBase
{
    private readonly IIdentityVerificationService _verification;

    public VerificationController(IIdentityVerificationService verification)
        => _verification = verification;

    /// <summary>
    /// Starts an identity verification session for a signer.
    /// The merchant submits the signer's ID document image (base64).
    /// </summary>
    [HttpPost("start")]
    [ProducesResponseType(typeof(StartVerificationResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Start(
        [FromBody] StartVerificationRequest request,
        CancellationToken ct)
    {
        if (request is null) return BadRequest("Request body is required.");
        if (string.IsNullOrWhiteSpace(request.DocumentType)) return BadRequest("DocumentType is required.");
        if (string.IsNullOrWhiteSpace(request.IdImageBase64))  return BadRequest("IdImageBase64 is required.");

        var merchant = HttpContext.Items["Merchant"] as Core.Entities.Merchant;
        if (merchant is null) return Unauthorized();

        // Get signer email from signing request
        var sr = HttpContext.RequestServices
            .GetRequiredService<ISigningRequestRepository>();
        var signingRequest = await sr.GetByIdAsync(request.SigningRequestId, ct);
        if (signingRequest is null) return NotFound("SigningRequest not found.");

        var signer = HttpContext.RequestServices
            .GetRequiredService<IClaimRepository>();
        var signerEntity = await signer.GetByIdAsync(signingRequest.ClaimId, ct);
        var signerEmail  = signerEntity?.ClaimantEmail ?? string.Empty;

        var result = await _verification.StartAsync(
            request.SigningRequestId,
            merchant.Id,
            signerEmail,
            request.DocumentType,
            request.IdImageBase64,
            ct);

        return CreatedAtAction(nameof(GetStatus), new { signingRequestId = request.SigningRequestId }, result);
    }

    /// <summary>Returns the current identity verification status for a signing request.</summary>
    [HttpGet("{signingRequestId:guid}")]
    [ProducesResponseType(typeof(IdentityVerificationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(Guid signingRequestId, CancellationToken ct)
    {
        var dto = await _verification.GetAsync(signingRequestId, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>Admin: approve or reject a pending verification.</summary>
    [HttpPost("{verificationId:guid}/review")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Review(
        Guid verificationId,
        [FromBody] ReviewVerificationRequest request,
        CancellationToken ct)
    {
        await _verification.ReviewAsync(verificationId, request.Approved, request.RejectionReason, ct);
        return NoContent();
    }
}
