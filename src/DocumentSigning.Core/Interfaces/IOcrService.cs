using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IOcrService
{
    /// <summary>
    /// Enqueues OCR field-detection for a document.
    /// Results are stored in DocumentFields table.
    /// </summary>
    Task EnqueueFieldDetectionAsync(Guid documentId, CancellationToken ct = default);

    /// <summary>Returns OCR-detected fields for a document.</summary>
    Task<IReadOnlyList<DocumentFieldDto>> GetFieldsAsync(Guid documentId, CancellationToken ct = default);

    /// <summary>
    /// Runs OCR detection synchronously (called from background job processor).
    /// </summary>
    Task ProcessFieldDetectionAsync(Guid documentId, CancellationToken ct = default);
}
