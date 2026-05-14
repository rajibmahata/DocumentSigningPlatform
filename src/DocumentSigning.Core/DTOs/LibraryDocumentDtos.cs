namespace DocumentSigning.Core.DTOs;

// ── Library Document DTOs ─────────────────────────────────────────────────────

public record LibraryDocumentDto(
    Guid      Id,
    Guid?     MerchantId,
    Guid?     UserId,
    string    Name,
    string?   Description,
    string    Purpose,
    string?   Category,
    string    FileType,
    string?   FilePath,
    string?   EditorContentHtml,
    int       Version,
    bool      IsSample,
    bool      IsTemplateReady,
    bool      IsWorkflowReady,
    DateTime  CreatedAt,
    DateTime  UpdatedAt,
    DateTime? LastUsedAt);

public record LibraryDocumentSummaryDto(
    Guid      Id,
    string    Name,
    string?   Description,
    string    Purpose,
    string?   Category,
    string    FileType,
    bool      IsSample,
    bool      IsTemplateReady,
    bool      IsWorkflowReady,
    DateTime  UpdatedAt,
    DateTime? LastUsedAt);

public record CreateLibraryDocumentRequest(
    string  Name,
    string? Description,
    string  Purpose,
    string? Category,
    string  FileType,
    string? FilePath,
    string? EditorContentHtml,
    bool    IsTemplateReady = true,
    bool    IsWorkflowReady = true);

public record UpdateLibraryDocumentRequest(
    string  Name,
    string? Description,
    string  Purpose,
    string? Category,
    string? EditorContentHtml,
    bool    IsTemplateReady = true,
    bool    IsWorkflowReady = true);

// ── Link DTOs ────────────────────────────────────────────────────────────────

public record LinkDocumentsToTemplateRequest(List<Guid> DocumentIds);
public record LinkDocumentsToWorkflowRequest(List<Guid> DocumentIds);
