using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Per-merchant feature flag management (enable/disable paid/beta features).
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/merchants/{merchantId:guid}/features")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class FeatureFlagsController : ControllerBase
{
    private readonly IFeatureFlagService _flags;

    public FeatureFlagsController(IFeatureFlagService flags) => _flags = flags;

    /// <summary>Returns all feature flags for the merchant.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<FeatureFlagDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(Guid merchantId, CancellationToken ct)
    {
        var flags = await _flags.GetAllAsync(merchantId, ct);
        return Ok(flags);
    }

    /// <summary>Enables or disables a specific feature for the merchant.</summary>
    [HttpPut("{featureKey}")]
    [ProducesResponseType(typeof(FeatureFlagDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Set(
        Guid merchantId,
        string featureKey,
        [FromBody] SetFeatureFlagRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(featureKey)) return BadRequest("featureKey is required.");

        await _flags.SetAsync(merchantId, featureKey, request.IsEnabled, ct);
        var updated = new FeatureFlagDto(featureKey, request.IsEnabled, DateTime.UtcNow);
        return Ok(updated);
    }
}
