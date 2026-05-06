using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class WorkflowRepository : IWorkflowRepository
{
    private readonly AppDbContext _db;
    public WorkflowRepository(AppDbContext db) => _db = db;

    // ── Definitions ───────────────────────────────────────────────────────────

    public Task<WorkflowDefinition?> GetDefinitionByIdAsync(Guid id, CancellationToken ct = default)
        => _db.WorkflowDefinitions
              .Include(d => d.Triggers)
              .FirstOrDefaultAsync(d => d.Id == id, ct);

    public Task<List<WorkflowDefinition>> GetDefinitionsByMerchantAsync(Guid merchantId, CancellationToken ct = default)
        => _db.WorkflowDefinitions
              .Where(d => d.MerchantId == merchantId)
              .OrderByDescending(d => d.UpdatedAt)
              .ToListAsync(ct);

    public Task<List<WorkflowDefinition>> GetTemplatesAsync(CancellationToken ct = default)
        => _db.WorkflowDefinitions
              .Where(d => d.IsTemplate)
              .OrderBy(d => d.Category).ThenBy(d => d.Name)
              .ToListAsync(ct);

    public async Task AddDefinitionAsync(WorkflowDefinition def, CancellationToken ct = default)
        => await _db.WorkflowDefinitions.AddAsync(def, ct);

    public Task UpdateDefinitionAsync(WorkflowDefinition def, CancellationToken ct = default)
    {
        _db.WorkflowDefinitions.Update(def);
        return Task.CompletedTask;
    }

    public async Task DeleteDefinitionAsync(Guid id, CancellationToken ct = default)
    {
        var def = await _db.WorkflowDefinitions.FindAsync([id], ct);
        if (def is not null) _db.WorkflowDefinitions.Remove(def);
    }

    public Task<int> CountInstancesAsync(Guid definitionId, CancellationToken ct = default)
        => _db.WorkflowInstances.CountAsync(i => i.WorkflowDefinitionId == definitionId, ct);

    // ── Instances ─────────────────────────────────────────────────────────────

    public Task<WorkflowInstance?> GetInstanceByIdAsync(Guid id, CancellationToken ct = default)
        => _db.WorkflowInstances
              .Include(i => i.NodeExecutions)
              .Include(i => i.Definition)
              .FirstOrDefaultAsync(i => i.Id == id, ct);

    public Task<List<WorkflowInstance>> GetInstancesByDefinitionAsync(Guid definitionId, CancellationToken ct = default)
        => _db.WorkflowInstances
              .Where(i => i.WorkflowDefinitionId == definitionId)
              .OrderByDescending(i => i.StartedAt)
              .ToListAsync(ct);

    public Task<List<WorkflowInstance>> GetInstancesByMerchantAsync(Guid merchantId, CancellationToken ct = default)
        => _db.WorkflowInstances
              .Include(i => i.Definition)
              .Include(i => i.NodeExecutions)
              .Where(i => i.Definition != null && i.Definition.MerchantId == merchantId)
              .OrderByDescending(i => i.StartedAt)
              .Take(200)
              .ToListAsync(ct);

    public async Task AddInstanceAsync(WorkflowInstance instance, CancellationToken ct = default)
        => await _db.WorkflowInstances.AddAsync(instance, ct);

    public Task UpdateInstanceAsync(WorkflowInstance instance, CancellationToken ct = default)
    {
        _db.WorkflowInstances.Update(instance);
        return Task.CompletedTask;
    }

    // ── Node executions ───────────────────────────────────────────────────────

    public async Task AddNodeExecutionAsync(WorkflowNodeExecution exec, CancellationToken ct = default)
        => await _db.WorkflowNodeExecutions.AddAsync(exec, ct);

    public Task UpdateNodeExecutionAsync(WorkflowNodeExecution exec, CancellationToken ct = default)
    {
        _db.WorkflowNodeExecutions.Update(exec);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
