using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Polls OutboxQueue every 5 seconds and dispatches jobs to their handlers.
/// Runs as an in-process IHostedService background worker.
/// </summary>
public class OutboxWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxWorker> _logger;

    public OutboxWorker(IServiceScopeFactory scopeFactory, ILogger<OutboxWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxWorker started.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessNextJobAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in OutboxWorker loop.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }

        _logger.LogInformation("OutboxWorker stopped.");
    }

    private async Task ProcessNextJobAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var outbox = scope.ServiceProvider.GetRequiredService<IOutboxQueueRepository>();

        var job = await outbox.ClaimNextJobAsync(ct);
        if (job is null) return;

        _logger.LogInformation("Processing job {JobId} of type {JobType}", job.Id, job.JobType);

        try
        {
            await DispatchAsync(scope.ServiceProvider, job, ct);

            job.Status = JobStatus.Done;
            job.ProcessedAt = DateTime.UtcNow;
            await outbox.UpdateAsync(job, ct);
            await outbox.SaveChangesAsync(ct);

            _logger.LogInformation("Job {JobId} completed.", job.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Job {JobId} failed (attempt {Retry}).", job.Id, job.RetryCount + 1);
            job.RetryCount++;
            job.Error = ex.Message;

            if (job.RetryCount >= 3)
            {
                // For StampDoc failures: reset the signing request back to Pending
                // so the signer can retry — otherwise it stays stuck at Processing forever.
                if (job.JobType == JobTypes.StampDoc)
                {
                    try
                    {
                        var stampPayload = JsonSerializer.Deserialize<StampPdfPayload>(job.Payload, JsonOpts);
                        if (stampPayload is not null)
                        {
                            var signingReqRepo = scope.ServiceProvider.GetRequiredService<ISigningRequestRepository>();
                            var sr = await signingReqRepo.GetByIdAsync(stampPayload.SigningRequestId, ct);
                            if (sr is not null && sr.Status == SigningStatus.Processing)
                            {
                                sr.Status = SigningStatus.Pending;
                                await signingReqRepo.UpdateAsync(sr, ct);
                                await signingReqRepo.SaveChangesAsync(ct);
                                _logger.LogWarning(
                                    "StampDoc job {JobId} permanently failed. Signing request {SrId} reset to Pending.",
                                    job.Id, sr.Id);
                            }
                        }
                    }
                    catch (Exception resetEx)
                    {
                        _logger.LogError(resetEx, "Failed to reset signing request after StampDoc failure for job {JobId}.", job.Id);
                    }
                }

                await outbox.MoveToFailedAsync(job, ct);
            }
            else
            {
                job.Status = JobStatus.Pending; // re-queue for retry
                await outbox.UpdateAsync(job, ct);
                await outbox.SaveChangesAsync(ct);
            }
        }
    }

    private async Task DispatchAsync(IServiceProvider sp, OutboxQueue job, CancellationToken ct)
    {
        switch (job.JobType)
        {
            case JobTypes.SendEmail:
            {
                var payload = JsonSerializer.Deserialize<SendEmailPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null SendEmail payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                await emailSvc.SendSigningInvitationAsync(
                    payload.To, payload.ToName, payload.SigningLink, payload.ExpiresAt,
                    payload.EnvelopeTitle, payload.SenderName, ct);
                break;
            }
            case JobTypes.StampDoc:
            {
                var stampHandler = sp.GetRequiredService<StampDocJobHandler>();
                await stampHandler.HandleAsync(job, ct);
                break;
            }
            case JobTypes.SendConfirmation:
            {
                var payload = JsonSerializer.Deserialize<ConfirmationEmailPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null Confirmation payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                var signedDocRepo = sp.GetRequiredService<ISignedDocumentRepository>();
                var signedDoc = await signedDocRepo.GetByIdAsync(payload.SignedDocumentId, ct)
                    ?? throw new InvalidOperationException("SignedDocument not found.");
                await emailSvc.SendConfirmationToClaimantAsync(
                    payload.To, payload.ToName, signedDoc.ContentBytes, signedDoc.ContentType, ct);
                break;
            }
            case JobTypes.SendFirmNotification:
            {
                var payload = JsonSerializer.Deserialize<FirmNotificationPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null FirmNotification payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                await emailSvc.SendFirmNotificationAsync(payload.FirmEmail, payload.ClaimId, payload.ClaimantName, ct);
                break;
            }
            case JobTypes.SendVerificationEmail:
            {
                var payload = JsonSerializer.Deserialize<VerificationEmailPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null VerificationEmail payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                await emailSvc.SendEmailVerificationAsync(payload.To, payload.ToName, payload.VerificationLink, ct);
                break;
            }
            case JobTypes.SendPasswordReset:
            {
                var payload = JsonSerializer.Deserialize<PasswordResetEmailPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null PasswordReset payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                await emailSvc.SendPasswordResetAsync(payload.To, payload.ToName, payload.ResetLink, ct);
                break;
            }
            case JobTypes.SendMerchantSignedDoc:
            {
                var payload = JsonSerializer.Deserialize<MerchantSignedDocPayload>(job.Payload, JsonOpts)
                    ?? throw new InvalidOperationException("Null MerchantSignedDoc payload.");
                var emailSvc = sp.GetRequiredService<IEmailService>();
                var signedDocRepo = sp.GetRequiredService<ISignedDocumentRepository>();
                var signedDoc = await signedDocRepo.GetByIdAsync(payload.SignedDocumentId, ct)
                    ?? throw new InvalidOperationException("SignedDocument not found.");
                await emailSvc.SendMerchantSignedDocAsync(
                    payload.To, payload.ToName, payload.SignerName, payload.EnvelopeTitle,
                    signedDoc.ContentBytes, signedDoc.ContentType, ct);
                break;
            }
            default:
                throw new NotSupportedException($"Unknown job type: {job.JobType}");
        }
    }

}

/// <summary>Constants for job type strings in OutboxQueue.JobType.</summary>
public static class JobTypes
{
    public const string SendEmail             = "SendEmail";
    public const string StampDoc              = "StampDoc";
    public const string SendConfirmation      = "SendConfirmation";
    public const string SendFirmNotification  = "SendFirmNotification";
    public const string SendVerificationEmail  = "SendVerificationEmail";
    public const string SendPasswordReset      = "SendPasswordReset";
    public const string SendMerchantSignedDoc  = "SendMerchantSignedDoc";
}
