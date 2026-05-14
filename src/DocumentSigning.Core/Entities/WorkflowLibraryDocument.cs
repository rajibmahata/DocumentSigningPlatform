namespace DocumentSigning.Core.Entities;

/// <summary>
/// Junction table: WorkflowDefinition ↔ LibraryDocument
/// Workflows can have pre-attached documents that auto-populate when using the template.
/// </summary>
public class WorkflowLibraryDocument
{
    public Guid WorkflowDefinitionId { get; set; }
    public Guid LibraryDocumentId    { get; set; }

    // Navigation
    public WorkflowDefinition? Workflow { get; set; }
    public LibraryDocument?    Document { get; set; }
}
