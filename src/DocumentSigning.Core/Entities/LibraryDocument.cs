using System.ComponentModel.DataAnnotations;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// A user-owned document stored in the Document Library.
/// Distinct from the signing Document entity (which is envelope-scoped binary storage).
/// LibraryDocument stores metadata + file path only; binary is on disk/blob.
/// </summary>
public class LibraryDocument
{
    public Guid   Id         { get; set; } = Guid.NewGuid();
    public Guid?  MerchantId { get; set; }
    public Guid?  UserId     { get; set; }

    [MaxLength(512)]
    public string Name        { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>Contract | NDA | OfferLetter | Invoice | VendorAgreement | RentalAgreement | HRForm | Legal | InternalApproval | Other</summary>
    [MaxLength(100)]
    public string Purpose     { get; set; } = "Other";

    [MaxLength(100)]
    public string? Category   { get; set; }

    /// <summary>docx | pdf | txt | html</summary>
    [MaxLength(10)]
    public string FileType    { get; set; } = "docx";

    /// <summary>Relative path under wwwroot/documents/{merchantId}/  or absolute blob URL.</summary>
    [MaxLength(2000)]
    public string? FilePath   { get; set; }

    /// <summary>Rich-text / HTML content for in-browser editor (TipTap/Quill). Stored when created in-app.</summary>
    public string? EditorContentHtml { get; set; }

    public int    Version     { get; set; } = 1;

    /// <summary>True for system-provided sample documents that cannot be directly edited.</summary>
    public bool   IsSample    { get; set; } = false;

    /// <summary>Can be used as a document template in envelopes.</summary>
    public bool   IsTemplateReady  { get; set; } = true;

    /// <summary>Can be attached to workflow steps.</summary>
    public bool   IsWorkflowReady  { get; set; } = true;

    public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt   { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }

    // Navigation
    public Merchant? Merchant  { get; set; }
    public User?     User      { get; set; }

    public ICollection<TemplateLibraryDocument>     TemplateDocuments     { get; set; } = [];
    public ICollection<WorkflowLibraryDocument>     WorkflowDocuments     { get; set; } = [];
}
