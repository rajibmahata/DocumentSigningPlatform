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

    // ── Subscription ─────────────────────────────────────────────────────────
    /// <summary>Active plan name: free | starter | pro | enterprise</summary>
    public string PlanName        { get; set; } = "free";
    // 0 = unlimited
    public int      RequestLimit      { get; set; } = 25;
    public int      RequestUsed       { get; set; } = 0;
    public DateTime SubscriptionStart { get; set; } = DateTime.UtcNow;
    public DateTime? SubscriptionEnd  { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ── Reminder settings ────────────────────────────────────────────────────
    /// <summary>Whether the reminder email job should send reminders for this merchant's envelopes.</summary>
    public bool ReminderEnabled      { get; set; } = true;
    /// <summary>How many hours before expiry to send the reminder email (default 24).</summary>
    public int  ReminderWindowHours  { get; set; } = 24;
}
