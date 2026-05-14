using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

// ── Agent Orchestrator ────────────────────────────────────────────────────────

public interface IAgentOrchestrator
{
    /// <summary>Execute a single agent by ID (manual trigger).</summary>
    Task<AgentExecutionOutput> ExecuteAgentAsync(Guid agentId, Guid merchantId, string triggerType = "manual", CancellationToken ct = default);

    /// <summary>Execute all due scheduled agents for all merchants.</summary>
    Task ExecuteScheduledAgentsAsync(CancellationToken ct = default);

    /// <summary>Retry a failed execution.</summary>
    Task<AgentExecutionOutput> RetryExecutionAsync(Guid executionId, CancellationToken ct = default);

    /// <summary>Cancel a running execution.</summary>
    Task CancelExecutionAsync(Guid executionId, CancellationToken ct = default);

    /// <summary>Approve a pending-approval execution so it can proceed/publish.</summary>
    Task ApproveExecutionAsync(Guid executionId, CancellationToken ct = default);
}

// ── Agent Runtime ────────────────────────────────────────────────────────────

public interface IAgentRuntime
{
    Task<AgentExecutionOutput> RunAsync(AgentExecutionInput input, CancellationToken ct = default);
}

// ── Agent Manager (CRUD) ──────────────────────────────────────────────────────

public interface IAgentManagerService
{
    Task<List<AgentDto>>          GetAgentsAsync(Guid merchantId);
    Task<AgentDto?>               GetAgentAsync(Guid id, Guid merchantId);
    Task<AgentDto>                CreateAgentAsync(Guid merchantId, CreateAgentRequest req);
    Task                          UpdateAgentAsync(Guid id, Guid merchantId, UpdateAgentRequest req);
    Task                          DeleteAgentAsync(Guid id, Guid merchantId);
    Task                          ToggleAgentAsync(Guid id, Guid merchantId, bool enabled);
    Task<List<AgentWorkflowDto>>  GetWorkflowsAsync(Guid agentId);
    Task<List<AgentExecutionDto>> GetExecutionHistoryAsync(Guid agentId, int limit = 50);
    Task<List<AgentExecutionDto>> GetAllExecutionsAsync(Guid merchantId, int limit = 100);
    Task<List<AgentMemoryDto>>    GetMemoriesAsync(Guid agentId);
    Task                          UpsertMemoryAsync(Guid agentId, Guid merchantId, string contextType, string contextKey, string contextValue);
    Task<List<CustomerInteractionDto>> GetCustomerInteractionsAsync(Guid merchantId, string? email = null);
    Task<CustomerInteractionDto>  RecordInteractionAsync(Guid merchantId, CustomerInteractionDto dto);
    Task                           DeleteInteractionAsync(Guid id, Guid merchantId);

    // Presets
    List<AgentPresetDto>          GetAllPresets();
    AgentPresetDto?               GetPreset(string presetId);
    Task<ProvisionedPresetDto>    ProvisionPresetAsync(Guid merchantId, string presetId);
}

// ── Blog Service ──────────────────────────────────────────────────────────────

public interface IBlogService
{
    // Admin (merchant-scoped)
    Task<List<BlogSummaryDto>> GetBlogsAsync(Guid merchantId, string? status = null, string? category = null);
    Task<BlogDto?>             GetBlogAsync(Guid id, Guid merchantId);
    Task<BlogDto?>             GetBlogBySlugAsync(string slug, Guid merchantId);
    Task<BlogDto>              CreateBlogAsync(Guid merchantId, CreateBlogRequest req, string createdBy = "user");
    Task<BlogDto>              UpdateBlogAsync(Guid id, Guid merchantId, UpdateBlogRequest req);
    Task<string?>               DeleteBlogAsync(Guid id, Guid merchantId);
    Task<BlogDto>              PublishBlogAsync(Guid id, Guid merchantId);
    Task<BlogDto>              UnpublishBlogAsync(Guid id, Guid merchantId);
    Task<BlogDto>              GenerateBlogWithAiAsync(Guid merchantId, GenerateBlogRequest req);

    // Public (no merchant filter)
    Task<List<BlogSummaryDto>> GetPublicBlogsAsync(string? category = null, int page = 1, int pageSize = 12);
    Task<BlogDto?>             GetPublicBlogBySlugAsync(string slug);
    Task<List<BlogSummaryDto>> GetTrendingBlogsAsync(int count = 6);
    Task<List<BlogSummaryDto>> GetRelatedBlogsAsync(string slug, int count = 4);
    Task<List<BlogCategoryDto>> GetCategoriesAsync();
    Task                        IncrementViewCountAsync(string slug);
}

// ── Validation Pipeline ───────────────────────────────────────────────────────

public interface IValidationPipeline
{
    Task<ValidationResult> ValidateAsync(string content, string contentType, string? brandVoice = null, CancellationToken ct = default);
}

// ── Specialized Agents ────────────────────────────────────────────────────────

public interface ISpecializedAgent
{
    string AgentType { get; }
    Task<AgentExecutionOutput> ExecuteAsync(AgentExecutionInput input, CancellationToken ct = default);
}
