using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>Execution record for a single node within a workflow run.</summary>
public class WorkflowNodeExecution
{
    public Guid   Id                 { get; set; } = Guid.NewGuid();
    public Guid   WorkflowInstanceId { get; set; }

    /// <summary>React-Flow node ID from the definition JSON.</summary>
    public string NodeId             { get; set; } = string.Empty;
    public string NodeType           { get; set; } = string.Empty;
    public string NodeLabel          { get; set; } = string.Empty;

    public NodeExecutionStatus Status { get; set; } = NodeExecutionStatus.Pending;

    /// <summary>JSON result produced by this node.</summary>
    public string? OutputJson        { get; set; }
    public string? ErrorMessage      { get; set; }

    public DateTime  StartedAt       { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt     { get; set; }

    // Navigation
    public WorkflowInstance? Instance { get; set; }
}
