using System.Text.Json;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Creates <see cref="WebhookDelivery"/> records for all active, subscribed webhooks.
/// Actual HTTP dispatch is handled asynchronously by <c>WebhookDeliveryWorker</c>.
/// </summary>
public class WebhookService : IWebhookService
{
    private readonly IWebhookRepository _repo;

    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public WebhookService(IWebhookRepository repo) => _repo = repo;

    /// <inheritdoc />
    public async Task TriggerAsync(
        string eventName,
        Guid merchantId,
        object payload,
        CancellationToken ct = default)
    {
        var webhooks = await _repo.GetActiveByMerchantAndEventAsync(merchantId, eventName, ct);
        if (webhooks.Count == 0) return;

        // Wrap payload in the standard DocSignerHub envelope
        var wrapper = new
        {
            @event    = eventName,
            timestamp = DateTime.UtcNow,
            data      = payload,
        };
        var payloadJson = JsonSerializer.Serialize(wrapper, _jsonOpts);

        foreach (var webhook in webhooks)
        {
            await _repo.AddDeliveryAsync(new WebhookDelivery
            {
                Id          = Guid.NewGuid(),
                WebhookId   = webhook.Id,
                EventName   = eventName,
                Payload     = payloadJson,
                Status      = WebhookDeliveryStatus.Pending,
                RetryCount  = 0,
                NextAttempt = DateTime.UtcNow,
                CreatedAt   = DateTime.UtcNow,
            }, ct);
        }

        await _repo.SaveChangesAsync(ct);
    }
}
