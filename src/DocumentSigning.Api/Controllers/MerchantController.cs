using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/merchants")]
[Authorize]
public class MerchantController : ControllerBase
{
    private readonly IMerchantRepository _merchantRepo;
    private readonly IAuditService       _audit;

    public MerchantController(IMerchantRepository merchantRepo, IAuditService audit)
    {
        _merchantRepo = merchantRepo;
        _audit        = audit;
    }

    /// <summary>Creates a new merchant account for a user. Users may create multiple merchant accounts.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(MerchantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMerchantRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Merchant name is required.");
        if (request.RequestLimit < 0)
            return BadRequest("RequestLimit must be >= 0 (0 = unlimited).");

        var merchant = new Merchant
        {
            Id                = Guid.NewGuid(),
            UserId            = request.UserId,
            Name              = request.Name.Trim(),
            Description       = request.Description?.Trim(),
            ApiKey            = GenerateApiKey(),
            IsActive          = true,
            RequestLimit      = request.RequestLimit,
            RequestUsed       = 0,
            SubscriptionStart = DateTime.UtcNow,
            CreatedAt         = DateTime.UtcNow
        };

        await _merchantRepo.AddAsync(merchant, ct);
        await _merchantRepo.SaveChangesAsync(ct);

        _audit.Log(new AuditEntry(
            Action:      AuditActions.MerchantCreated,
            EntityType:  AuditEntities.Merchant,
            EntityId:    merchant.Id,
            UserId:      merchant.UserId,
            MerchantId:  merchant.Id,
            Description: $"Merchant '{merchant.Name}' created",
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString()));

        return CreatedAtAction(nameof(GetById), new { id = merchant.Id }, ToResponse(merchant));
    }

    /// <summary>Returns all merchants (admin use).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IReadOnlyList<MerchantResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var merchants = await _merchantRepo.GetAllAsync(ct);
        return Ok(merchants.Select(ToResponse));
    }

    /// <summary>Returns all merchants belonging to a user.</summary>
    [HttpGet("by-user/{userId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<MerchantResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByUser(Guid userId, CancellationToken ct)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(userId, ct);
        return Ok(merchants.Select(ToResponse));
    }

    /// <summary>Returns a single merchant by ID.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(MerchantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var merchant = await _merchantRepo.GetByIdAsync(id, ct);
        return merchant is null ? NotFound() : Ok(ToResponse(merchant));
    }

    /// <summary>Updates merchant settings (name, description, limit, active flag, subscription end). Requires Admin role.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(MerchantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateMerchantRequest request,
        CancellationToken ct)
    {
        var merchant = await _merchantRepo.GetByIdAsync(id, ct);
        if (merchant is null) return NotFound();
        if (request.RequestLimit < 0)
            return BadRequest("RequestLimit must be >= 0 (0 = unlimited).");

        merchant.Name            = request.Name?.Trim() ?? merchant.Name;
        merchant.Description     = request.Description?.Trim() ?? merchant.Description;
        merchant.IsActive        = request.IsActive;
        merchant.RequestLimit    = request.RequestLimit;
        merchant.SubscriptionEnd = request.SubscriptionEnd;

        await _merchantRepo.UpdateAsync(merchant, ct);
        await _merchantRepo.SaveChangesAsync(ct);

        _audit.Log(new AuditEntry(
            Action:      AuditActions.MerchantUpdated,
            EntityType:  AuditEntities.Merchant,
            EntityId:    merchant.Id,
            MerchantId:  merchant.Id,
            Description: $"Merchant '{merchant.Name}' updated",
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString()));

        return Ok(ToResponse(merchant));
    }

    /// <summary>Regenerates the API key for a merchant. Requires Admin role.</summary>
    [HttpPost("{id:guid}/regenerate-key")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(MerchantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RegenerateKey(Guid id, CancellationToken ct)
    {
        var merchant = await _merchantRepo.GetByIdAsync(id, ct);
        if (merchant is null) return NotFound();

        merchant.ApiKey = GenerateApiKey();
        await _merchantRepo.UpdateAsync(merchant, ct);
        await _merchantRepo.SaveChangesAsync(ct);

        _audit.Log(new AuditEntry(
            Action:      AuditActions.MerchantApiKeyRegen,
            EntityType:  AuditEntities.Merchant,
            EntityId:    merchant.Id,
            MerchantId:  merchant.Id,
            Description: $"API key regenerated for merchant '{merchant.Name}'",
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString()));

        return Ok(ToResponse(merchant));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    internal static string GenerateApiKey()
        => $"msk_{Convert.ToBase64String(Guid.NewGuid().ToByteArray()).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";

    private static MerchantResponse ToResponse(Merchant m) => new(
        m.Id, m.UserId, m.Name, m.Description, m.ApiKey, m.IsActive,
        m.RequestLimit, m.RequestUsed, m.SubscriptionStart, m.SubscriptionEnd, m.CreatedAt);
}
