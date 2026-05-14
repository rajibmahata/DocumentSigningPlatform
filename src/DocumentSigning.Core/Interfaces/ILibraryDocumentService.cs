using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface ILibraryDocumentService
{
    // ── CRUD ──────────────────────────────────────────────────────────────────
    Task<List<LibraryDocumentSummaryDto>> GetAllAsync(Guid merchantId, string? purpose = null, string? category = null, string? search = null, bool? isSample = null, CancellationToken ct = default);
    Task<LibraryDocumentDto?>             GetByIdAsync(Guid id, Guid merchantId, CancellationToken ct = default);
    Task<LibraryDocumentDto>              CreateAsync(Guid merchantId, Guid userId, CreateLibraryDocumentRequest req, CancellationToken ct = default);
    Task<LibraryDocumentDto>              UpdateAsync(Guid id, Guid merchantId, UpdateLibraryDocumentRequest req, CancellationToken ct = default);
    Task                                  DeleteAsync(Guid id, Guid merchantId, CancellationToken ct = default);
    Task<LibraryDocumentDto>              DuplicateAsync(Guid id, Guid merchantId, Guid userId, CancellationToken ct = default);

    // ── Template & Workflow linking ───────────────────────────────────────────
    Task<List<LibraryDocumentSummaryDto>> GetByTemplateAsync(Guid templateId, Guid merchantId, CancellationToken ct = default);
    Task                                  LinkToTemplateAsync(Guid templateId, Guid merchantId, List<Guid> documentIds, CancellationToken ct = default);
    Task                                  UnlinkFromTemplateAsync(Guid templateId, Guid documentId, Guid merchantId, CancellationToken ct = default);

    Task<List<LibraryDocumentSummaryDto>> GetByWorkflowAsync(Guid workflowId, Guid merchantId, CancellationToken ct = default);
    Task                                  LinkToWorkflowAsync(Guid workflowId, Guid merchantId, List<Guid> documentIds, CancellationToken ct = default);
    Task                                  UnlinkFromWorkflowAsync(Guid workflowId, Guid documentId, Guid merchantId, CancellationToken ct = default);

    // ── Lifecycle ────────────────────────────────────────────────────────────
    Task TouchLastUsedAsync(Guid id, CancellationToken ct = default);

    // ── Samples ──────────────────────────────────────────────────────────────
    Task<List<LibraryDocumentSummaryDto>> GetSamplesAsync(CancellationToken ct = default);
}
