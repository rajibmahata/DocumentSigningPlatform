namespace DocumentSigning.Core.Entities;

public class Webhook
{
    public Guid   Id         { get; set; }
    public Guid   MerchantId { get; set; }
    public string Url        { get; set; } = string.Empty;
    /// <summary>HMAC-SHA256 signing secret — shown once at creation, stored hashed in future versions.</summary>
    public string Secret     { get; set; } = string.Empty;
    public bool   IsActive   { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigations
    public Merchant?                  Merchant      { get; set; }
    public List<WebhookSubscription>  Subscriptions { get; set; } = new();
}
