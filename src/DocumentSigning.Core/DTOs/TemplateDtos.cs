namespace DocumentSigning.Core.DTOs;

// ── Document template DTOs ────────────────────────────────────────────────────

public record TemplateSigner(
    string Name,
    string Email,
    string Role,
    int    Order,
    string? Message);

public record CreateTemplateRequest(
    string Name,
    string? Description,
    string DefaultTitle,
    List<TemplateSigner>? Signers = null);

public record UpdateTemplateRequest(
    string Name,
    string? Description,
    string DefaultTitle,
    List<TemplateSigner> Signers);

public record TemplateResponse(
    Guid     Id,
    Guid     MerchantId,
    string   Name,
    string?  Description,
    string   DefaultTitle,
    List<TemplateSigner> Signers,
    DateTime CreatedAt,
    DateTime UpdatedAt);
