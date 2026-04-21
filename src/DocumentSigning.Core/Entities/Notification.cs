namespace DocumentSigning.Core.Entities;

/// <summary>
/// An in-app notification for a specific user.
/// Notifications are created by background workers and API events,
/// and read (marked as seen) by the frontend via polling.
/// </summary>
public class Notification
{
    public Guid     Id        { get; set; } = Guid.NewGuid();

    /// <summary>The user this notification belongs to.</summary>
    public Guid     UserId    { get; set; }

    /// <summary>Short display title, e.g. "Envelope Expired".</summary>
    public string   Title     { get; set; } = string.Empty;

    /// <summary>Human-readable body text.</summary>
    public string   Body      { get; set; } = string.Empty;

    /// <summary>
    /// Icon / category hint for the frontend.
    /// E.g. "envelope.expired", "envelope.completed", "envelope.signed".
    /// </summary>
    public string   Type      { get; set; } = string.Empty;

    /// <summary>Optional deep-link URL within the dashboard.</summary>
    public string?  Link      { get; set; }

    public bool     IsRead    { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User? User { get; set; }
}
