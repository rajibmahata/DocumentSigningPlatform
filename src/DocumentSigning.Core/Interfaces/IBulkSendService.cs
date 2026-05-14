using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IBulkSendService
{
    /// <summary>
    /// Validates and enqueues a CSV bulk-send batch.
    /// Returns a batch ID and per-row validation results.
    /// </summary>
    Task<BulkSendBatchResult> EnqueueBatchAsync(
        Guid merchantId,
        BulkSendRequest request,
        CancellationToken ct = default);

    /// <summary>Returns status summary for a batch.</summary>
    Task<BulkSendBatchStatus> GetBatchStatusAsync(Guid batchId, CancellationToken ct = default);

    /// <summary>
    /// Processes a single BulkSendJob row (called from background worker).
    /// Creates and dispatches a single envelope.
    /// </summary>
    Task ProcessJobAsync(Guid jobId, CancellationToken ct = default);
}
