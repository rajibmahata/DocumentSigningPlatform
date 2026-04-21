using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Polls every hour and sends a reminder email to signers whose signing link expires within 24 hours
/// and who have not yet received a reminder.
///
/// For each qualifying <c>SigningRequest</c>:
/// <list type="bullet">
///   <item>A reminder email is sent to the signer with the original signing link.</item>
///   <item><c>SigningRequest.ReminderSentAt</c> is stamped so the reminder is not sent again.</item>
/// </list>
/// </summary>
public class ReminderWorker : BackgroundService
{
    private const int ReminderWindowHours = 24;
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReminderWorker> _logger;

    public ReminderWorker(IServiceScopeFactory scopeFactory, ILogger<ReminderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReminderWorker started.");

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

            await Task.Delay(PollInterval, stoppingToken);
        }

        _logger.LogInformation("ReminderWorker stopped.");
    }

    private async Task ProcessRemindersAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();

        var signingRequestRepo = scope.ServiceProvider.GetRequiredService<ISigningRequestRepository>();
        var emailService       = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var config             = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();

        var pendingReminders = await signingRequestRepo.GetPendingRemindersAsync(ReminderWindowHours, ct);
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
