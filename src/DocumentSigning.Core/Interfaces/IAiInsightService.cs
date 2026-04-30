using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IAiInsightService
{
    /// <summary>
    /// Enqueues an AI summary job for the given document.
    /// The job runs async via the OutboxWorker.
    /// </summary>
    Task EnqueueSummaryAsync(Guid documentId, Guid merchantId, CancellationToken ct = default);

    /// <summary>Returns the latest insight for a document, or null if not yet generated.</summary>
    Task<DocumentInsightDto?> GetInsightAsync(Guid documentId, CancellationToken ct = default);

    /// <summary>
    /// Generates the summary synchronously (called from the background job processor).
    /// Extracts text, calls LLM, stores result.
    /// </summary>
    Task ProcessInsightJobAsync(Guid documentId, CancellationToken ct = default);
}
