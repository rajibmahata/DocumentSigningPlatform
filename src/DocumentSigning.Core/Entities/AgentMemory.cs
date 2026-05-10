namespace DocumentSigning.Core.Entities;

/// <summary>
/// Long-term contextual memory for agents.
/// Allows agents to learn and improve over time.
/// Scoped per merchant + agent + context type.
/// </summary>
public class AgentMemory
{
    public Guid            Id           { get; set; } = Guid.NewGuid();
    public Guid            MerchantId   { get; set; }
    public Merchant?        Merchant     { get; set; }
    public Guid            AgentId      { get; set; }
    public AgentDefinition? Agent        { get; set; }

    /// <summary>
    /// brand_voice | campaign_performance | customer_engagement |
    /// posting_schedule | content_preferences | top_performing_posts |
    /// audience_insights | platform_metrics
    /// </summary>
    public string          ContextType  { get; set; } = string.Empty;

    /// <summary>Unique key within context type, e.g. "linkedin_best_time"</summary>
    public string          ContextKey   { get; set; } = string.Empty;

    /// <summary>JSON or plain text value</summary>
    public string          ContextValue { get; set; } = string.Empty;

    public DateTime        CreatedAt    { get; set; } = DateTime.UtcNow;
    public DateTime        UpdatedAt    { get; set; } = DateTime.UtcNow;
}
