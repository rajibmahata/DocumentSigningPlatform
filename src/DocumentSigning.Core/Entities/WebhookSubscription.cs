namespace DocumentSigning.Core.Entities;

/// <summary>An individual event subscription within a webhook registration.</summary>
public class WebhookSubscription
{
    public Guid   Id        { get; set; }
    public Guid   WebhookId { get; set; }
    /// <summary>Event name, e.g. "envelope.signed". See <see cref="DocumentSigning.Core.Enums.WebhookEvents"/>.</summary>
    public string EventName { get; set; } = string.Empty;

    // Navigation
    public Webhook? Webhook { get; set; }
}
