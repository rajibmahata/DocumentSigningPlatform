using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Polls every 15 minutes and expires any SigningEnvelope whose signing window has closed
/// without full completion.
///
/// For each overdue active envelope:
/// <list type="bullet">
///   <item>All Pending/Processing <c>Signer</c> records are marked <c>Expired</c>.</item>
///   <item>All Pending/Processing <c>SigningRequest</c> records linked to the envelope are marked <c>Expired</c>.</item>
///   <item>The <c>SigningEnvelope</c> itself is marked <c>Expired</c>.</item>
///   <item>An <c>envelope.expired</c> webhook is triggered for the merchant.</item>
///   <item>An expiry notification email is sent to the merchant owner.</item>
/// </list>
/// </summary>
public class ExpiryWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExpiryWorker> _logger;

    public ExpiryWorker(IServiceScopeFactory scopeFactory, ILogger<ExpiryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ExpiryWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredEnvelopesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "ExpiryWorker encountered an unhandled error.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }

        _logger.LogInformation("ExpiryWorker stopped.");
    }

    private async Task ProcessExpiredEnvelopesAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();

        var envelopeRepo     = scope.ServiceProvider.GetRequiredService<ISigningEnvelopeRepository>();
        var signingReqRepo   = scope.ServiceProvider.GetRequiredService<ISigningRequestRepository>();
        var webhookService   = scope.ServiceProvider.GetRequiredService<IWebhookService>();
        var emailService     = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var notifService     = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var expiredEnvelopes = await envelopeRepo.GetExpiredActiveEnvelopesAsync(ct);
        if (expiredEnvelopes.Count == 0)
            return;

        _logger.LogInformation("ExpiryWorker: found {Count} envelope(s) to expire.", expiredEnvelopes.Count);

        foreach (var envelope in expiredEnvelopes)
        {
            try
            {
                // 1. Mark all pending/processing signers as Expired
                var pendingSigners = envelope.Signers
                    .Where(s => s.Status is SigningStatus.Pending or SigningStatus.Processing)
                    .ToList();

                foreach (var signer in pendingSigners)
                    signer.Status = SigningStatus.Expired;

                // 2. Mark all pending/processing SigningRequests as Expired (bulk update)
                await signingReqRepo.ExpireByEnvelopeAsync(envelope.Id, ct);

                // 3. Mark the envelope itself as Expired
                envelope.Status = EnvelopeStatus.Expired;
                await envelopeRepo.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "ExpiryWorker: envelope {Id} expired. Pending signers expired: {Count}.",
                    envelope.Id, pendingSigners.Count);

                // 4. Trigger envelope.expired webhook
                var webhookPayload = new
                {
                    envelopeId     = envelope.Id,
                    title          = envelope.Title,
                    expiredSigners = pendingSigners.Select(s => new { s.Name, s.Email }).ToArray(),
                    expiredAt      = DateTime.UtcNow,
                };

                await webhookService.TriggerAsync("envelope.expired", envelope.MerchantId, webhookPayload, ct);

                // 5. Send expiry notification email to merchant owner and create in-app notification
                var merchantUser = envelope.Merchant?.User;
                if (merchantUser is not null)
                {
                    await emailService.SendEnvelopeExpiredAsync(
                        merchantUser.Email,
                        merchantUser.Name,
                        envelope.Title,
                        envelope.Signers.Count,
                        ct);

                    await notifService.NotifyAsync(
                        merchantUser.Id,
                        "Envelope Expired",
                        $"\"{envelope.Title}\" has expired with {pendingSigners.Count} unsigned request(s).",
                        "envelope.expired",
                        $"/dashboard/envelopes/{envelope.Id}",
                        ct);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex,
                    "ExpiryWorker: failed to expire envelope {EnvelopeId}.", envelope.Id);
            }
        }
    }
}
