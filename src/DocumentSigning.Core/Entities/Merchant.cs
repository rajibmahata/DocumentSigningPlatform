namespace DocumentSigning.Core.Entities;

public class Merchant
{
    public Guid   Id          { get; set; }
    public Guid   UserId      { get; set; }   // FK → User (owner)
    public User?  User        { get; set; }   // navigation
    public string Name        { get; set; } = string.Empty;
    public string? Description { get; set; }  // purpose of this merchant account
    public string ApiKey      { get; set; } = string.Empty;
    public bool   IsActive    { get; set; } = true;

    // Subscription: 0 = unlimited
    public int      RequestLimit      { get; set; } = 100;
    public int      RequestUsed       { get; set; } = 0;
    public DateTime SubscriptionStart { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionEnd  { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
