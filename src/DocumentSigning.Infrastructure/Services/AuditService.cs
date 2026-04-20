using System.Text.Json;
using System.Threading.Channels;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Background-queue audit service.
/// Controllers call <see cref="Log"/> (fire-and-forget); entries are written
/// to the database by the hosted background processor.
///
/// Registered as:
///   services.AddSingleton&lt;AuditService&gt;();
///   services.AddSingleton&lt;IAuditService&gt;(sp => sp.GetRequiredService&lt;AuditService&gt;());
///   services.AddHostedService(sp => sp.GetRequiredService&lt;AuditService&gt;());
/// </summary>
public sealed class AuditService : BackgroundService, IAuditService
{
    private readonly Channel<AuditEntry>      _channel;
    private readonly IServiceScopeFactory     _scopeFactory;
    private readonly ILogger<AuditService>    _logger;

    private static readonly JsonSerializerOptions _jsonOpts =
        new() { WriteIndented = false };

    public AuditService(IServiceScopeFactory scopeFactory, ILogger<AuditService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;

        // Bounded channel: if the queue fills up, newer entries are dropped rather than
        // blocking the request thread (audit is non-critical for user experience).
        _channel = Channel.CreateBounded<AuditEntry>(new BoundedChannelOptions(2000)
        {
            FullMode     = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });
    }

    // ── IAuditService ─────────────────────────────────────────────────────────

    /// <inheritdoc/>
    public void Log(AuditEntry entry)
        => _channel.Writer.TryWrite(entry);

    /// <inheritdoc/>
    public async ValueTask LogAsync(AuditEntry entry, CancellationToken ct = default)
        => await _channel.Writer.WriteAsync(entry, ct);

    // ── BackgroundService ─────────────────────────────────────────────────────

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AuditService background processor started.");

        await foreach (var entry in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await PersistAsync(entry, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AuditService: failed to persist audit entry {Action}.", entry.Action);
                // Swallow — audit must never crash the app.
            }
        }

        _logger.LogInformation("AuditService background processor stopped.");
    }

    private async Task PersistAsync(AuditEntry entry, CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<IAuditLogRepository>();

        var log = new AuditLog
        {
            Id               = Guid.NewGuid(),
            Action           = entry.Action,
            EntityType       = entry.EntityType,
            EntityId         = entry.EntityId,
            UserId           = entry.UserId,
            MerchantId       = entry.MerchantId,
            Status           = entry.Status,
            Description      = entry.Description ?? string.Empty,
            IpAddress        = entry.IpAddress   ?? string.Empty,
            UserAgent        = entry.UserAgent    ?? string.Empty,
            Metadata         = entry.Metadata,
            Timestamp        = DateTime.UtcNow,
            // Legacy chain fields
            SigningRequestId = entry.SigningRequestId,
            ClaimId          = entry.ClaimId,
        };

        await repo.AppendAsync(log, ct);
        await repo.SaveChangesAsync(ct);
    }
}
