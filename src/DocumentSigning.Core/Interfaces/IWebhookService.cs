namespace DocumentSigning.Core.Interfaces;

public interface IWebhookService
{
    /// <summary>
    /// Finds all active webhooks for <paramref name="merchantId"/> that subscribe to
    /// <paramref name="eventName"/>, persists <c>WebhookDelivery</c> records with status
    /// <c>Pending</c>, and returns immediately.
    /// The <c>WebhookDeliveryWorker</c> handles the actual HTTP dispatch asynchronously.
    /// </summary>
    Task TriggerAsync(string eventName, Guid merchantId, object payload, CancellationToken ct = default);
}
