using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Bulk send a signing envelope to many recipients from a CSV.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/envelopes/bulk")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class BulkSendController : ControllerBase
{
    private readonly IBulkSendService _bulkSend;

    public BulkSendController(IBulkSendService bulkSend) => _bulkSend = bulkSend;

    /// <summary>
    /// Upload a CSV and a template document to create a signing envelope for every recipient.
    /// </summary>
    /// <remarks>
    /// <b>CSV format:</b> comma-separated with a header row.
    /// Required columns: <c>Name</c>, <c>Email</c>.
    /// Optional: <c>Company</c>, plus any merge-tag columns (e.g. <c>Position</c>).
    /// Merge tags in the template document and title are replaced with <c>{{ColumnName}}</c> placeholders.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(BulkSendBatchResult), StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> StartBatch(
        [FromBody] BulkSendRequest request,
        CancellationToken ct)
    {
        if (request is null) return BadRequest("Request body is required.");
        if (string.IsNullOrWhiteSpace(request.CsvContent))
            return BadRequest("CsvContent is required.");
        if (string.IsNullOrWhiteSpace(request.TemplateDocumentBase64))
            return BadRequest("TemplateDocumentBase64 is required.");
        if (string.IsNullOrWhiteSpace(request.EnvelopeTitleTemplate))
            return BadRequest("EnvelopeTitleTemplate is required.");

        var result = await _bulkSend.EnqueueBatchAsync(request.MerchantId, request, ct);
        return Accepted(result);
    }

    /// <summary>Returns the processing status of a bulk send batch.</summary>
    [HttpGet("{batchId:guid}")]
    [ProducesResponseType(typeof(BulkSendBatchStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatus(Guid batchId, CancellationToken ct)
    {
        var status = await _bulkSend.GetBatchStatusAsync(batchId, ct);
        if (status.Total == 0) return NotFound();
        return Ok(status);
    }
}
