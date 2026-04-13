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

    public AnalyticsController(
        IUserRepository           userRepo,
        ISigningEnvelopeRepository envelopeRepo,
        ISignedDocumentRepository  signedDocRepo)
    {
        _userRepo      = userRepo;
        _envelopeRepo  = envelopeRepo;
        _signedDocRepo = signedDocRepo;
    }

    /// <summary>
    /// Platform-wide summary counts.
    /// GET /api/analytics/summary
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AnalyticsSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var totalUsers     = await _userRepo.CountAllAsync(ct);
        var totalSent      = await _envelopeRepo.CountAllAsync(ct);
        var totalCompleted = await _envelopeRepo.CountByStatusAsync(EnvelopeStatus.Completed, ct);
        var totalCancelled = await _envelopeRepo.CountByStatusAsync(EnvelopeStatus.Cancelled, ct);
        var totalSigned    = await _signedDocRepo.CountAllAsync(ct);

        return Ok(new AnalyticsSummaryResponse(
            totalUsers,
            totalSent,
            totalCompleted,
            totalCancelled,
            totalSigned));
    }

    /// <summary>
    /// Daily trend data for charts. Optional ?days=30 (default 30, max 90).
    /// GET /api/analytics/trends
    /// </summary>
    [HttpGet("trends")]
    [ProducesResponseType(typeof(AnalyticsTrendResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Trends([FromQuery] int days = 30, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 7, 90);

        var userDays     = await _userRepo.CountByDayAsync(days, ct);
        var envelopeDays = await _envelopeRepo.CountByDayAsync(days, ct);

        // Signed docs use the envelope completed trend as proxy (no per-day signed doc table yet)
        var signedDays = envelopeDays; // same query; already ordered

        return Ok(new AnalyticsTrendResponse(
            userDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList(),
            envelopeDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList(),
            signedDays.Select(x => new DailyCount(x.Date.ToString("yyyy-MM-dd"), x.Count)).ToList()
        ));
    }
}
