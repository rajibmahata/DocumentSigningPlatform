namespace DocumentSigning.Core.Entities;

/// <summary>Immutable audit trail of every agent execution run.</summary>
public class AgentExecutionHistory
{
    public Guid            Id                  { get; set; } = Guid.NewGuid();
    public Guid            AgentId             { get; set; }
    public AgentDefinition? Agent               { get; set; }
    public Guid            MerchantId          { get; set; }
    public Merchant?        Merchant            { get; set; }

    /// <summary>running | completed | failed | pending_approval | retrying | cancelled</summary>
    public string          ExecutionStatus     { get; set; } = "running";

    public DateTime        StartedAt           { get; set; } = DateTime.UtcNow;
    public DateTime?       CompletedAt         { get; set; }

    /// <summary>Serialized input context passed to the agent.</summary>
    public string?         InputJson           { get; set; }

    /// <summary>Serialized output produced by the agent.</summary>
    public string?         OutputJson          { get; set; }

    /// <summary>Validation result from ValidationAgent pipeline.</summary>
    public string?         ValidationResultJson { get; set; }

    public string?         ErrorDetails        { get; set; }

    public int             RetryCount          { get; set; } = 0;

    /// <summary>Step-level progress log: JSON array of { stepName, status, timestamp, notes }</summary>
    public string?         StepLogJson         { get; set; }

    /// <summary>Trigger: scheduled | manual | event</summary>
    public string          TriggerType         { get; set; } = "scheduled";
}
