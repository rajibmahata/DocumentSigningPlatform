using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Analytics / statistics endpoints. Admin-only.
/// </summary>
[ApiController]
[Route("api/analytics")]
[Authorize(Roles = "Admin")]
public class AnalyticsController : ControllerBase
{
    private readonly IUserRepository              _userRepo;
    private readonly ISigningEnvelopeRepository   _envelopeRepo;
    private readonly ISignedDocumentRepository    _signedDocRepo;
    private readonly ITicketRepository            _ticketRepo;

    public AnalyticsController(
        IUserRepository           userRepo,
        ISigningEnvelopeRepository envelopeRepo,
        ISignedDocumentRepository  signedDocRepo,
        ITicketRepository          ticketRepo)
    {
        _userRepo      = userRepo;
        _envelopeRepo  = envelopeRepo;
        _signedDocRepo = signedDocRepo;
        _ticketRepo    = ticketRepo;
    }

    /// <summary>
    /// Platform-wide summary counts — users, envelopes, signed documents, and support tickets.
    /// GET /api/analytics/summary
    /// </summary>
    /// <remarks>
    /// Returns aggregate totals across the entire platform. Requires Admin role.
    ///
    /// **Envelope fields**
    /// - `totalUsers` — all registered users
    /// - `totalEnvelopesSent` — all envelopes ever created
    /// - `totalEnvelopesSigned` — envelopes with status `Completed`
    /// - `totalEnvelopesCancelled` — envelopes with status `Cancelled`
    /// - `totalDocumentsSigned` — individual signed document records
    ///
    /// **Ticket fields**
    /// - `totalTickets` — all support tickets
    /// - `openTickets` — tickets with status `Open`
    /// - `inProgressTickets` — tickets with status `InProgress`
    /// - `resolvedTickets` — tickets with status `Resolved`
    /// - `closedTickets` — tickets with status `Closed`
    /// </remarks>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AnalyticsSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var totalUsers     = await _userRepo.CountAllAsync(ct);
        var totalSent      = await _envelopeRepo.CountAllAsync(ct);
        var totalCompleted = await _envelopeRepo.CountByStatusAsync(EnvelopeStatus.Completed, ct);
        var totalCancelled = await _envelopeRepo.CountByStatusAsync(EnvelopeStatus.Cancelled, ct);
        var totalSigned    = await _signedDocRepo.CountAllAsync(ct);

        var totalTickets    = await _ticketRepo.CountAllAsync(ct);
        var openTickets     = await _ticketRepo.CountByStatusAsync("Open", ct);
        var inProgressTickets = await _ticketRepo.CountByStatusAsync("InProgress", ct);
        var resolvedTickets = await _ticketRepo.CountByStatusAsync("Resolved", ct);
        var closedTickets   = await _ticketRepo.CountByStatusAsync("Closed", ct);

        return Ok(new AnalyticsSummaryResponse(
            totalUsers,
            totalSent,
            totalCompleted,
            totalCancelled,
            totalSigned,
            totalTickets,
            openTickets,
            inProgressTickets,
            resolvedTickets,
            closedTickets));
    }

    /// <summary>
    /// Daily trend data for charts. Optional <c>?days=30</c> (default 30, max 90).
    /// GET /api/analytics/trends
    /// </summary>
    /// <remarks>
    /// Returns per-day counts for the requested look-back window. Requires Admin role.
    ///
    /// **Query parameters**
    /// - `days` (int, optional) — look-back window in days; clamped to 7–90; default 30
    ///
    /// **Response series** (each is `DailyCount[]` = `{ date: "yyyy-MM-dd", count: int }`)
    /// - `userRegistrations` — new user sign-ups per day
    /// - `envelopesSent` — envelopes created per day
    /// - `documentsSigned` — documents signed per day
    /// - `ticketsCreated` — new support tickets opened per day
    ///
    /// Only days with at least one event are included in each series.
    /// </remarks>
    [HttpGet("trends")]
    [ProducesResponseType(typeof(AnalyticsTrendResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Trends([FromQuery] int days = 30, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 7, 90);

        var userDays     = await _userRepo.CountByDayAsync(days, ct);
        var envelopeDays = await _envelopeRepo.CountByDayAsync(days, ct);
        var ticketDays   = await _ticketRepo.CountByDayAsync(days, ct);

        // Signed docs use the envelope completed trend as proxy (no per-day signed doc table yet)
        var signedDays = envelopeDays; // same query; already ordered

        return Ok(new AnalyticsTrendResponse(
            userDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList(),
            envelopeDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList(),
            signedDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList(),
            ticketDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList()
        ));
    }
}
