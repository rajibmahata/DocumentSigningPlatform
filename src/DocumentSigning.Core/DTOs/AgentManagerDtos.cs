namespace DocumentSigning.Core.DTOs;

// ── Agent Manager DTOs ────────────────────────────────────────────────────────

// ── Agent Presets ─────────────────────────────────────────────────────────────

/// <summary>A ready-made agent configuration template the user can provision with one click.</summary>
public record AgentPresetDto(
    string   PresetId,
    string   Category,
    string   AgentType,
    string   Name,
    string   Description,
    string   Icon,
    string   Complexity,
    string?  ScheduleExpression,
    string   Timezone,
    string   ApprovalMode,
    int      MaxRetries,
    string   ConfigurationJson,
    string   WorkflowStepsJson,
    string[] Tags
);

public record ProvisionPresetRequest(string PresetId);
public record ProvisionedPresetDto(AgentDto Agent, AgentWorkflowDto Workflow);

public record AgentDto(
    Guid    Id,
    Guid    MerchantId,
    string  AgentName,
    string  AgentType,
    string? ParentAgentType,
    string? Description,
    bool    IsEnabled,
    string? ScheduleExpression,
    string  Timezone,
    string  ApprovalMode,
    int     MaxRetries,
    string? ConfigurationJson,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    AgentStatusSummaryDto? StatusSummary
);

public record AgentStatusSummaryDto(
    string   LastStatus,
    DateTime? LastRunAt,
    DateTime? NextRunAt,
    int      TotalRuns,
    int      SuccessRuns,
    int      FailedRuns
);

public record AgentWorkflowDto(
    Guid   Id,
    Guid   AgentId,
    string WorkflowName,
    string StepsJson,
    bool   IsEnabled,
    DateTime CreatedAt
);

public record AgentExecutionDto(
    Guid     Id,
    Guid     AgentId,
    string   AgentName,
    string   ExecutionStatus,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string?  InputJson,
    string?  OutputJson,
    string?  ValidationResultJson,
    string?  ErrorDetails,
    int      RetryCount,
    string?  StepLogJson,
    string   TriggerType
);

public record AgentMemoryDto(
    Guid   Id,
    Guid   AgentId,
    string ContextType,
    string ContextKey,
    string ContextValue,
    DateTime UpdatedAt
);

public record CustomerInteractionDto(
    Guid    Id,
    string  CustomerEmail,
    string? CustomerName,
    string  InteractionType,
    string  Platform,
    string  Message,
    string? AiInterpretation,
    string  Sentiment,
    string? NextRecommendedAction,
    string? ObjectionType,
    int     ReEngageDaysDelay,
    DateTime CreatedAt
);

// ── Blog DTOs ─────────────────────────────────────────────────────────────────

public record BlogDto(
    Guid    Id,
    Guid    MerchantId,
    string  Title,
    string  Slug,
    string  Content,
    string? MetaDescription,
    string? Keywords,
    string? Tags,
    string? Category,
    string? CoverImageUrl,
    string  Status,
    DateTime? PublishedAt,
    string  CreatedByAgent,
    int     ViewCount,
    string? SeoScore,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record BlogSummaryDto(
    Guid    Id,
    string  Title,
    string  Slug,
    string? Category,
    string? Tags,
    string? CoverImageUrl,
    string  Status,
    DateTime? PublishedAt,
    string  CreatedByAgent,
    int     ViewCount,
    string? MetaDescription,
    DateTime CreatedAt
);

public record BlogCategoryDto(string Name, string Slug, int PostCount);

// ── Validation Result ─────────────────────────────────────────────────────────

public record ValidationResult(
    bool    Passed,
    int     QualityScore,
    bool    BrandCompliant,
    bool    ToneValid,
    bool    LegallyCompliant,
    float   SpamRiskScore,
    bool    HallucinationFree,
    string  OverallDecision,        // approve | reject | rewrite
    string? Feedback,
    string? RewriteSuggestion
);

// ── Agent Execution Input/Output ──────────────────────────────────────────────

public record AgentExecutionInput(
    Guid    MerchantId,
    Guid    AgentId,
    string  AgentType,
    string? Prompt,
    string? ContextJson,
    string  TriggerType = "manual"
);

public record AgentExecutionOutput(
    bool             Success,
    string?          Content,
    string?          OutputJson,
    ValidationResult? Validation,
    string?          Error
);

// ── Create/Update requests ────────────────────────────────────────────────────

public record CreateAgentRequest(
    string  AgentName,
    string  AgentType,
    string? ParentAgentType,
    string? Description,
    string? ScheduleExpression,
    string  Timezone,
    string  ApprovalMode,
    int     MaxRetries,
    string? ConfigurationJson
);

public record UpdateAgentRequest(
    string  AgentName,
    string? Description,
    bool    IsEnabled,
    string? ScheduleExpression,
    string  Timezone,
    string  ApprovalMode,
    int     MaxRetries,
    string? ConfigurationJson
);

public record CreateBlogRequest(
    string  Title,
    string  Content,
    string? MetaDescription,
    string? Keywords,
    string? Tags,
    string? Category,
    string? CoverImageUrl,
    string  Status
);

public record UpdateBlogRequest(
    string  Title,
    string  Content,
    string? MetaDescription,
    string? Keywords,
    string? Tags,
    string? Category,
    string? CoverImageUrl,
    string  Status
);

public record GenerateBlogRequest(
    string  Topic,
    string? Keywords,
    string? TargetAudience,
    string? Tone
);
