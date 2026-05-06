using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IWorkflowRepository
{
    // Definitions
    Task<WorkflowDefinition?> GetDefinitionByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WorkflowDefinition>> GetDefinitionsByMerchantAsync(Guid merchantId, CancellationToken ct = default);
    Task<List<WorkflowDefinition>> GetTemplatesAsync(CancellationToken ct = default);
    Task AddDefinitionAsync(WorkflowDefinition def, CancellationToken ct = default);
    Task UpdateDefinitionAsync(WorkflowDefinition def, CancellationToken ct = default);
    Task DeleteDefinitionAsync(Guid id, CancellationToken ct = default);
    Task<int> CountInstancesAsync(Guid definitionId, CancellationToken ct = default);

    // Instances
    Task<WorkflowInstance?> GetInstanceByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WorkflowInstance>> GetInstancesByDefinitionAsync(Guid definitionId, CancellationToken ct = default);
    Task<List<WorkflowInstance>> GetInstancesByMerchantAsync(Guid merchantId, CancellationToken ct = default);
    Task AddInstanceAsync(WorkflowInstance instance, CancellationToken ct = default);
    Task UpdateInstanceAsync(WorkflowInstance instance, CancellationToken ct = default);

    // Node executions
    Task AddNodeExecutionAsync(WorkflowNodeExecution exec, CancellationToken ct = default);
    Task UpdateNodeExecutionAsync(WorkflowNodeExecution exec, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
