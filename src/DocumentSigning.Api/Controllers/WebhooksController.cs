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
/// Manages webhook registrations and delivery history for the authenticated user.
/// </summary>
/// <remarks>
/// Webhooks allow you to receive real-time HTTP POST notifications when events occur
/// in your DocSignerHub account.
///
/// **Signature verification**
/// Every delivery includes an `X-DocSigner-Signature` header containing an
/// HMAC-SHA256 hex digest of the raw request body, signed with the webhook secret.
/// Always verify this before processing.
///
/// **PowerShell example**
/// ```powershell
/// $secret  = [System.Text.Encoding]::UTF8.GetBytes("&lt;your-secret&gt;")
/// $payload = [System.Text.Encoding]::UTF8.GetBytes($rawBody)
/// $hmac    = [System.Security.Cryptography.HMACSHA256]::new($secret)
/// $sig     = [BitConverter]::ToString($hmac.ComputeHash($payload)).Replace("-","").ToLower()
/// # compare $sig with the value in X-DocSigner-Signature
/// ```
///
/// **Retry policy** — Failed deliveries are retried up to 5 times with exponential back-off:
/// 1 min → 5 min → 15 min → 1 hr → 24 hr. 4xx responses are not retried.
/// </remarks>
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

    /// <summary>Register a new webhook endpoint for a merchant.</summary>
    /// <remarks>
    /// Creates a webhook that will receive HTTP POST events for the specified merchant.
    /// The caller must own the merchant (JWT user ID must match `merchant.UserId`).
    ///
    /// A 32-byte cryptographically random secret is generated and returned **once**.
    /// Store it securely — it cannot be retrieved again.
    ///
    /// **Supported events**
    /// | Event | Trigger |
    /// |---|---|
    /// | `envelope.processing` | Envelope accepted, preparing send |
    /// | `envelope.sent` | Invitation emails dispatched |
    /// | `envelope.signed` | One signer completed |
    /// | `envelope.completed` | All signers completed |
    /// | `envelope.failed` | System error |
    /// | `envelope.expired` | Signing window elapsed |
    /// | `envelope.rejected` | A signer rejected the document |
    /// | `envelope.cancelled` | Sender cancelled |
    /// | `ticket.created` | Support ticket opened |
    /// | `ticket.replied` | Message added to ticket |
    ///
    /// **Example payload delivered to your endpoint**
    /// ```json
    /// {
    ///   "event":     "envelope.completed",
    ///   "timestamp": "2026-04-19T12:34:56Z",
    ///   "data": {
    ///     "envelopeId": "uuid",
    ///     "status":     "Completed"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <response code="201">Webhook registered. Secret is in the response body.</response>
    /// <response code="400">Invalid URL, no events selected, or unknown event names.</response>
    /// <response code="403">Caller does not own the specified merchant.</response>
    /// <response code="404">Merchant not found.</response>
    [HttpPost]
    [ProducesResponseType(typeof(WebhookResponse), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
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

    /// <summary>List all webhooks for a merchant.</summary>
    /// <remarks>Returns every registered webhook with its subscribed events. The `secret` field is always returned (store it securely).</remarks>
    /// <param name="merchantId">The merchant whose webhooks to retrieve. Must be owned by the caller.</param>
    /// <response code="200">List of webhook registrations.</response>
    /// <response code="403">Caller does not own the merchant.</response>
    /// <response code="404">Merchant not found.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WebhookResponse>), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
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

    /// <summary>Delete a webhook registration.</summary>
    /// <remarks>Permanently removes the webhook and all associated delivery history. Cannot be undone.</remarks>
    /// <param name="id">Webhook ID to delete.</param>
    /// <response code="204">Webhook deleted.</response>
    /// <response code="403">Caller does not own the webhook's merchant.</response>
    /// <response code="404">Webhook not found.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
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

    /// <summary>Get paged delivery history for a webhook.</summary>
    /// <remarks>
    /// Returns a paginated list of delivery attempts ordered newest first.
    ///
    /// **Delivery status values**
    /// | Status | Meaning |
    /// |---|---|
    /// | `Pending` | Queued, not yet attempted |
    /// | `Processing` | Currently being delivered |
    /// | `Success` | Endpoint returned 2xx |
    /// | `Failed` | All retries exhausted or 4xx received |
    /// </remarks>
    /// <param name="id">Webhook ID.</param>
    /// <param name="page">Page number (1-based, default 1).</param>
    /// <param name="pageSize">Results per page (default 20, max 100).</param>
    /// <response code="200">Paged delivery history.</response>
    /// <response code="403">Caller does not own the webhook's merchant.</response>
    /// <response code="404">Webhook not found.</response>
    [HttpGet("{id:guid}/deliveries")]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
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

    // ── POST /api/webhooks/{id}/test ──────────────────────────────────────────

    /// <summary>Send a test ping to verify the webhook endpoint is reachable.</summary>
    /// <remarks>
    /// Dispatches a signed HTTP POST with a <c>webhook.test</c> event to the registered URL
    /// and returns the HTTP status code, response body, and round-trip duration.
    /// Use this to confirm your endpoint is live before relying on real events.
    /// </remarks>
    /// <param name="id">Webhook ID to test.</param>
    /// <response code="200">Test dispatched. Check <c>success</c> and <c>statusCode</c> in the response body.</response>
    /// <response code="403">Caller does not own the webhook's merchant.</response>
    /// <response code="404">Webhook not found.</response>
    [HttpPost("{id:guid}/test")]
    [ProducesResponseType(200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Test(
        Guid id,
        [FromServices] IHttpClientFactory httpFactory,
        CancellationToken ct)
    {
        var webhook = await _webhookRepo.GetByIdAsync(id, ct);
        if (webhook is null) return NotFound();

        var merchant = await _merchantRepo.GetByIdAsync(webhook.MerchantId, ct);
        if (merchant is null || merchant.UserId != CurrentUserId)
            return Forbid();

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            @event    = "webhook.test",
            timestamp = DateTime.UtcNow,
            data      = new { message = "This is a test ping from DocSignerHub. Your endpoint is working correctly." },
        });

        var payloadBytes = System.Text.Encoding.UTF8.GetBytes(payload);
        var secretBytes  = System.Text.Encoding.UTF8.GetBytes(webhook.Secret);
        var sig = Convert.ToHexString(HMACSHA256.HashData(secretBytes, payloadBytes)).ToLowerInvariant();

        var http = httpFactory.CreateClient("webhook");
        var req  = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, webhook.Url)
        {
            Content = new System.Net.Http.StringContent(payload, System.Text.Encoding.UTF8, "application/json"),
        };
        req.Headers.TryAddWithoutValidation("X-DocSigner-Signature", sig);
        req.Headers.TryAddWithoutValidation("X-DocSigner-Event",     "webhook.test");

        try
        {
            var sw  = System.Diagnostics.Stopwatch.StartNew();
            var res = await http.SendAsync(req, ct);
            sw.Stop();

            var body = await res.Content.ReadAsStringAsync(ct);
            return Ok(new
            {
                success    = res.IsSuccessStatusCode,
                statusCode = (int)res.StatusCode,
                durationMs = sw.ElapsedMilliseconds,
                body       = body.Length > 500 ? body[..500] : body,
            });
        }
        catch (TaskCanceledException)
        {
            return Ok(new { success = false, statusCode = 0, durationMs = 30_000L, body = "Request timed out after 30 s." });
        }
        catch (System.Net.Http.HttpRequestException ex)
        {
            return Ok(new { success = false, statusCode = 0, durationMs = 0L, body = ex.Message });
        }
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
