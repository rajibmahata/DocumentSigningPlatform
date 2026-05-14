using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// Immutable, versioned workflow definition.
/// JsonDefinition stores the React-Flow graph: nodes[], edges[], variables[], settings{}.
/// A new Version row is created on every Publish action.
/// </summary>
public class WorkflowDefinition
{
    public Guid   Id             { get; set; } = Guid.NewGuid();
    public Guid   MerchantId     { get; set; }

    public string Name           { get; set; } = string.Empty;
    public string? Description   { get; set; }
    public int    Version        { get; set; } = 1;

    /// <summary>Full React-Flow graph JSON.</summary>
    public string JsonDefinition { get; set; } = """{"nodes":[],"edges":[],"variables":[],"settings":{}}""";

    public WorkflowStatus Status  { get; set; } = WorkflowStatus.Draft;
    public bool   IsTemplate      { get; set; } = false;
    public string? TemplateName   { get; set; }          // human-readable template label
    public string? Category       { get; set; }          // e.g. "HR", "Legal", "Procurement"

    public string? CreatedBy     { get; set; }           // user email
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt    { get; set; } = DateTime.UtcNow;

    // Navigation
    public Merchant?  Merchant   { get; set; }
    public ICollection<WorkflowInstance> Instances { get; set; } = [];
    public ICollection<WorkflowTrigger>  Triggers  { get; set; } = [];
    public ICollection<WorkflowLibraryDocument> WorkflowDocuments { get; set; } = [];
}
