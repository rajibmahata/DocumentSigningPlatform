using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// White-label branding settings for a merchant.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/merchants/{merchantId:guid}/branding")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class BrandingController : ControllerBase
{
    private readonly IBrandingService _branding;

    public BrandingController(IBrandingService branding) => _branding = branding;

    /// <summary>Returns branding settings for the merchant.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(MerchantBrandingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid merchantId, CancellationToken ct)
    {
        var result = await _branding.GetAsync(merchantId, ct);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Creates or updates branding settings for the merchant.</summary>
    [HttpPut]
    [ProducesResponseType(typeof(MerchantBrandingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Upsert(
        Guid merchantId,
        [FromBody] UpsertBrandingRequest request,
        CancellationToken ct)
    {
        if (request is null) return BadRequest("Request body is required.");

        var result = await _branding.UpsertAsync(merchantId, request, ct);
        return Ok(result);
    }
}
