using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Audit log endpoints scoped to the authenticated user or their merchant.
/// These are for regular dashboard users — not admin-only.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogRepository  _repo;
    private readonly IMerchantRepository  _merchantRepo;

    public AuditLogsController(IAuditLogRepository repo, IMerchantRepository merchantRepo)
    {
        _repo         = repo;
        _merchantRepo = merchantRepo;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid? CallerUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private static AuditLogResponse ToResponse(AuditLog a) => new(
        a.Id, a.Action, a.EntityType, a.EntityId,
        a.UserId, a.MerchantId, a.Status, a.Description,
        a.IpAddress, a.UserAgent, a.Metadata, a.Timestamp);

    // ─────────────────────────────────────────────────────────────────────────
    // User-scoped audit log
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a paged audit log filtered to the currently authenticated user.
    /// Only shows events that belong to this user (userId = caller's userId).
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PagedResult<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyAuditLog(
        [FromQuery] string?   action     = null,
        [FromQuery] string?   entityType = null,
        [FromQuery] string?   status     = null,
        [FromQuery] string?   search     = null,
        [FromQuery] DateTime? from       = null,
        [FromQuery] DateTime? to         = null,
        [FromQuery] int       page       = 1,
        [FromQuery] int       pageSize   = 25,
        CancellationToken ct = default)
    {
        var userId = CallerUserId();
        if (userId is null) return Unauthorized();

        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = new AuditLogQueryParams(
            Action:     string.IsNullOrWhiteSpace(action)     ? null : action,
            EntityType: string.IsNullOrWhiteSpace(entityType) ? null : entityType,
            UserId:     userId,
            Status:     string.IsNullOrWhiteSpace(status)     ? null : status,
            Search:     string.IsNullOrWhiteSpace(search)     ? null : search,
            From:       from,
            To:         to,
            Page:       Math.Max(1, page),
            PageSize:   pageSize);

        var result = await _repo.GetPagedAsync(query, ct);

        return Ok(new PagedResult<AuditLogResponse>(
            result.Items.Select(ToResponse).ToList(),
            result.TotalCount, result.Page, result.PageSize));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Merchant-scoped audit log  (identified by X-Api-Key header)
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns a paged audit log filtered to the merchant identified by the X-Api-Key header.
    /// Only shows events that belong to this merchant (merchantId matches).
    /// The caller must own the merchant (their userId must match the merchant's userId).
    /// </summary>
    [HttpGet("merchant")]
    [ProducesResponseType(typeof(PagedResult<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMerchantAuditLog(
        [FromHeader(Name = "X-Api-Key")] string apiKey,
        [FromQuery] string?   action     = null,
        [FromQuery] string?   entityType = null,
        [FromQuery] string?   status     = null,
        [FromQuery] string?   search     = null,
        [FromQuery] DateTime? from       = null,
        [FromQuery] DateTime? to         = null,
        [FromQuery] int       page       = 1,
        [FromQuery] int       pageSize   = 25,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            return Unauthorized("X-Api-Key header is required.");

        var merchant = await _merchantRepo.GetByApiKeyAsync(apiKey, ct);
        if (merchant is null || !merchant.IsActive)
            return Unauthorized("Invalid or inactive API key.");

        // Verify ownership — only the merchant owner can view its audit log
        var callerId = CallerUserId();
        if (callerId is null || merchant.UserId != callerId)
            return Forbid();

        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = new AuditLogQueryParams(
            Action:     string.IsNullOrWhiteSpace(action)     ? null : action,
            EntityType: string.IsNullOrWhiteSpace(entityType) ? null : entityType,
            MerchantId: merchant.Id,
            Status:     string.IsNullOrWhiteSpace(status)     ? null : status,
            Search:     string.IsNullOrWhiteSpace(search)     ? null : search,
            From:       from,
            To:         to,
            Page:       Math.Max(1, page),
            PageSize:   pageSize);

        var result = await _repo.GetPagedAsync(query, ct);

        return Ok(new PagedResult<AuditLogResponse>(
            result.Items.Select(ToResponse).ToList(),
            result.TotalCount, result.Page, result.PageSize));
    }
}
