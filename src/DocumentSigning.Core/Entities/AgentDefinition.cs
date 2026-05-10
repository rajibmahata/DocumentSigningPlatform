namespace DocumentSigning.Core.Entities;

/// <summary>
/// Registry of all AI marketing agents for a merchant.
/// Each agent is independently configurable, schedulable, and observable.
/// </summary>
public class AgentDefinition
{
    public Guid     Id                  { get; set; } = Guid.NewGuid();
    public Guid     MerchantId          { get; set; }
    public Merchant? Merchant            { get; set; }

    /// <summary>Human-readable name: "Daily LinkedIn Agent"</summary>
    public string   AgentName           { get; set; } = string.Empty;

    /// <summary>
    /// email_marketing | social_media | campaign | blog |
    /// validation | analytics | email_outreach | email_followup |
    /// email_nurture | email_reactivation | linkedin | facebook |
    /// engagement_reply | campaign_planner | campaign_executor |
    /// seo_research | blog_writer | blog_validator | blog_publisher
    /// </summary>
    public string   AgentType           { get; set; } = string.Empty;

    /// <summary>Parent agent type (null = top-level orchestrator agent)</summary>
    public string?  ParentAgentType     { get; set; }

    public string?  Description         { get; set; }

    public bool     IsEnabled           { get; set; } = true;

    /// <summary>Cron expression: "0 8 * * *" = 08:00 UTC daily</summary>
    public string?  ScheduleExpression  { get; set; }

    /// <summary>IANA timezone: "America/New_York". Null = UTC.</summary>
    public string   Timezone            { get; set; } = "UTC";

    /// <summary>auto | approval | hybrid</summary>
    public string   ApprovalMode        { get; set; } = "approval";

    public int      MaxRetries          { get; set; } = 3;

    /// <summary>JSON config blob: brand tone, platforms, goals, etc.</summary>
    public string?  ConfigurationJson   { get; set; }

    public DateTime CreatedAt           { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt           { get; set; } = DateTime.UtcNow;

    public ICollection<AgentWorkflow>         Workflows         { get; set; } = [];
    public ICollection<AgentExecutionHistory> ExecutionHistory  { get; set; } = [];
    public ICollection<AgentMemory>           Memories          { get; set; } = [];
}
