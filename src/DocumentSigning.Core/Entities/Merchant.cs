namespace DocumentSigning.Core.Entities;

public class Merchant
{
    public Guid   Id                { get; set; }
    public string Name              { get; set; } = string.Empty;
    public string Email             { get; set; } = string.Empty;
    public string ApiKey            { get; set; } = string.Empty;
    public bool   IsActive          { get; set; } = true;

    // Subscription: 0 = unlimited
    public int      RequestLimit      { get; set; } = 0;
    public int      RequestUsed       { get; set; } = 0;
    public DateTime SubscriptionStart { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionEnd  { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
