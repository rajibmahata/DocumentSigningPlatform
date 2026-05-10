using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Services;

public sealed class AgentManagerService(AppDbContext db) : IAgentManagerService
{
    // ── Agents ────────────────────────────────────────────────────────────────

    public async Task<List<AgentDto>> GetAgentsAsync(Guid merchantId)
    {
        var agents = await db.AgentDefinitions
            .Where(a => a.MerchantId == merchantId)
            .OrderBy(a => a.AgentType)
            .ToListAsync();
        return agents.Select(ToDto).ToList();
    }

    public async Task<AgentDto?> GetAgentAsync(Guid id, Guid merchantId)
    {
        var a = await db.AgentDefinitions
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        return a is null ? null : ToDto(a);
    }

    public async Task<AgentDto> CreateAgentAsync(Guid merchantId, CreateAgentRequest req)
    {
        var agent = new AgentDefinition
        {
            MerchantId         = merchantId,
            AgentName          = req.AgentName,
            AgentType          = req.AgentType,
            ParentAgentType    = req.ParentAgentType,
            Description        = req.Description,
            IsEnabled          = true,
            ScheduleExpression = req.ScheduleExpression,
            Timezone           = req.Timezone,
            ApprovalMode       = req.ApprovalMode,
            MaxRetries         = req.MaxRetries,
            ConfigurationJson  = req.ConfigurationJson,
        };
        db.AgentDefinitions.Add(agent);
        await db.SaveChangesAsync();
        return ToDto(agent);
    }

    public async Task UpdateAgentAsync(Guid id, Guid merchantId, UpdateAgentRequest req)
    {
        var agent = await db.AgentDefinitions
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (agent is null) return;

        agent.AgentName          = req.AgentName;
        agent.Description        = req.Description        ?? agent.Description;
        agent.IsEnabled          = req.IsEnabled;
        agent.ScheduleExpression = req.ScheduleExpression ?? agent.ScheduleExpression;
        agent.ApprovalMode       = req.ApprovalMode;
        agent.MaxRetries         = req.MaxRetries;
        agent.ConfigurationJson  = req.ConfigurationJson  ?? agent.ConfigurationJson;
        agent.UpdatedAt          = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task DeleteAgentAsync(Guid id, Guid merchantId)
    {
        var agent = await db.AgentDefinitions
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (agent is null) return;
        db.AgentDefinitions.Remove(agent);
        await db.SaveChangesAsync();
    }

    public async Task ToggleAgentAsync(Guid id, Guid merchantId, bool enabled)
    {
        var agent = await db.AgentDefinitions
            .FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (agent is null) return;
        agent.IsEnabled = enabled;
        agent.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // ── Workflows ─────────────────────────────────────────────────────────────

    public async Task<List<AgentWorkflowDto>> GetWorkflowsAsync(Guid agentId)
    {
        var wf = await db.AgentWorkflows.Where(w => w.AgentId == agentId).ToListAsync();
        return wf.Select(w => new AgentWorkflowDto(w.Id, w.AgentId, w.WorkflowName, w.StepsJson, w.IsEnabled, w.CreatedAt)).ToList();
    }

    // ── Execution History ─────────────────────────────────────────────────────

    public async Task<List<AgentExecutionDto>> GetAllExecutionsAsync(Guid merchantId, int limit = 100)
    {
        var execs = await db.AgentExecutionHistories
            .Where(e => e.MerchantId == merchantId)
            .OrderByDescending(e => e.StartedAt)
            .Take(limit)
            .ToListAsync();
        return execs.Select(ToExecDto).ToList();
    }

    public async Task<List<AgentExecutionDto>> GetExecutionHistoryAsync(Guid agentId, int limit = 50)
    {
        var execs = await db.AgentExecutionHistories
            .Where(e => e.AgentId == agentId)
            .OrderByDescending(e => e.StartedAt)
            .Take(limit)
            .ToListAsync();
        return execs.Select(ToExecDto).ToList();
    }

    // ── Memory ────────────────────────────────────────────────────────────────

    public async Task<List<AgentMemoryDto>> GetMemoriesAsync(Guid agentId)
    {
        var mems = await db.AgentMemories.Where(m => m.AgentId == agentId).ToListAsync();
        return mems.Select(m => new AgentMemoryDto(m.Id, m.AgentId, m.ContextType, m.ContextKey, m.ContextValue, m.UpdatedAt)).ToList();
    }

    public async Task UpsertMemoryAsync(Guid agentId, Guid merchantId, string contextType, string contextKey, string contextValue)
    {
        var mem = await db.AgentMemories
            .FirstOrDefaultAsync(m => m.AgentId == agentId && m.ContextType == contextType && m.ContextKey == contextKey);

        if (mem is null)
        {
            db.AgentMemories.Add(new AgentMemory
            {
                AgentId      = agentId,
                MerchantId   = merchantId,
                ContextType  = contextType,
                ContextKey   = contextKey,
                ContextValue = contextValue,
            });
        }
        else
        {
            mem.ContextValue = contextValue;
            mem.UpdatedAt    = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }

    // ── Customer Interactions ─────────────────────────────────────────────────

    public async Task<List<CustomerInteractionDto>> GetCustomerInteractionsAsync(Guid merchantId, string? email = null)
    {
        var q = db.CustomerInteractionMemories.Where(c => c.MerchantId == merchantId);
        if (!string.IsNullOrEmpty(email)) q = q.Where(c => c.CustomerEmail == email);
        var list = await q.OrderByDescending(c => c.CreatedAt).Take(200).ToListAsync();
        return list.Select(c => new CustomerInteractionDto(
            c.Id, c.CustomerEmail, c.CustomerName, c.InteractionType,
            c.Platform, c.Message, c.AiInterpretation, c.Sentiment, c.NextRecommendedAction,
            c.ObjectionType, c.ReEngageDaysDelay, c.CreatedAt)).ToList();
    }

    public async Task<CustomerInteractionDto> RecordInteractionAsync(Guid merchantId, CustomerInteractionDto dto)
    {
        var entity = new CustomerInteractionMemory
        {
            MerchantId            = merchantId,
            CustomerEmail         = dto.CustomerEmail,
            CustomerName          = dto.CustomerName,
            InteractionType       = dto.InteractionType,
            Platform              = dto.Platform,
            Message               = dto.Message,
            AiInterpretation      = dto.AiInterpretation,
            Sentiment             = dto.Sentiment,
            NextRecommendedAction = dto.NextRecommendedAction,
            ObjectionType         = dto.ObjectionType,
            ReEngageDaysDelay     = dto.ReEngageDaysDelay,
        };
        db.CustomerInteractionMemories.Add(entity);
        await db.SaveChangesAsync();
        return dto with { Id = entity.Id };
    }

    public async Task DeleteInteractionAsync(Guid id, Guid merchantId)
    {
        var entity = await db.CustomerInteractionMemories
            .FirstOrDefaultAsync(c => c.Id == id && c.MerchantId == merchantId);
        if (entity is null) return;
        db.CustomerInteractionMemories.Remove(entity);
        await db.SaveChangesAsync();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private static AgentDto ToDto(AgentDefinition a) =>
        new(a.Id, a.MerchantId, a.AgentName, a.AgentType, a.ParentAgentType, a.Description,
            a.IsEnabled, a.ScheduleExpression, a.Timezone, a.ApprovalMode,
            a.MaxRetries, a.ConfigurationJson, a.CreatedAt, a.UpdatedAt, StatusSummary: null);

    private static AgentExecutionDto ToExecDto(AgentExecutionHistory e) =>
        new(e.Id, e.AgentId, AgentName: null!, e.ExecutionStatus, e.StartedAt,
            e.CompletedAt, e.InputJson, e.OutputJson, e.ValidationResultJson,
            e.ErrorDetails, e.RetryCount, e.StepLogJson, e.TriggerType);
}
