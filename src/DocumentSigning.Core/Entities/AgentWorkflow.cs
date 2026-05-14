namespace DocumentSigning.Core.Entities;

/// <summary>
/// Defines the step-by-step workflow for a single agent.
/// Steps are stored as JSON: array of { stepName, stepType, prompt, order, isRequired }.
/// </summary>
public class AgentWorkflow
{
    public Guid            Id           { get; set; } = Guid.NewGuid();
    public Guid            AgentId      { get; set; }
    public AgentDefinition? Agent        { get; set; }

    public string          WorkflowName { get; set; } = "default";

    /// <summary>
    /// JSON array of WorkflowStep: { order, stepName, stepType, promptTemplate, isRequired }
    /// stepType: llm_call | validation | approval_gate | delay | webhook | email_send | social_post
    /// </summary>
    public string          StepsJson    { get; set; } = "[]";

    public bool            IsEnabled    { get; set; } = true;
    public DateTime        CreatedAt    { get; set; } = DateTime.UtcNow;
}
