using System.Security.Claims;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Tickets — authenticated user endpoints.
/// </summary>
[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly ITicketRepository _repo;

    public TicketsController(ITicketRepository repo) => _repo = repo;

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("User ID claim missing"));

    // ── POST /api/tickets ─────────────────────────────────────────────────────

    /// <summary>Create a new support ticket.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(
        [FromBody] CreateTicketRequest req,
        CancellationToken ct)
    {
        var validTypes = new[] { "Bug", "Feedback", "FeatureRequest" };
        if (!validTypes.Contains(req.Type))
            return BadRequest("Type must be Bug, Feedback, or FeatureRequest.");

        var ticket = new Ticket
        {
            UserId      = CurrentUserId,
            Title       = req.Title.Trim(),
            Description = req.Description.Trim(),
            Type        = req.Type,
            Status      = "Open",
        };

        await _repo.AddTicketAsync(ticket, ct);
        await _repo.SaveChangesAsync(ct);

        var created = await _repo.GetByIdAsync(ticket.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, MapToResponse(created!));
    }

    // ── GET /api/tickets/my ───────────────────────────────────────────────────

    /// <summary>Get all tickets for the current user.</summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(List<TicketSummary>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMy(CancellationToken ct)
    {
        var tickets = await _repo.GetByUserIdAsync(CurrentUserId, ct);
        return Ok(tickets.Select(MapToSummary).ToList());
    }

    // ── GET /api/tickets/{id} ─────────────────────────────────────────────────

    /// <summary>Get full ticket details + messages.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var ticket = await _repo.GetByIdAsync(id, ct);
        if (ticket is null) return NotFound();

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && ticket.UserId != CurrentUserId) return Forbid();

        return Ok(MapToResponse(ticket));
    }

    // ── POST /api/tickets/{id}/message ────────────────────────────────────────

    /// <summary>Add a message to an existing ticket (chat).</summary>
    [HttpPost("{id:guid}/message")]
    [ProducesResponseType(typeof(TicketMessageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddMessage(
        Guid id,
        [FromBody] AddTicketMessageRequest req,
        CancellationToken ct)
    {
        var ticket = await _repo.GetByIdAsync(id, ct);
        if (ticket is null) return NotFound();

        var isAdmin = User.IsInRole("Admin");
        if (!isAdmin && ticket.UserId != CurrentUserId) return Forbid();

        var msg = new TicketMessage
        {
            TicketId   = id,
            SenderType = isAdmin ? "Admin" : "User",
            Message    = req.Message.Trim(),
        };

        ticket.UpdatedAt = DateTime.UtcNow;

        await _repo.AddMessageAsync(msg, ct);
        await _repo.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id },
            new TicketMessageResponse(msg.Id, msg.SenderType, msg.Message, msg.CreatedAt));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static TicketResponse MapToResponse(Ticket t) =>
        new(
            t.Id,
            t.UserId,
            t.User.Name,
            t.User.Email,
            t.MerchantId,
            t.Title,
            t.Description,
            t.Type,
            t.Status,
            t.Priority,
            t.CreatedAt,
            t.UpdatedAt,
            t.Messages.OrderBy(m => m.CreatedAt)
                      .Select(m => new TicketMessageResponse(m.Id, m.SenderType, m.Message, m.CreatedAt))
                      .ToList());

    private static TicketSummary MapToSummary(Ticket t) =>
        new(
            t.Id,
            t.User.Name,
            t.User.Email,
            t.Title,
            t.Type,
            t.Status,
            t.Priority,
            t.Messages.Count,
            t.CreatedAt,
            t.UpdatedAt);
}
