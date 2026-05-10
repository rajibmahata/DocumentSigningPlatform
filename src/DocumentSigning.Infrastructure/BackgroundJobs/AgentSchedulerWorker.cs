using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Cron-aware background scheduler for the Agent Manager system.
/// Polls every minute and fires agents whose schedule expression is due.
/// </summary>
public sealed class AgentSchedulerWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<AgentSchedulerWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        log.LogInformation("AgentSchedulerWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Align execution to the top of each minute
            var now       = DateTime.UtcNow;
            var nextMinute = now.AddSeconds(60 - now.Second).AddMilliseconds(-now.Millisecond);
            var delay     = nextMinute - now;
            if (delay.TotalMilliseconds > 0)
                await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var orchestrator = scope.ServiceProvider.GetRequiredService<IAgentOrchestrator>();
                await orchestrator.ExecuteScheduledAgentsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "AgentSchedulerWorker encountered an error.");
            }
        }

        log.LogInformation("AgentSchedulerWorker stopped.");
    }
}
