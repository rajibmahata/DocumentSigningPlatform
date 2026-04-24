using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Admin endpoints for querying the audit log.
/// All endpoints require Admin role.
/// </summary>
[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Roles = "Admin")]
public class AdminAuditController : ControllerBase
{
    private readonly IAuditLogRepository _repo;

    public AdminAuditController(IAuditLogRepository repo) => _repo = repo;

    /// <summary>
    /// Returns a paged, filtered list of audit log entries.
    /// </summary>
    /// <remarks>
    /// All query parameters are optional. Results are sorted newest-first.
    ///
    /// **Supported `action` values:** Envelope.Created, Envelope.Sent, Envelope.Viewed, Envelope.Signed,
    /// Envelope.Completed, Envelope.Cancelled, Document.Uploaded, Document.Stamped,
    /// Document.SignatureSubmitted, User.Registered, User.LoggedIn, User.LoginFailed,
    /// User.EmailVerified, User.PasswordResetRequested, User.PasswordReset, User.Updated,
    /// Merchant.Created, Merchant.Updated, Merchant.ApiKeyRegenerated, Merchant.LimitUpdated,
    /// Ticket.Created, Ticket.Updated, Ticket.Replied, Ticket.Closed, Ticket.Resolved, Portal.Opened,
    /// Envelope.Rejected, Envelope.Failed, Envelope.Expired.
    ///
    /// **Supported `entityType` values:** Envelope, Document, User, Merchant, Ticket, Portal.
    ///
    /// **Supported `status` values:** Success, Failure, Warning.
    /// </remarks>
    /// <param name="action">Filter by action name, e.g. Document.SignatureSubmitted</param>
    /// <param name="entityType">Filter by entity type, e.g. Envelope</param>
    /// <param name="entityId">Filter by entity ID (GUID)</param>
    /// <param name="userId">Filter by the user who triggered the event</param>
    /// <param name="merchantId">Filter by merchant ID</param>
    /// <param name="status">Filter by status: Success | Failure | Warning</param>
    /// <param name="from">Start of date range (UTC ISO-8601)</param>
    /// <param name="to">End of date range (UTC ISO-8601)</param>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Results per page (default 50, max 200)</param>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPaged(
        [FromQuery] string?   action     = null,
        [FromQuery] string?   entityType = null,
        [FromQuery] Guid?     entityId   = null,
        [FromQuery] Guid?     userId     = null,
        [FromQuery] Guid?     merchantId = null,
        [FromQuery] string?   status     = null,
        [FromQuery] string?   search     = null,
        [FromQuery] DateTime? from       = null,
        [FromQuery] DateTime? to         = null,
        [FromQuery] int       page       = 1,
        [FromQuery] int       pageSize   = 50,
        CancellationToken ct = default)
    {
        var query = new AuditLogQueryParams(
            action, entityType, entityId, userId, merchantId,
            status, search, from, to, page, pageSize);

        var result = await _repo.GetPagedAsync(query, ct);

        return Ok(new PagedResult<AuditLogResponse>(
            result.Items.Select(ToResponse).ToList(),
            result.TotalCount,
            result.Page,
            result.PageSize));
    }

    /// <summary>
    /// Returns a chronological timeline (oldest first) of all audit events for a specific entity.
    /// </summary>
    /// <remarks>
    /// Useful for viewing the complete signing history of a single envelope or document.
    ///
    /// **Example:** GET /api/admin/audit-logs/entity/Envelope/{envelopeId}
    ///
    /// **Example:** GET /api/admin/audit-logs/entity/Document/{documentId}
    ///
    /// Valid entityType values: Envelope, Document, User, Merchant, Ticket, Portal.
    /// </remarks>
    /// <param name="entityType">Entity type: Envelope | Document | User | Merchant | Ticket | Portal</param>
    /// <param name="entityId">The entity's GUID</param>
    [HttpGet("entity/{entityType}/{entityId:guid}")]
    [ProducesResponseType(typeof(List<AuditLogResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetByEntity(
        string entityType,
        Guid   entityId,
        CancellationToken ct = default)
    {
        var items = await _repo.GetByEntityAsync(entityType, entityId, ct);
        return Ok(items.Select(ToResponse).ToList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static AuditLogResponse ToResponse(AuditLog a) => new(
        a.Id,
        a.Action,
        a.EntityType,
        a.EntityId,
        a.UserId,
        a.MerchantId,
        a.Status,
        a.Description,
        a.IpAddress,
        a.UserAgent,
        a.Metadata,
        a.Timestamp);
}
