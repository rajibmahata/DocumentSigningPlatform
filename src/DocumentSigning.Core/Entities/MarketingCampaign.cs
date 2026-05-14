namespace DocumentSigning.Core.Entities;

/// <summary>A marketing campaign grouping posts across platforms.</summary>
public class MarketingCampaign
{
    public Guid      Id             { get; set; } = Guid.NewGuid();
    public Guid      MerchantId     { get; set; }
    public Merchant? Merchant        { get; set; }

    public string    Name           { get; set; } = string.Empty;
    public string?   Description    { get; set; }

    /// <summary>awareness | engagement | conversion | retention</summary>
    public string    CampaignType   { get; set; } = "awareness";

    /// <summary>draft | active | paused | completed</summary>
    public string    Status         { get; set; } = "draft";

    public DateTime? StartedAt      { get; set; }
    public DateTime? EndedAt        { get; set; }
    public DateTime  CreatedAt      { get; set; } = DateTime.UtcNow;
}
