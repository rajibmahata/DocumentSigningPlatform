using System.Security.Cryptography;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Manages webhook registrations and delivery history for the authenticated merchant.
/// </summary>
[ApiController]
[Route("api/webhooks")]
[Authorize]
public class WebhooksController : ControllerBase
{
    private readonly IWebhookRepository  _webhookRepo;
    private readonly IMerchantRepository _merchantRepo;

    private Guid CurrentUserId =>
        Guid.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? throw new InvalidOperationException("No user identity."));

    public WebhooksController(
        IWebhookRepository webhookRepo,
        IMerchantRepository merchantRepo)
    {
        _webhookRepo  = webhookRepo;
        _merchantRepo = merchantRepo;
    }

    // ── POST /api/webhooks ────────────────────────────────────────────────────

    /// <summary>Registers a new webhook for a merchant.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateWebhookRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Url) || request.Events is null || request.Events.Count == 0)
            return BadRequest("Url and at least one event are required.");

        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest("Url must be an absolute http or https URL.");

        var invalidEvents = request.Events.Except(WebhookEvents.All).ToList();
        if (invalidEvents.Count > 0)
            return BadRequest($"Unknown event(s): {string.Join(", ", invalidEvents)}");

        // Verify caller owns the merchant
        var merchant = await _merchantRepo.GetByIdAsync(request.MerchantId, ct);
        if (merchant is null || merchant.UserId != CurrentUserId)
            return Forbid();

        // Generate a cryptographically random secret
        var secretBytes = new byte[32];
        RandomNumberGenerator.Fill(secretBytes);
        var secret = Convert.ToBase64String(secretBytes);

        var webhook = new Webhook
        {
            Id         = Guid.NewGuid(),
            MerchantId = merchant.Id,
            Url        = request.Url,
            Secret     = secret,
            IsActive   = true,
            CreatedAt  = DateTime.UtcNow,
            Subscriptions = request.Events
                .Distinct()
                .Select(e => new WebhookSubscription { Id = Guid.NewGuid(), EventName = e })
                .ToList(),
        };

        await _webhookRepo.AddAsync(webhook, ct);
        await _webhookRepo.SaveChangesAsync(ct);

        return CreatedAtAction(
            nameof(GetDeliveries),
            new { id = webhook.Id },
            ToResponse(webhook));
    }

    // ── GET /api/webhooks?merchantId={id} ─────────────────────────────────────

    /// <summary>Returns all webhooks for a merchant.</summary>
    [HttpGet]
    public async Task<IActionResult> GetByMerchant(
        [FromQuery] Guid merchantId,
        CancellationToken ct)
    {
        var merchant = await _merchantRepo.GetByIdAsync(merchantId, ct);
        if (merchant is null || merchant.UserId != CurrentUserId)
            return Forbid();

        var webhooks = await _webhookRepo.GetByMerchantAsync(merchantId, ct);
        return Ok(webhooks.Select(ToResponse));
    }

    // ── DELETE /api/webhooks/{id} ─────────────────────────────────────────────

    /// <summary>Deletes a webhook registration.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var webhook = await _webhookRepo.GetByIdAsync(id, ct);
        if (webhook is null) return NotFound();

        var merchant = await _merchantRepo.GetByIdAsync(webhook.MerchantId, ct);
        if (merchant is null || merchant.UserId != CurrentUserId)
            return Forbid();

        await _webhookRepo.DeleteAsync(id, ct);
        return NoContent();
    }

    // ── GET /api/webhooks/{id}/deliveries ─────────────────────────────────────

    /// <summary>Returns paged delivery history for a webhook.</summary>
    [HttpGet("{id:guid}/deliveries")]
    public async Task<IActionResult> GetDeliveries(
        Guid id,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct     = default)
    {
        var webhook = await _webhookRepo.GetByIdAsync(id, ct);
        if (webhook is null) return NotFound();

        var merchant = await _merchantRepo.GetByIdAsync(webhook.MerchantId, ct);
        if (merchant is null || merchant.UserId != CurrentUserId)
            return Forbid();

        var paged = await _webhookRepo.GetDeliveriesAsync(id, page, pageSize, ct);

        var result = new
        {
            paged.TotalCount,
            paged.Page,
            paged.PageSize,
            TotalPages = paged.TotalPages,
            Items = paged.Items.Select(d => new WebhookDeliveryResponse(
                d.Id,
                d.WebhookId,
                d.EventName,
                d.Status.ToString(),
                d.RetryCount,
                d.Response,
                d.LastAttempt,
                d.NextAttempt,
                d.CreatedAt)),
        };

        return Ok(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static WebhookResponse ToResponse(Webhook w) =>
        new(w.Id,
            w.MerchantId,
            w.Url,
            w.Secret,
            w.IsActive,
            w.Subscriptions.Select(s => s.EventName).ToList(),
            w.CreatedAt);
}
