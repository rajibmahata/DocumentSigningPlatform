using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IWorkflowService
{
    // Definitions
    Task<WorkflowDefinitionDto> CreateAsync(Guid merchantId, string createdBy, CreateWorkflowRequest req, CancellationToken ct = default);
    Task<WorkflowDefinitionDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<List<WorkflowSummaryDto>> ListAsync(Guid merchantId, CancellationToken ct = default);
    Task<List<WorkflowSummaryDto>> ListTemplatesAsync(CancellationToken ct = default);
    Task<WorkflowDefinitionDto> UpdateAsync(Guid id, UpdateWorkflowRequest req, CancellationToken ct = default);
    Task PublishAsync(Guid id, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<WorkflowDefinitionDto> CloneFromTemplateAsync(Guid templateId, Guid merchantId, string createdBy, CancellationToken ct = default);

    // Execution
    Task<WorkflowInstanceDto> TriggerAsync(Guid definitionId, string triggeredBy, TriggerWorkflowRequest req, CancellationToken ct = default);
    Task<WorkflowInstanceDto?> GetInstanceAsync(Guid instanceId, CancellationToken ct = default);
    Task<List<WorkflowInstanceDto>> GetInstancesByDefinitionIdAsync(Guid definitionId, CancellationToken ct = default);
    Task<List<WorkflowInstanceDto>> ListInstancesAsync(Guid merchantId, CancellationToken ct = default);
    Task CancelInstanceAsync(Guid instanceId, CancellationToken ct = default);

    // Stats
    Task<WorkflowStatsDto> GetStatsAsync(Guid merchantId, CancellationToken ct = default);
}
