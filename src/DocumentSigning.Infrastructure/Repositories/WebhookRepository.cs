using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class WebhookRepository : IWebhookRepository
{
    private readonly AppDbContext _db;
    public WebhookRepository(AppDbContext db) => _db = db;

    // ── Webhook registrations ─────────────────────────────────────────────────

    public async Task<Webhook?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Webhooks
            .Include(w => w.Subscriptions)
            .FirstOrDefaultAsync(w => w.Id == id, ct);

    public async Task<IReadOnlyList<Webhook>> GetByMerchantAsync(Guid merchantId, CancellationToken ct = default)
        => await _db.Webhooks
            .Include(w => w.Subscriptions)
            .Where(w => w.MerchantId == merchantId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Webhook>> GetActiveByMerchantAndEventAsync(
        Guid merchantId, string eventName, CancellationToken ct = default)
        => await _db.Webhooks
            .Where(w => w.MerchantId == merchantId
                        && w.IsActive
                        && w.Subscriptions.Any(s => s.EventName == eventName))
            .ToListAsync(ct);

    public async Task AddAsync(Webhook webhook, CancellationToken ct = default)
        => await _db.Webhooks.AddAsync(webhook, ct);

    /// <summary>Uses ExecuteDeleteAsync for single-round-trip delete (no SaveChanges required).</summary>
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        => await _db.Webhooks.Where(w => w.Id == id).ExecuteDeleteAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    // ── Delivery records ──────────────────────────────────────────────────────

    public async Task AddDeliveryAsync(WebhookDelivery delivery, CancellationToken ct = default)
        => await _db.WebhookDeliveries.AddAsync(delivery, ct);

    /// <summary>
    /// Atomically claims one Pending delivery whose NextAttempt is &lt;= now
    /// by flipping its status to Processing via ExecuteUpdateAsync, preventing
    /// concurrent workers from double-dispatching.
    /// </summary>
    public async Task<WebhookDelivery?> ClaimNextDeliveryAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var delivery = await _db.WebhookDeliveries
            .Where(d => d.Status == WebhookDeliveryStatus.Pending && d.NextAttempt <= now)
            .OrderBy(d => d.NextAttempt)
            .FirstOrDefaultAsync(ct);

        if (delivery is null) return null;

        var affected = await _db.WebhookDeliveries
            .Where(d => d.Id == delivery.Id && d.Status == WebhookDeliveryStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(d => d.Status, WebhookDeliveryStatus.Processing), ct);

        if (affected == 0) return null; // another worker claimed it first

        delivery.Status = WebhookDeliveryStatus.Processing;

        // Load the webhook for URL + Secret
        delivery.Webhook = await _db.Webhooks.FindAsync(new object[] { delivery.WebhookId }, ct);

        return delivery;
    }

    public Task UpdateDeliveryAsync(WebhookDelivery delivery, CancellationToken ct = default)
    {
        _db.WebhookDeliveries.Update(delivery);
        return Task.CompletedTask;
    }

    public async Task SaveDeliveryChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    public async Task<PagedResult<WebhookDelivery>> GetDeliveriesAsync(
        Guid webhookId, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _db.WebhookDeliveries
            .AsNoTracking()
            .Where(d => d.WebhookId == webhookId)
            .OrderByDescending(d => d.CreatedAt);

        var total = await q.CountAsync(ct);
        var p     = Math.Max(1, page);
        var s     = Math.Clamp(pageSize, 1, 100);
        var items = await q.Skip((p - 1) * s).Take(s).ToListAsync(ct);

        return new PagedResult<WebhookDelivery>(items, total, p, s);
    }
}
