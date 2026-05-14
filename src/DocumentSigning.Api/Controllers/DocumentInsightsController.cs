using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// AI-powered document insights: clause summaries, risk alerts, and OCR field detection.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/documents")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class DocumentInsightsController : ControllerBase
{
    private readonly IAiInsightService  _aiInsight;
    private readonly IOcrService        _ocr;
    private readonly IFeatureFlagService _features;

    public DocumentInsightsController(
        IAiInsightService aiInsight,
        IOcrService ocr,
        IFeatureFlagService features)
    {
        _aiInsight = aiInsight;
        _ocr       = ocr;
        _features  = features;
    }

    /// <summary>Returns the current AI insight for a document.</summary>
    [HttpGet("{documentId:guid}/summary")]
    [ProducesResponseType(typeof(DocumentInsightDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSummary(Guid documentId, CancellationToken ct)
    {
        var insight = await _aiInsight.GetInsightAsync(documentId, ct);
        return insight is null ? NotFound() : Ok(insight);
    }

    /// <summary>
    /// Triggers an AI analysis job for the document.
    /// The result is returned asynchronously — poll GET /summary for status.
    /// Requires the <c>ai.summary</c> feature flag to be enabled for the merchant.
    /// </summary>
    [HttpPost("{documentId:guid}/analyze")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Analyze(
        Guid documentId,
        [FromQuery] Guid merchantId,
        CancellationToken ct)
    {
        if (!await _features.IsEnabledAsync(merchantId, FeatureKeys.AiSummary, ct))
            return StatusCode(StatusCodes.Status402PaymentRequired, "Feature 'ai.summary' is not enabled for this merchant.");

        await _aiInsight.EnqueueSummaryAsync(documentId, merchantId, ct);
        return Accepted(new { message = "AI analysis queued. Poll GET /summary for status." });
    }

    /// <summary>Returns OCR-detected field positions for a document.</summary>
    [HttpGet("{documentId:guid}/fields")]
    [ProducesResponseType(typeof(IReadOnlyList<DocumentFieldDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFields(Guid documentId, CancellationToken ct)
    {
        var fields = await _ocr.GetFieldsAsync(documentId, ct);
        return Ok(fields);
    }

    /// <summary>
    /// Triggers an OCR field-detection job for the document.
    /// Requires the <c>ocr.auto_fields</c> feature flag.
    /// </summary>
    [HttpPost("{documentId:guid}/ocr")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
    public async Task<IActionResult> TriggerOcr(
        Guid documentId,
        [FromQuery] Guid merchantId,
        CancellationToken ct)
    {
        if (!await _features.IsEnabledAsync(merchantId, FeatureKeys.OcrAutoFields, ct))
            return StatusCode(StatusCodes.Status402PaymentRequired, "Feature 'ocr.auto_fields' is not enabled for this merchant.");

        await _ocr.EnqueueFieldDetectionAsync(documentId, ct);
        return Accepted(new { message = "OCR job queued. Poll GET /fields for results." });
    }
}
