using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Central orchestration engine for the AI Marketing Agent Manager.
/// Manages scheduling, execution lifecycle, retries, and agent health.
/// </summary>
public sealed class AgentOrchestrator(
    AppDbContext db,
    IEnumerable<ISpecializedAgent> agents,
    IValidationPipeline validation,
    ILogger<AgentOrchestrator> log) : IAgentOrchestrator
{
    private readonly Dictionary<string, ISpecializedAgent> _agentMap =
        agents.ToDictionary(a => a.AgentType, StringComparer.OrdinalIgnoreCase);

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<AgentExecutionOutput> ExecuteAgentAsync(
        Guid agentId, Guid merchantId, string triggerType = "manual",
        CancellationToken ct = default)
    {
        var definition = await db.AgentDefinitions
            .FirstOrDefaultAsync(a => a.Id == agentId && a.MerchantId == merchantId, ct);

        if (definition is null)
            return Fail("Agent not found.");
        if (!definition.IsEnabled)
            return Fail("Agent is disabled.");

        return await RunAgentAsync(definition, triggerType, ct);
    }

    public async Task ExecuteScheduledAgentsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        // Load all enabled agents that have a schedule expression.
        var candidates = await db.AgentDefinitions
            .Where(a => a.IsEnabled && a.ScheduleExpression != null)
            .ToListAsync(ct);

        foreach (var agent in candidates)
        {
            if (!IsDue(agent, now)) continue;

            try
            {
                log.LogInformation("Scheduler firing agent {Name} ({Id})", agent.AgentName, agent.Id);
                await RunAgentAsync(agent, "scheduled", ct);
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Scheduler error for agent {Id}", agent.Id);
            }
        }
    }

    public async Task<AgentExecutionOutput> RetryExecutionAsync(
        Guid executionId, CancellationToken ct = default)
    {
        var history = await db.AgentExecutionHistories
            .Include(h => h.Agent)
            .FirstOrDefaultAsync(h => h.Id == executionId, ct);

        if (history is null) return Fail("Execution not found.");
        if (history.Agent is null) return Fail("Agent not found.");

        if (history.RetryCount >= history.Agent.MaxRetries)
            return Fail($"Max retries ({history.Agent.MaxRetries}) reached.");

        history.RetryCount++;
        history.ExecutionStatus = "retrying";
        await db.SaveChangesAsync(ct);

        return await RunAgentAsync(history.Agent, "manual", ct, existingHistoryId: history.Id);
    }

    public async Task CancelExecutionAsync(Guid executionId, CancellationToken ct = default)
    {
        var history = await db.AgentExecutionHistories
            .FirstOrDefaultAsync(h => h.Id == executionId, ct);

        if (history is null) return;
        if (history.ExecutionStatus == "running")
        {
            history.ExecutionStatus = "cancelled";
            history.CompletedAt    = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task ApproveExecutionAsync(Guid executionId, CancellationToken ct = default)
    {
        var history = await db.AgentExecutionHistories
            .FirstOrDefaultAsync(h => h.Id == executionId, ct);

        if (history is null) return;
        history.ExecutionStatus = "approved";
        history.CompletedAt    = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    // ── Internal Execution ────────────────────────────────────────────────────

    private async Task<AgentExecutionOutput> RunAgentAsync(
        AgentDefinition definition,
        string triggerType,
        CancellationToken ct,
        Guid? existingHistoryId = null)
    {
        AgentExecutionHistory? history;
        if (existingHistoryId.HasValue)
        {
            history = await db.AgentExecutionHistories.FindAsync([existingHistoryId.Value], ct);
        }
        else
        {
            history = new AgentExecutionHistory
            {
                AgentId         = definition.Id,
                MerchantId      = definition.MerchantId,
                ExecutionStatus = "running",
                TriggerType     = triggerType,
                StartedAt       = DateTime.UtcNow,
            };
            db.AgentExecutionHistories.Add(history);
            await db.SaveChangesAsync(ct);
        }

        var stepLog = new List<object>();

        try
        {
            // Find the specialized agent implementation
            if (!_agentMap.TryGetValue(definition.AgentType, out var specialAgent))
                throw new InvalidOperationException($"No implementation registered for agent type: {definition.AgentType}");

            // Load agent memories for context
            var memories = await db.AgentMemories
                .Where(m => m.AgentId == definition.Id)
                .ToListAsync(ct);

            var contextDict = memories.ToDictionary(m => $"{m.ContextType}:{m.ContextKey}", m => m.ContextValue);
            contextDict["agent_config"] = definition.ConfigurationJson ?? "{}";

            var input = new AgentExecutionInput(
                MerchantId:  definition.MerchantId,
                AgentId:     definition.Id,
                AgentType:   definition.AgentType,
                Prompt:      null,
                ContextJson: JsonSerializer.Serialize(contextDict),
                TriggerType: triggerType
            );

            stepLog.Add(new { step = "init", status = "ok", timestamp = DateTime.UtcNow });

            // Execute the specialized agent
            var output = await specialAgent.ExecuteAsync(input, ct);

            stepLog.Add(new { step = "agent_run", status = output.Success ? "ok" : "failed", timestamp = DateTime.UtcNow });

            // Run validation pipeline if content was produced
            ValidationResult? validationResult = null;
            if (output.Success && !string.IsNullOrEmpty(output.Content))
            {
                var brandVoice = definition.ConfigurationJson is not null
                    ? TryExtractBrandVoice(definition.ConfigurationJson)
                    : null;

                validationResult = await validation.ValidateAsync(output.Content, definition.AgentType, brandVoice, ct);
                stepLog.Add(new { step = "validation", status = validationResult.Passed ? "passed" : "failed", score = validationResult.QualityScore, timestamp = DateTime.UtcNow });

                output = output with { Validation = validationResult };
            }

            // Determine final status based on approval mode
            string finalStatus;
            if (!output.Success)
                finalStatus = "failed";
            else if (definition.ApprovalMode == "approval" || definition.ApprovalMode == "hybrid")
                finalStatus = "pending_approval";
            else
                finalStatus = "completed";

            // Persist execution result
            history!.ExecutionStatus      = finalStatus;
            history.CompletedAt           = DateTime.UtcNow;
            history.OutputJson            = output.OutputJson;
            history.ValidationResultJson  = validationResult is not null
                ? JsonSerializer.Serialize(validationResult)
                : null;
            history.StepLogJson           = JsonSerializer.Serialize(stepLog);

            await db.SaveChangesAsync(ct);

            log.LogInformation("Agent {Name} completed with status {Status}", definition.AgentName, finalStatus);
            return output;
        }
        catch (Exception ex)
        {
            stepLog.Add(new { step = "error", message = ex.Message, timestamp = DateTime.UtcNow });

            history!.ExecutionStatus = "failed";
            history.CompletedAt      = DateTime.UtcNow;
            history.ErrorDetails     = ex.Message;
            history.StepLogJson      = JsonSerializer.Serialize(stepLog);
            await db.SaveChangesAsync(ct);

            log.LogError(ex, "Agent {Name} ({Id}) execution failed", definition.AgentName, definition.Id);
            return Fail(ex.Message);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static AgentExecutionOutput Fail(string error) =>
        new(false, null, null, null, error);

    /// <summary>
    /// Simple cron-style due check: only supports "0 H * * *" (daily at hour H) for now.
    /// A full cron library like Cronos can replace this for production.
    /// </summary>
    private static bool IsDue(AgentDefinition agent, DateTime now)
    {
        if (agent.ScheduleExpression is null) return false;
        var parts = agent.ScheduleExpression.Trim().Split(' ');
        if (parts.Length < 5) return false;

        // minute hour * * *
        if (!int.TryParse(parts[0], out var minute)) return false;
        if (!int.TryParse(parts[1], out var hour))   return false;

        return now.Minute == minute && now.Hour == hour;
    }

    private static string? TryExtractBrandVoice(string configJson)
    {
        try
        {
            var doc = JsonDocument.Parse(configJson);
            if (doc.RootElement.TryGetProperty("brandVoice", out var bv))
                return bv.GetString();
        }
        catch { /* ignore */ }
        return null;
    }
}
