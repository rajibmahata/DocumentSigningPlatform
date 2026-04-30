using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Blockchain notarization for completed envelopes.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/envelopes/{envelopeId:guid}/blockchain")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class BlockchainController : ControllerBase
{
    private readonly IBlockchainService  _blockchain;
    private readonly IFeatureFlagService _features;

    public BlockchainController(IBlockchainService blockchain, IFeatureFlagService features)
    {
        _blockchain = blockchain;
        _features   = features;
    }

    /// <summary>Returns the blockchain notarization record for a completed envelope.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(BlockchainRecordDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRecord(Guid envelopeId, CancellationToken ct)
    {
        var record = await _blockchain.GetRecordAsync(envelopeId, ct);
        return record is null ? NotFound() : Ok(record);
    }

    /// <summary>
    /// Triggers blockchain notarization for a completed envelope.
    /// Requires the <c>blockchain</c> feature flag to be enabled.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
    public async Task<IActionResult> Notarize(
        Guid envelopeId,
        [FromQuery] Guid merchantId,
        CancellationToken ct)
    {
        if (!await _features.IsEnabledAsync(merchantId, FeatureKeys.Blockchain, ct))
            return StatusCode(StatusCodes.Status402PaymentRequired, "Feature 'blockchain' is not enabled for this merchant.");

        await _blockchain.EnqueueNotarizationAsync(envelopeId, ct);
        return Accepted(new { message = "Blockchain notarization queued." });
    }
}
