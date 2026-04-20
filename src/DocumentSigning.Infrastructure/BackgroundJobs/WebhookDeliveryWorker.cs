using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Polls <c>WebhookDeliveries</c> every 10 seconds and dispatches pending deliveries via HTTP POST.
///
/// Retry schedule (HMAC-secured, <c>X-DocSigner-Signature</c> header):
/// <list type="bullet">
///   <item>Attempt 1 → +1 minute</item>
///   <item>Attempt 2 → +5 minutes</item>
///   <item>Attempt 3 → +15 minutes</item>
///   <item>Attempt 4 → +1 hour</item>
///   <item>Attempt 5 → +24 hours</item>
/// </list>
/// After 5 failures the delivery is permanently marked <c>Failed</c>.
/// 4xx responses are never retried (client configuration error).
/// </summary>
public class WebhookDeliveryWorker : BackgroundService
{
    private static readonly TimeSpan[] RetryIntervals =
    {
        TimeSpan.FromMinutes(1),
        TimeSpan.FromMinutes(5),
        TimeSpan.FromMinutes(15),
        TimeSpan.FromHours(1),
        TimeSpan.FromHours(24),
    };

    private const int MaxRetries = 5;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);

    private readonly IServiceScopeFactory        _scopeFactory;
    private readonly IHttpClientFactory          _httpClientFactory;
    private readonly ILogger<WebhookDeliveryWorker> _logger;

    public WebhookDeliveryWorker(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookDeliveryWorker> logger)
    {
        _scopeFactory      = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger            = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("WebhookDeliveryWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessNextDeliveryAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in WebhookDeliveryWorker loop.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }

        _logger.LogInformation("WebhookDeliveryWorker stopped.");
    }

    private async Task ProcessNextDeliveryAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IWebhookRepository>();

        var delivery = await repo.ClaimNextDeliveryAsync(ct);
        if (delivery is null) return;

        if (delivery.Webhook is null)
        {
            _logger.LogWarning("WebhookDelivery {Id} has no associated Webhook — marking Failed.", delivery.Id);
            delivery.Status = WebhookDeliveryStatus.Failed;
            await repo.UpdateDeliveryAsync(delivery, ct);
            await repo.SaveDeliveryChangesAsync(ct);
            return;
        }

        _logger.LogInformation(
            "Dispatching webhook delivery {Id} | event={Event} | url={Url}",
            delivery.Id, delivery.EventName, delivery.Webhook.Url);

        delivery.LastAttempt = DateTime.UtcNow;

        try
        {
            var client = _httpClientFactory.CreateClient("webhook");

            // ── HMAC-SHA256 signature ─────────────────────────────────────────
            var secretBytes  = Encoding.UTF8.GetBytes(delivery.Webhook.Secret);
            var payloadBytes = Encoding.UTF8.GetBytes(delivery.Payload);
            var signature    = Convert.ToHexString(HMACSHA256.HashData(secretBytes, payloadBytes))
                                      .ToLowerInvariant();

            using var request = new HttpRequestMessage(HttpMethod.Post, delivery.Webhook.Url);
            request.Content = new StringContent(delivery.Payload, Encoding.UTF8, "application/json");
            request.Headers.TryAddWithoutValidation("X-DocSigner-Signature", signature);
            request.Headers.TryAddWithoutValidation("X-DocSigner-Event",     delivery.EventName);

            // Per-request timeout (in addition to the named client's default)
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(30));

            using var response = await client.SendAsync(request, cts.Token);

            var statusCode = (int)response.StatusCode;
            delivery.Response = $"{statusCode} {response.ReasonPhrase}";

            if (response.IsSuccessStatusCode)
            {
                delivery.Status = WebhookDeliveryStatus.Success;
                _logger.LogInformation("Webhook delivery {Id} succeeded ({StatusCode}).", delivery.Id, statusCode);
            }
            else if (statusCode is >= 400 and < 500)
            {
                // 4xx — client-side misconfiguration, do not retry
                delivery.Status = WebhookDeliveryStatus.Failed;
                delivery.Response += " (4xx — no retry)";
                _logger.LogWarning(
                    "Webhook delivery {Id} returned {StatusCode} — not retrying (4xx).", delivery.Id, statusCode);
            }
            else
            {
                // 5xx — transient server error, schedule retry
                ScheduleRetry(delivery);
                _logger.LogWarning(
                    "Webhook delivery {Id} returned {StatusCode} — retry #{Attempt} scheduled.",
                    delivery.Id, statusCode, delivery.RetryCount);
            }
        }
        catch (TaskCanceledException)
        {
            delivery.Response = "Timeout (30 s)";
            ScheduleRetry(delivery);
            _logger.LogWarning(
                "Webhook delivery {Id} timed out — retry #{Attempt} scheduled.", delivery.Id, delivery.RetryCount);
        }
        catch (HttpRequestException ex)
        {
            delivery.Response = $"Network error: {ex.Message}";
            ScheduleRetry(delivery);
            _logger.LogWarning(
                "Webhook delivery {Id} network error — retry #{Attempt} scheduled.", delivery.Id, delivery.RetryCount);
        }
        catch (Exception ex)
        {
            delivery.Response = ex.Message;
            ScheduleRetry(delivery);
            _logger.LogError(ex, "Webhook delivery {Id} unexpected error — retry #{Attempt} scheduled.", delivery.Id, delivery.RetryCount);
        }

        await repo.UpdateDeliveryAsync(delivery, ct);
        await repo.SaveDeliveryChangesAsync(ct);
    }

    private void ScheduleRetry(WebhookDelivery delivery)
    {
        delivery.RetryCount++;

        if (delivery.RetryCount >= MaxRetries)
        {
            delivery.Status = WebhookDeliveryStatus.Failed;
            _logger.LogWarning(
                "Webhook delivery {Id} permanently failed after {Max} attempts.", delivery.Id, MaxRetries);
        }
        else
        {
            var interval = RetryIntervals[Math.Min(delivery.RetryCount - 1, RetryIntervals.Length - 1)];
            delivery.NextAttempt = DateTime.UtcNow.Add(interval);
            delivery.Status      = WebhookDeliveryStatus.Pending;
        }
    }
}
