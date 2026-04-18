using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Admin endpoints for managing all tickets.
/// </summary>
[ApiController]
[Route("api/admin/tickets")]
[Authorize(Roles = "Admin")]
public class AdminTicketsController : ControllerBase
{
    private readonly ITicketRepository _repo;

    public AdminTicketsController(ITicketRepository repo) => _repo = repo;

    // ── GET /api/admin/tickets ────────────────────────────────────────────────

    /// <summary>Get all tickets across all users.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<TicketSummary>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var tickets = await _repo.GetAllAsync(ct);
        return Ok(tickets.Select(t => new TicketSummary(
            t.Id, t.User.Name, t.User.Email,
            t.Title, t.Type, t.Status, t.Priority,
            t.Messages.Count, t.AttachmentBase64 is not null,
            t.CreatedAt, t.UpdatedAt)).ToList());
    }

    // ── PUT /api/admin/tickets/{id}/status ────────────────────────────────────

    /// <summary>Update ticket status and priority.</summary>
    [HttpPut("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateTicketStatusRequest req,
        CancellationToken ct)
    {
        var validStatuses = new[] { "Open", "InProgress", "Resolved", "Closed" };
        if (!validStatuses.Contains(req.Status))
            return BadRequest("Status must be Open, InProgress, Resolved, or Closed.");

        var ticket = await _repo.GetByIdAsync(id, ct);
        if (ticket is null) return NotFound();

        ticket.Status    = req.Status;
        ticket.Priority  = req.Priority;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(ct);
        return NoContent();
    }
}
