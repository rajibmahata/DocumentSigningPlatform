using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/workflows")]
[Authorize]
public sealed class WorkflowController : ControllerBase
{
    private readonly IWorkflowService    _svc;
    private readonly IMerchantRepository _merchantRepo;

    public WorkflowController(IWorkflowService svc, IMerchantRepository merchantRepo)
    {
        _svc          = svc;
        _merchantRepo = merchantRepo;
    }

    // ── Definitions ───────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        if (merchantId == Guid.Empty) return Unauthorized(new { error = "No active merchant found for this user." });
        var list = await _svc.ListAsync(merchantId, ct);
        return Ok(list);
    }

    [HttpGet("templates")]
    [AllowAnonymous]
    public async Task<IActionResult> ListTemplates(CancellationToken ct)
    {
        var list = await _svc.ListTemplatesAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var dto = await _svc.GetAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWorkflowRequest req, CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        if (merchantId == Guid.Empty) return Unauthorized(new { error = "No active merchant found for this user." });
        var createdBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? "system";
        var dto = await _svc.CreateAsync(merchantId, createdBy, req, ct);
        return CreatedAtAction(nameof(Get), new { id = dto.Id }, dto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateWorkflowRequest req, CancellationToken ct)
    {
        try
        {
            var dto = await _svc.UpdateAsync(id, req, ct);
            return Ok(dto);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        try
        {
            await _svc.PublishAsync(id, ct);
            return Ok(new { message = "Workflow published." });
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("clone/{templateId:guid}")]
    public async Task<IActionResult> CloneTemplate(Guid templateId, CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        if (merchantId == Guid.Empty) return Unauthorized(new { error = "No active merchant found for this user." });
        var createdBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? "system";
        try
        {
            var dto = await _svc.CloneFromTemplateAsync(templateId, merchantId, createdBy, ct);
            return Ok(dto);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // ── Instances ─────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/trigger")]
    public async Task<IActionResult> Trigger(Guid id, [FromBody] TriggerWorkflowRequest req, CancellationToken ct)
    {
        var triggeredBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? "system";
        try
        {
            var dto = await _svc.TriggerAsync(id, triggeredBy, req, ct);
            return Ok(dto);
        }
        catch (KeyNotFoundException)    { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{id:guid}/instances")]
    public async Task<IActionResult> GetInstances(Guid id, CancellationToken ct)
    {
        var list = await _svc.GetInstancesByDefinitionIdAsync(id, ct);
        return Ok(list);
    }

    [HttpGet("instances/{instanceId:guid}")]
    public async Task<IActionResult> GetInstance(Guid instanceId, CancellationToken ct)
    {
        var dto = await _svc.GetInstanceAsync(instanceId, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("instances/{instanceId:guid}/cancel")]
    public async Task<IActionResult> CancelInstance(Guid instanceId, CancellationToken ct)
    {
        try
        {
            await _svc.CancelInstanceAsync(instanceId, ct);
            return Ok(new { message = "Instance cancelled." });
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("instances")]
    public async Task<IActionResult> ListInstances(CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        if (merchantId == Guid.Empty) return Unauthorized(new { error = "No active merchant found for this user." });
        var list = await _svc.ListInstancesAsync(merchantId, ct);
        return Ok(list);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        if (merchantId == Guid.Empty) return Unauthorized(new { error = "No active merchant found for this user." });
        var stats = await _svc.GetStatsAsync(merchantId, ct);
        return Ok(stats);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Resolves the caller's primary active merchant from the database using the userId in the JWT sub claim.
    /// This is necessary because the JWT does not embed a merchantId claim (users can have multiple merchants).
    /// </summary>
    private async Task<Guid> GetMerchantIdAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
               ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(sub, out var userId)) return Guid.Empty;

        var merchants = await _merchantRepo.GetByUserIdAsync(userId, ct);
        var merchant  = merchants.FirstOrDefault(m => m.IsActive)
                     ?? merchants.FirstOrDefault();
        return merchant?.Id ?? Guid.Empty;
    }
}
