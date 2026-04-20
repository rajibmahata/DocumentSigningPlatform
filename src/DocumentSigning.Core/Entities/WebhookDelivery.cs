using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// A single delivery attempt record for a webhook event.
/// Created by <see cref="DocumentSigning.Core.Interfaces.IWebhookService"/>;
/// dispatched by <c>WebhookDeliveryWorker</c>.
/// </summary>
public class WebhookDelivery
{
    public Guid   Id        { get; set; }
    public Guid   WebhookId { get; set; }
    public string EventName { get; set; } = string.Empty;
    /// <summary>Full JSON payload sent in the HTTP body.</summary>
    public string Payload   { get; set; } = string.Empty;
    public WebhookDeliveryStatus Status { get; set; } = WebhookDeliveryStatus.Pending;
    public int    RetryCount  { get; set; } = 0;
    /// <summary>Last HTTP response line, e.g. "200 OK" or "500 Internal Server Error (5xx — retry)".</summary>
    public string? Response  { get; set; }
    public DateTime? LastAttempt { get; set; }
    /// <summary>Earliest time the worker should next attempt delivery.</summary>
    public DateTime  NextAttempt { get; set; } = DateTime.UtcNow;
    public DateTime  CreatedAt   { get; set; } = DateTime.UtcNow;

    // Navigation
    public Webhook? Webhook { get; set; }
}
