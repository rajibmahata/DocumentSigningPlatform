namespace DocumentSigning.Core.Entities;

/// <summary>
/// Junction table: DocumentTemplate ↔ LibraryDocument
/// One template may reference many library documents.
/// </summary>
public class TemplateLibraryDocument
{
    public Guid DocumentTemplateId { get; set; }
    public Guid LibraryDocumentId  { get; set; }

    // Navigation
    public DocumentTemplate? Template { get; set; }
    public LibraryDocument?  Document { get; set; }
}
