using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.DTOs;

// ── Requests ─────────────────────────────────────────────────────────────────

public record CreateWorkflowRequest(
    string Name,
    string? Description,
    string? Category,
    string? JsonDefinition);

public record UpdateWorkflowRequest(
    string Name,
    string? Description,
    string? Category,
    string JsonDefinition);

public record TriggerWorkflowRequest(
    Guid?  EnvelopeId,
    string? ContextJson);

// ── Responses ─────────────────────────────────────────────────────────────────

public record WorkflowDefinitionDto(
    Guid   Id,
    Guid   MerchantId,
    string Name,
    string? Description,
    int    Version,
    string JsonDefinition,
    string Status,
    bool   IsTemplate,
    string? TemplateName,
    string? Category,
    string? CreatedBy,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int    InstanceCount);

public record WorkflowSummaryDto(
    Guid   Id,
    string Name,
    string? Description,
    int    Version,
    string Status,
    bool   IsTemplate,
    string? Category,
    int    InstanceCount,
    DateTime UpdatedAt);

public record WorkflowInstanceDto(
    Guid   Id,
    Guid   WorkflowDefinitionId,
    string WorkflowName,
    string Status,
    string? CurrentNodeId,
    Guid?  EnvelopeId,
    string? TriggeredBy,
    string? ErrorMessage,
    DateTime StartedAt,
    DateTime? CompletedAt,
    IReadOnlyList<NodeExecutionDto> NodeExecutions);

public record NodeExecutionDto(
    Guid   Id,
    string NodeId,
    string NodeType,
    string NodeLabel,
    string Status,
    string? OutputJson,
    string? ErrorMessage,
    DateTime StartedAt,
    DateTime? CompletedAt);

public record WorkflowStatsDto(
    int TotalWorkflows,
    int PublishedWorkflows,
    int RunningInstances,
    int CompletedInstances,
    int FailedInstances);
