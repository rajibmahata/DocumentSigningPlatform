using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Workflow service — CRUD for definitions + in-process step-by-step execution engine.
/// Each node is executed sequentially in the order defined by edges (source → target).
/// </summary>
public sealed class WorkflowService : IWorkflowService
{
    private readonly IWorkflowRepository _repo;

    public WorkflowService(IWorkflowRepository repo)
    {
        _repo = repo;
    }

    // ── Definitions ───────────────────────────────────────────────────────────

    public async Task<WorkflowDefinitionDto> CreateAsync(
        Guid merchantId, string createdBy, CreateWorkflowRequest req, CancellationToken ct = default)
    {
        var def = new WorkflowDefinition
        {
            MerchantId     = merchantId,
            Name           = req.Name,
            Description    = req.Description,
            Category       = req.Category,
            JsonDefinition = req.JsonDefinition ?? """{"nodes":[],"edges":[],"variables":[],"settings":{}}""",
            CreatedBy      = createdBy,
            Status         = WorkflowStatus.Draft,
        };
        await _repo.AddDefinitionAsync(def, ct);
        await _repo.SaveChangesAsync(ct);
        return MapDef(def, 0);
    }

    public async Task<WorkflowDefinitionDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var def = await _repo.GetDefinitionByIdAsync(id, ct);
        if (def is null) return null;
        var count = await _repo.CountInstancesAsync(id, ct);
        return MapDef(def, count);
    }

    public async Task<List<WorkflowSummaryDto>> ListAsync(Guid merchantId, CancellationToken ct = default)
    {
        var defs = await _repo.GetDefinitionsByMerchantAsync(merchantId, ct);
        var result = new List<WorkflowSummaryDto>(defs.Count);
        foreach (var d in defs)
        {
            var count = await _repo.CountInstancesAsync(d.Id, ct);
            result.Add(MapSummary(d, count));
        }
        return result;
    }

    public async Task<List<WorkflowSummaryDto>> ListTemplatesAsync(CancellationToken ct = default)
    {
        var templates = await _repo.GetTemplatesAsync(ct);
        return templates.Select(t => MapSummary(t, 0)).ToList();
    }

    public async Task<WorkflowDefinitionDto> UpdateAsync(Guid id, UpdateWorkflowRequest req, CancellationToken ct = default)
    {
        var def = await _repo.GetDefinitionByIdAsync(id, ct)
                  ?? throw new KeyNotFoundException($"Workflow {id} not found");

        def.Name           = req.Name;
        def.Description    = req.Description;
        def.Category       = req.Category;
        def.JsonDefinition = req.JsonDefinition;
        def.UpdatedAt      = DateTime.UtcNow;

        await _repo.UpdateDefinitionAsync(def, ct);
        await _repo.SaveChangesAsync(ct);

        var count = await _repo.CountInstancesAsync(id, ct);
        return MapDef(def, count);
    }

    public async Task PublishAsync(Guid id, CancellationToken ct = default)
    {
        var def = await _repo.GetDefinitionByIdAsync(id, ct)
                  ?? throw new KeyNotFoundException($"Workflow {id} not found");

        def.Status    = WorkflowStatus.Published;
        def.Version  += 1;
        def.UpdatedAt = DateTime.UtcNow;

        await _repo.UpdateDefinitionAsync(def, ct);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await _repo.DeleteDefinitionAsync(id, ct);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task<WorkflowDefinitionDto> CloneFromTemplateAsync(
        Guid templateId, Guid merchantId, string createdBy, CancellationToken ct = default)
    {
        var template = await _repo.GetDefinitionByIdAsync(templateId, ct)
                       ?? throw new KeyNotFoundException($"Template {templateId} not found");

        var clone = new WorkflowDefinition
        {
            MerchantId     = merchantId,
            Name           = template.Name,
            Description    = template.Description,
            Category       = template.Category,
            JsonDefinition = template.JsonDefinition,
            CreatedBy      = createdBy,
            Status         = WorkflowStatus.Draft,
            IsTemplate     = false,
        };
        await _repo.AddDefinitionAsync(clone, ct);
        await _repo.SaveChangesAsync(ct);
        return MapDef(clone, 0);
    }

    // ── Execution engine ──────────────────────────────────────────────────────

    public async Task<WorkflowInstanceDto> TriggerAsync(
        Guid definitionId, string triggeredBy, TriggerWorkflowRequest req, CancellationToken ct = default)
    {
        var def = await _repo.GetDefinitionByIdAsync(definitionId, ct)
                  ?? throw new KeyNotFoundException($"Workflow {definitionId} not found");

        if (def.Status != WorkflowStatus.Published)
            throw new InvalidOperationException("Only published workflows can be triggered.");

        var instance = new WorkflowInstance
        {
            WorkflowDefinitionId = definitionId,
            EnvelopeId           = req.EnvelopeId,
            TriggeredBy          = triggeredBy,
            ContextJson          = req.ContextJson,
            Status               = WorkflowInstanceStatus.Running,
        };
        await _repo.AddInstanceAsync(instance, ct);
        await _repo.SaveChangesAsync(ct);

        // Execute nodes from definition JSON
        _ = ExecuteWorkflowAsync(instance, def.JsonDefinition, CancellationToken.None);

        return await BuildInstanceDtoAsync(instance, def.Name);
    }

    /// <summary>Step-through execution: walks nodes in edge order.</summary>
    private async Task ExecuteWorkflowAsync(WorkflowInstance instance, string jsonDefinition, CancellationToken ct)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonDefinition);
            var root  = doc.RootElement;

            var nodes = root.TryGetProperty("nodes", out var n) ? n : default;
            var edges = root.TryGetProperty("edges", out var e) ? e : default;

            if (nodes.ValueKind != JsonValueKind.Array) { await MarkInstanceDoneAsync(instance, WorkflowInstanceStatus.Completed, null, ct); return; }

            // Build adjacency: source nodeId → target nodeId
            var next = new Dictionary<string, string>();
            if (edges.ValueKind == JsonValueKind.Array)
                foreach (var edge in edges.EnumerateArray())
                    if (edge.TryGetProperty("source", out var src) && edge.TryGetProperty("target", out var tgt))
                        next[src.GetString()!] = tgt.GetString()!;

            // Build node lookup
            var nodeMap = new Dictionary<string, JsonElement>();
            foreach (var node in nodes.EnumerateArray())
                if (node.TryGetProperty("id", out var nid))
                    nodeMap[nid.GetString()!] = node;

            // Find start node
            var currentId = nodeMap.Keys.FirstOrDefault(k =>
            {
                if (!nodeMap.TryGetValue(k, out var nd)) return false;
                if (nd.TryGetProperty("type", out var t))
                    return t.GetString() == "start";
                return false;
            }) ?? nodeMap.Keys.FirstOrDefault();

            if (currentId is null) { await MarkInstanceDoneAsync(instance, WorkflowInstanceStatus.Completed, null, ct); return; }

            var visited = new HashSet<string>();

            while (currentId is not null && !visited.Contains(currentId))
            {
                visited.Add(currentId);
                if (!nodeMap.TryGetValue(currentId, out var currentNode)) break;

                var nodeType  = currentNode.TryGetProperty("type",  out var tp) ? (tp.GetString() ?? "unknown") : "unknown";
                var nodeLabel = currentNode.TryGetProperty("data",  out var da) && da.TryGetProperty("label", out var lb)
                                ? (lb.GetString() ?? nodeType) : nodeType;

                var exec = new WorkflowNodeExecution
                {
                    WorkflowInstanceId = instance.Id,
                    NodeId             = currentId,
                    NodeType           = nodeType,
                    NodeLabel          = nodeLabel,
                    Status             = NodeExecutionStatus.Running,
                };

                // Update instance current node
                instance.CurrentNodeId = currentId;
                await _repo.UpdateInstanceAsync(instance, ct);
                await _repo.AddNodeExecutionAsync(exec, ct);
                await _repo.SaveChangesAsync(ct);

                // Simulate node execution (configurable delay per type)
                await Task.Delay(SimulatedDelayMs(nodeType), ct);

                exec.Status      = NodeExecutionStatus.Completed;
                exec.CompletedAt = DateTime.UtcNow;
                exec.OutputJson  = $@"{{""nodeId"":""{currentId}"",""nodeType"":""{nodeType}"",""executedAt"":""{DateTime.UtcNow:O}""}}";

                await _repo.UpdateNodeExecutionAsync(exec, ct);
                await _repo.SaveChangesAsync(ct);

                // Move to next node
                next.TryGetValue(currentId, out currentId);
            }

            await MarkInstanceDoneAsync(instance, WorkflowInstanceStatus.Completed, null, ct);
        }
        catch (Exception ex)
        {
            await MarkInstanceDoneAsync(instance, WorkflowInstanceStatus.Failed, ex.Message, ct);
        }
    }

    private static int SimulatedDelayMs(string nodeType) => nodeType switch
    {
        "delay"    => 500,
        "approval" => 0,   // would wait for human input in full impl
        _          => 100,
    };

    private async Task MarkInstanceDoneAsync(WorkflowInstance instance, WorkflowInstanceStatus status, string? error, CancellationToken ct)
    {
        instance.Status      = status;
        instance.ErrorMessage = error;
        instance.CompletedAt = DateTime.UtcNow;
        instance.CurrentNodeId = null;
        await _repo.UpdateInstanceAsync(instance, ct);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task<WorkflowInstanceDto?> GetInstanceAsync(Guid instanceId, CancellationToken ct = default)
    {
        var inst = await _repo.GetInstanceByIdAsync(instanceId, ct);
        if (inst is null) return null;
        return await BuildInstanceDtoAsync(inst, inst.Definition?.Name ?? "");
    }

    public async Task<List<WorkflowInstanceDto>> GetInstancesByDefinitionIdAsync(Guid definitionId, CancellationToken ct = default)
    {
        var instances = await _repo.GetInstancesByDefinitionAsync(definitionId, ct);
        var result = new List<WorkflowInstanceDto>(instances.Count);
        foreach (var inst in instances)
            result.Add(await BuildInstanceDtoAsync(inst, inst.Definition?.Name ?? ""));
        return result;
    }

    public async Task<List<WorkflowInstanceDto>> ListInstancesAsync(Guid merchantId, CancellationToken ct = default)
    {
        var instances = await _repo.GetInstancesByMerchantAsync(merchantId, ct);
        var result = new List<WorkflowInstanceDto>(instances.Count);
        foreach (var inst in instances)
            result.Add(await BuildInstanceDtoAsync(inst, inst.Definition?.Name ?? ""));
        return result;
    }

    public async Task CancelInstanceAsync(Guid instanceId, CancellationToken ct = default)
    {
        var inst = await _repo.GetInstanceByIdAsync(instanceId, ct)
                   ?? throw new KeyNotFoundException($"Instance {instanceId} not found");
        inst.Status      = WorkflowInstanceStatus.Cancelled;
        inst.CompletedAt = DateTime.UtcNow;
        await _repo.UpdateInstanceAsync(inst, ct);
        await _repo.SaveChangesAsync(ct);
    }

    public async Task<WorkflowStatsDto> GetStatsAsync(Guid merchantId, CancellationToken ct = default)
    {
        var defs      = await _repo.GetDefinitionsByMerchantAsync(merchantId, ct);
        var instances = await _repo.GetInstancesByMerchantAsync(merchantId, ct);

        return new WorkflowStatsDto(
            TotalWorkflows:      defs.Count,
            PublishedWorkflows:  defs.Count(d => d.Status == WorkflowStatus.Published),
            RunningInstances:    instances.Count(i => i.Status == WorkflowInstanceStatus.Running),
            CompletedInstances:  instances.Count(i => i.Status == WorkflowInstanceStatus.Completed),
            FailedInstances:     instances.Count(i => i.Status == WorkflowInstanceStatus.Failed));
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private static WorkflowDefinitionDto MapDef(WorkflowDefinition d, int count) =>
        new(d.Id, d.MerchantId, d.Name, d.Description, d.Version,
            d.JsonDefinition, d.Status.ToString(), d.IsTemplate,
            d.TemplateName, d.Category, d.CreatedBy, d.CreatedAt, d.UpdatedAt, count);

    private static WorkflowSummaryDto MapSummary(WorkflowDefinition d, int count) =>
        new(d.Id, d.Name, d.Description, d.Version, d.Status.ToString(),
            d.IsTemplate, d.Category, count, d.UpdatedAt);

    private static Task<WorkflowInstanceDto> BuildInstanceDtoAsync(WorkflowInstance inst, string workflowName)
    {
        var dto = new WorkflowInstanceDto(
            inst.Id, inst.WorkflowDefinitionId, workflowName,
            inst.Status.ToString(), inst.CurrentNodeId, inst.EnvelopeId,
            inst.TriggeredBy, inst.ErrorMessage, inst.StartedAt, inst.CompletedAt,
            inst.NodeExecutions.OrderBy(n => n.StartedAt)
                .Select(n => new NodeExecutionDto(
                    n.Id, n.NodeId, n.NodeType, n.NodeLabel,
                    n.Status.ToString(), n.OutputJson, n.ErrorMessage,
                    n.StartedAt, n.CompletedAt))
                .ToList());
        return Task.FromResult(dto);
    }
}
