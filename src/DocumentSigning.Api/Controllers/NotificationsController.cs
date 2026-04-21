using System.Security.Claims;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// In-app notifications for the authenticated user.
/// The frontend polls GET /api/notifications to display the bell badge.
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
[Produces("application/json")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _repo;

    public NotificationsController(INotificationRepository repo) => _repo = repo;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET /api/notifications ────────────────────────────────────────────────

    /// <summary>
    /// Returns unread count and up to 30 recent notifications for the caller.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(NotificationSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var userId  = CurrentUserId;
        var recent  = await _repo.GetRecentAsync(userId, 30, ct);
        var unread  = await _repo.GetUnreadCountAsync(userId, ct);

        var dto = new NotificationSummaryDto(
            unread,
            recent.Select(n => new NotificationDto(
                n.Id, n.Title, n.Body, n.Type, n.Link, n.IsRead, n.CreatedAt
            )).ToList());

        return Ok(dto);
    }

    // ── POST /api/notifications/read-all ─────────────────────────────────────

    /// <summary>Marks all notifications as read for the caller.</summary>
    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await _repo.MarkAllReadAsync(CurrentUserId, ct);
        return NoContent();
    }

    // ── POST /api/notifications/{id}/read ────────────────────────────────────

    /// <summary>Marks a single notification as read.</summary>
    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await _repo.MarkReadAsync(id, CurrentUserId, ct);
        return NoContent();
    }
}
