using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>A single execution run of a WorkflowDefinition.</summary>
public class WorkflowInstance
{
    public Guid   Id                    { get; set; } = Guid.NewGuid();
    public Guid   WorkflowDefinitionId  { get; set; }

    public WorkflowInstanceStatus Status { get; set; } = WorkflowInstanceStatus.Running;

    /// <summary>Node ID currently being executed.</summary>
    public string? CurrentNodeId        { get; set; }

    /// <summary>JSON bag of runtime variable values.</summary>
    public string? ContextJson          { get; set; }

    /// <summary>Optional reference to a related envelope.</summary>
    public Guid?  EnvelopeId            { get; set; }

    /// <summary>User or system that triggered this run.</summary>
    public string? TriggeredBy          { get; set; }

    public string? ErrorMessage         { get; set; }

    public DateTime StartedAt           { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt        { get; set; }

    // Navigation
    public WorkflowDefinition? Definition { get; set; }
    public ICollection<WorkflowNodeExecution> NodeExecutions { get; set; } = [];
}
