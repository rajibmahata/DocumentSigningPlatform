namespace DocumentSigning.Core.Entities;

/// <summary>
/// A reusable envelope template belonging to a merchant.
/// Stores a default title, message, and a JSON-serialised list of signer definitions
/// so merchants can quickly start new envelopes from a saved configuration.
/// </summary>
public class DocumentTemplate
{
    public Guid   Id          { get; set; } = Guid.NewGuid();
    public Guid   MerchantId  { get; set; }

    public string Name        { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Default envelope title that is pre-filled when loading this template.</summary>
    public string DefaultTitle { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of signer definitions: [{ name, email, role, order, message }]
    /// Stored as a plain string column; deserialized by the service layer.
    /// </summary>
    public string SignersJson  { get; set; } = "[]";

    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; set; } = DateTime.UtcNow;

    // Navigation
    public Merchant? Merchant  { get; set; }
    public ICollection<TemplateLibraryDocument> TemplateDocuments { get; set; } = [];
}
