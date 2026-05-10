using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/agent-manager")]
[Authorize]
[Produces("application/json")]
public class AgentManagerController : ControllerBase
{
    private readonly IAgentManagerService _svc;
    private readonly IAgentOrchestrator   _orchestrator;
    private readonly IMerchantRepository  _merchantRepo;

    public AgentManagerController(
        IAgentManagerService svc,
        IAgentOrchestrator   orchestrator,
        IMerchantRepository  merchantRepo)
    {
        _svc          = svc;
        _orchestrator = orchestrator;
        _merchantRepo = merchantRepo;
    }

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("No user identity claim."));

    private async Task<Guid> GetMerchantIdAsync(CancellationToken ct = default)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(UserId, ct);
        var merchant  = merchants.FirstOrDefault()
            ?? throw new UnauthorizedAccessException("No merchant account found for this user.");
        return merchant.Id;
    }

    // ── Agents ────────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAgents(CancellationToken ct)
        => Ok(await _svc.GetAgentsAsync(await GetMerchantIdAsync(ct)));

    [HttpPost]
    public async Task<IActionResult> CreateAgent([FromBody] CreateAgentRequest req, CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        var agent = await _svc.CreateAgentAsync(merchantId, req);
        return CreatedAtAction(nameof(GetAgent), new { id = agent.Id }, agent);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAgent(Guid id, CancellationToken ct)
    {
        var agent = await _svc.GetAgentAsync(id, await GetMerchantIdAsync(ct));
        return agent is null ? NotFound() : Ok(agent);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAgent(Guid id, [FromBody] UpdateAgentRequest req, CancellationToken ct)
    {
        await _svc.UpdateAgentAsync(id, await GetMerchantIdAsync(ct), req);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAgent(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAgentAsync(id, await GetMerchantIdAsync(ct));
        return NoContent();
    }

    [HttpPatch("{id:guid}/toggle")]
    public async Task<IActionResult> ToggleAgent(Guid id, [FromQuery] bool enabled, CancellationToken ct)
    {
        await _svc.ToggleAgentAsync(id, await GetMerchantIdAsync(ct), enabled);
        return NoContent();
    }

    // ── Workflows & Execution History ─────────────────────────────────────────

    [HttpGet("{id:guid}/workflows")]
    public async Task<IActionResult> GetWorkflows(Guid id)
        => Ok(await _svc.GetWorkflowsAsync(id));

    [HttpGet("{id:guid}/executions")]
    public async Task<IActionResult> GetExecutionHistory(Guid id, [FromQuery] int limit = 50)
        => Ok(await _svc.GetExecutionHistoryAsync(id, limit));

    [HttpGet("executions")]
    public async Task<IActionResult> GetAllExecutions([FromQuery] int limit = 100, CancellationToken ct = default)
        => Ok(await _svc.GetAllExecutionsAsync(await GetMerchantIdAsync(ct), limit));

    // ── Memories ──────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/memories")]
    public async Task<IActionResult> GetMemories(Guid id)
        => Ok(await _svc.GetMemoriesAsync(id));

    [HttpPost("{id:guid}/memories")]
    public async Task<IActionResult> UpsertMemory(Guid id, [FromBody] UpsertMemoryRequest req, CancellationToken ct)
    {
        await _svc.UpsertMemoryAsync(id, await GetMerchantIdAsync(ct), req.ContextType, req.ContextKey, req.ContextValue);
        return NoContent();
    }

    // ── Execute ───────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/execute")]
    public async Task<IActionResult> ExecuteAgent(Guid id, [FromQuery] string triggerType = "manual", CancellationToken ct = default)
    {
        var result = await _orchestrator.ExecuteAgentAsync(id, await GetMerchantIdAsync(ct), triggerType);
        return Ok(result);
    }

    [HttpPost("executions/{execId:guid}/retry")]
    public async Task<IActionResult> RetryExecution(Guid execId)
    {
        var result = await _orchestrator.RetryExecutionAsync(execId);
        return Ok(result);
    }

    [HttpPost("executions/{execId:guid}/cancel")]
    public async Task<IActionResult> CancelExecution(Guid execId)
    {
        await _orchestrator.CancelExecutionAsync(execId);
        return NoContent();
    }

    [HttpPost("executions/{execId:guid}/approve")]
    public async Task<IActionResult> ApproveExecution(Guid execId)
    {
        await _orchestrator.ApproveExecutionAsync(execId);
        return NoContent();
    }

    // ── Customer Interactions ─────────────────────────────────────────────────

    [HttpGet("customer-interactions")]
    public async Task<IActionResult> GetCustomerInteractions([FromQuery] string? email = null, CancellationToken ct = default)
        => Ok(await _svc.GetCustomerInteractionsAsync(await GetMerchantIdAsync(ct), email));

    [HttpPost("customer-interactions")]
    public async Task<IActionResult> RecordInteraction([FromBody] CustomerInteractionDto dto, CancellationToken ct)
    {
        var result = await _svc.RecordInteractionAsync(await GetMerchantIdAsync(ct), dto);
        return Ok(result);
    }

    [HttpDelete("customer-interactions/{id:guid}")]
    public async Task<IActionResult> DeleteInteraction(Guid id, CancellationToken ct)
    {
        await _svc.DeleteInteractionAsync(id, await GetMerchantIdAsync(ct));
        return NoContent();
    }

    // ── Presets ───────────────────────────────────────────────────────────────

    /// <summary>Returns all predefined agent configuration presets (no auth required for browsing).</summary>
    [HttpGet("presets")]
    [AllowAnonymous]
    public IActionResult GetPresets([FromQuery] string? category = null)
    {
        var all = _svc.GetAllPresets();
        if (!string.IsNullOrWhiteSpace(category))
            all = all.Where(p => string.Equals(p.Category, category, StringComparison.OrdinalIgnoreCase)).ToList();
        return Ok(all);
    }

    /// <summary>Returns a single preset by its ID.</summary>
    [HttpGet("presets/{presetId}")]
    [AllowAnonymous]
    public IActionResult GetPreset(string presetId)
    {
        var preset = _svc.GetPreset(presetId);
        return preset is null ? NotFound() : Ok(preset);
    }

    /// <summary>Provisions a preset: creates the AgentDefinition + default Workflow for the authenticated merchant.</summary>
    [HttpPost("presets/{presetId}/provision")]
    public async Task<IActionResult> ProvisionPreset(string presetId, CancellationToken ct)
    {
        try
        {
            var merchantId = await GetMerchantIdAsync(ct);
            var result     = await _svc.ProvisionPresetAsync(merchantId, presetId);
            return CreatedAtAction(nameof(GetAgent), new { id = result.Agent.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }
}

public record UpsertMemoryRequest(string ContextType, string ContextKey, string ContextValue);
