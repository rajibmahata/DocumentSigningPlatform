using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Polls on a configurable interval (default 1 hour, <c>Reminder:PollIntervalHours</c> in appsettings)
/// and sends a reminder email to signers whose signing link is within each merchant's configured
/// reminder window and who have not yet received a reminder.
///
/// Per-merchant settings (stored on the <c>Merchant</c> entity):
/// <list type="bullet">
///   <item><c>ReminderEnabled</c> — toggle reminders on/off per merchant.</item>
///   <item><c>ReminderWindowHours</c> — how many hours before expiry to send the reminder (default 24).</item>
/// </list>
/// </summary>
public class ReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReminderWorker> _logger;
    private readonly TimeSpan _pollInterval;

    public ReminderWorker(IServiceScopeFactory scopeFactory, ILogger<ReminderWorker> logger, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
        var hours     = config.GetValue<int>("Reminder:PollIntervalHours", 1);
        _pollInterval = TimeSpan.FromHours(hours);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReminderWorker started (poll every {Hours}h).", _pollInterval.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRemindersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "ReminderWorker encountered an unhandled error.");
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }

        _logger.LogInformation("ReminderWorker stopped.");
    }

    private async Task ProcessRemindersAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();

        var signingRequestRepo = scope.ServiceProvider.GetRequiredService<ISigningRequestRepository>();
        var emailService       = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var config             = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        var pendingReminders = await signingRequestRepo.GetPendingRemindersAsync(ct);
        if (pendingReminders.Count == 0)
            return;

        _logger.LogInformation("ReminderWorker: sending {Count} reminder(s).", pendingReminders.Count);

        var baseUrl = config["App:FrontendUrl"] ?? config["App:BaseUrl"] ?? string.Empty;

        foreach (var reminder in pendingReminders)
        {
            try
            {
                var signingLink = $"{baseUrl.TrimEnd('/')}/sign/{reminder.Token}";

                await emailService.SendSigningReminderAsync(
                    reminder.SignerEmail,
                    reminder.SignerName,
                    signingLink,
                    reminder.ExpiresAt,
                    reminder.EnvelopeTitle,
                    reminder.MerchantName,
                    ct);

                // Stamp ReminderSentAt so we don't resend
                await signingRequestRepo.MarkReminderSentAsync(reminder.SigningRequestId, ct);

                _logger.LogInformation(
                    "ReminderWorker: reminder sent to {Email} for envelope {EnvelopeId}.",
                    reminder.SignerEmail, reminder.EnvelopeId);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex,
                    "ReminderWorker: failed to send reminder for SigningRequest {Id}.",
                    reminder.SigningRequestId);
            }
        }
    }
}
