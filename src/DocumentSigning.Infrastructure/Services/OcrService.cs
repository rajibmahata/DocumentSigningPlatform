using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Detects field positions in documents via OCR.
/// Stub implementation returns placeholder fields.
/// Production: integrate Azure Form Recognizer or Tesseract.
/// </summary>
public sealed class OcrService : IOcrService
{
    private readonly IDocumentFieldRepository  _fieldRepo;
    private readonly IDocumentRepository       _documentRepo;
    private readonly IOutboxQueueRepository    _outbox;
    private readonly ILogger<OcrService>       _logger;

    public OcrService(
        IDocumentFieldRepository fieldRepo,
        IDocumentRepository documentRepo,
        IOutboxQueueRepository outbox,
        ILogger<OcrService> logger)
    {
        _fieldRepo    = fieldRepo;
        _documentRepo = documentRepo;
        _outbox       = outbox;
        _logger       = logger;
    }

    public async Task EnqueueFieldDetectionAsync(Guid documentId, CancellationToken ct = default)
    {
        // Clear any existing fields and re-queue
        await _fieldRepo.DeleteByDocumentIdAsync(documentId, ct);
        await _fieldRepo.SaveChangesAsync(ct);

        var payload = JsonSerializer.Serialize(new OcrFieldsPayload(documentId));
        await _outbox.AddAsync(new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.OcrFields,
            Payload   = payload,
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        }, ct);
        await _outbox.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<DocumentFieldDto>> GetFieldsAsync(Guid documentId, CancellationToken ct = default)
    {
        var fields = await _fieldRepo.GetByDocumentIdAsync(documentId, ct);
        return fields.Select(f => new DocumentFieldDto(
            f.Id, f.DocumentId, f.FieldType, f.PageNumber,
            f.X, f.Y, f.Width, f.Height, f.Confidence)).ToList();
    }

    public async Task ProcessFieldDetectionAsync(Guid documentId, CancellationToken ct = default)
    {
        var document = await _documentRepo.GetByIdAsync(documentId, ct);
        if (document is null)
        {
            _logger.LogWarning("OCR: document {DocumentId} not found.", documentId);
            return;
        }

        // ── Stub: auto-detect common field types at deterministic positions ──
        // Replace this with Azure Form Recognizer SDK call in production.
        var detectedAt = DateTime.UtcNow;
        var fields = new List<DocumentField>
        {
            MakeField(documentId, "Signature", 1, 0.60f, 0.80f, 0.30f, 0.05f, 0.90f, detectedAt),
            MakeField(documentId, "Date",      1, 0.60f, 0.88f, 0.15f, 0.04f, 0.85f, detectedAt),
            MakeField(documentId, "Name",      1, 0.10f, 0.10f, 0.35f, 0.04f, 0.80f, detectedAt),
        };

        await _fieldRepo.AddRangeAsync(fields, ct);
        await _fieldRepo.SaveChangesAsync(ct);

        _logger.LogInformation("OCR: detected {Count} fields for document {DocumentId}", fields.Count, documentId);
    }

    private static DocumentField MakeField(
        Guid docId, string type, int page,
        float x, float y, float w, float h, float conf,
        DateTime detectedAt) =>
        new()
        {
            Id         = Guid.NewGuid(),
            DocumentId = docId,
            FieldType  = type,
            PageNumber = page,
            X          = x,
            Y          = y,
            Width      = w,
            Height     = h,
            Confidence = conf,
            DetectedAt = detectedAt,
        };
}
