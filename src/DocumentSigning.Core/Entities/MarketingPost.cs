namespace DocumentSigning.Core.Entities;

/// <summary>A marketing post (draft, scheduled or published) on a social platform.</summary>
public class MarketingPost
{
    public Guid      Id               { get; set; } = Guid.NewGuid();
    public Guid      MerchantId       { get; set; }
    public Merchant? Merchant          { get; set; }

    /// <summary>linkedin | facebook</summary>
    public string    Platform         { get; set; } = string.Empty;

    public string    Content          { get; set; } = string.Empty;
    public string?   ImageUrl         { get; set; }

    /// <summary>draft | scheduled | published | failed</summary>
    public string    Status           { get; set; } = "draft";

    public DateTime? ScheduledAt      { get; set; }
    public DateTime? PublishedAt      { get; set; }

    /// <summary>0-100 AI engagement prediction score.</summary>
    public int       EngagementScore  { get; set; }

    /// <summary>auto | admin:{userId}</summary>
    public string    CreatedBy        { get; set; } = "auto";

    /// <summary>product_feature | workflow_automation | ai_signing | esign_security |
    /// legal_compliance | saas_productivity | digital_transformation |
    /// customer_success | feature_launch | educational_tips</summary>
    public string    ContentCategory  { get; set; } = "product_feature";

    public string?   Hashtags         { get; set; }
    public string?   CampaignId       { get; set; }
    public DateTime  CreatedAt        { get; set; } = DateTime.UtcNow;
}
