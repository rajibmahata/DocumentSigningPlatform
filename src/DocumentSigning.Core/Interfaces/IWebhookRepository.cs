using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IWebhookRepository
{
    // ── Webhook registrations ─────────────────────────────────────────────────

    Task<Webhook?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Webhook>> GetByMerchantAsync(Guid merchantId, CancellationToken ct = default);

    /// <summary>Returns active webhooks that subscribe to the given event for the merchant.</summary>
    Task<IReadOnlyList<Webhook>> GetActiveByMerchantAndEventAsync(Guid merchantId, string eventName, CancellationToken ct = default);

    Task AddAsync(Webhook webhook, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);

    // ── Delivery records ──────────────────────────────────────────────────────

    Task AddDeliveryAsync(WebhookDelivery delivery, CancellationToken ct = default);

    /// <summary>
    /// Atomically claims one Pending delivery whose NextAttempt is in the past.
    /// Returns null when no delivery is ready.
    /// </summary>
    Task<WebhookDelivery?> ClaimNextDeliveryAsync(CancellationToken ct = default);

    Task UpdateDeliveryAsync(WebhookDelivery delivery, CancellationToken ct = default);
    Task SaveDeliveryChangesAsync(CancellationToken ct = default);

    Task<PagedResult<WebhookDelivery>> GetDeliveriesAsync(Guid webhookId, int page, int pageSize, CancellationToken ct = default);
}
