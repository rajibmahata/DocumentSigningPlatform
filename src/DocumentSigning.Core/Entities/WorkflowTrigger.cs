using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>Defines when a workflow is automatically triggered.</summary>
public class WorkflowTrigger
{
    public Guid   Id                   { get; set; } = Guid.NewGuid();
    public Guid   WorkflowDefinitionId { get; set; }

    public WorkflowTriggerType TriggerType { get; set; } = WorkflowTriggerType.Manual;

    /// <summary>JSON configuration specific to the trigger type (e.g. cron expression for Scheduled).</summary>
    public string? ConfigurationJson   { get; set; }

    public bool   IsActive             { get; set; } = true;
    public DateTime CreatedAt          { get; set; } = DateTime.UtcNow;

    // Navigation
    public WorkflowDefinition? Definition { get; set; }
}
