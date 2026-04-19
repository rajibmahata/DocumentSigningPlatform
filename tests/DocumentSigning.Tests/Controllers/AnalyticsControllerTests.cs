using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class AnalyticsControllerTests
{
    private readonly Mock<IUserRepository>              _userRepo      = new();
    private readonly Mock<ISigningEnvelopeRepository>   _envelopeRepo  = new();
    private readonly Mock<ISignedDocumentRepository>    _signedDocRepo = new();
    private readonly Mock<ITicketRepository>            _ticketRepo    = new();

    private AnalyticsController CreateController() =>
        new(_userRepo.Object, _envelopeRepo.Object, _signedDocRepo.Object, _ticketRepo.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

    // ── Summary ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Summary_Returns200_WithAllCounts()
    {
        _userRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(10);
        _envelopeRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(50);
        _envelopeRepo.Setup(r => r.CountByStatusAsync(EnvelopeStatus.Completed, It.IsAny<CancellationToken>())).ReturnsAsync(30);
        _envelopeRepo.Setup(r => r.CountByStatusAsync(EnvelopeStatus.Cancelled, It.IsAny<CancellationToken>())).ReturnsAsync(5);
        _signedDocRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(80);
        _ticketRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(18);
        _ticketRepo.Setup(r => r.CountByStatusAsync("Open",       It.IsAny<CancellationToken>())).ReturnsAsync(4);
        _ticketRepo.Setup(r => r.CountByStatusAsync("InProgress", It.IsAny<CancellationToken>())).ReturnsAsync(3);
        _ticketRepo.Setup(r => r.CountByStatusAsync("Resolved",   It.IsAny<CancellationToken>())).ReturnsAsync(8);
        _ticketRepo.Setup(r => r.CountByStatusAsync("Closed",     It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var result = await CreateController().Summary(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<AnalyticsSummaryResponse>().Subject;

        body.TotalUsers.Should().Be(10);
        body.TotalEnvelopesSent.Should().Be(50);
        body.TotalEnvelopesSigned.Should().Be(30);
        body.TotalEnvelopesCancelled.Should().Be(5);
        body.TotalDocumentsSigned.Should().Be(80);
        body.TotalTickets.Should().Be(18);
        body.OpenTickets.Should().Be(4);
        body.InProgressTickets.Should().Be(3);
        body.ResolvedTickets.Should().Be(8);
        body.ClosedTickets.Should().Be(3);
    }

    [Fact]
    public async Task Summary_ReturnsZeroCounts_WhenNoData()
    {
        _userRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _envelopeRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _envelopeRepo.Setup(r => r.CountByStatusAsync(It.IsAny<EnvelopeStatus>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _signedDocRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _ticketRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _ticketRepo.Setup(r => r.CountByStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);

        var result = await CreateController().Summary(CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value
                         .Should().BeOfType<AnalyticsSummaryResponse>().Subject;

        body.TotalUsers.Should().Be(0);
        body.TotalEnvelopesSent.Should().Be(0);
        body.TotalTickets.Should().Be(0);
    }

    [Fact]
    public async Task Summary_QueriesEnvelopeStatusCompletedAndCancelled()
    {
        SetupSummaryDefaults();

        await CreateController().Summary(CancellationToken.None);

        _envelopeRepo.Verify(r => r.CountByStatusAsync(EnvelopeStatus.Completed, It.IsAny<CancellationToken>()), Times.Once);
        _envelopeRepo.Verify(r => r.CountByStatusAsync(EnvelopeStatus.Cancelled, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Summary_QueriesAllFourTicketStatuses()
    {
        SetupSummaryDefaults();

        await CreateController().Summary(CancellationToken.None);

        _ticketRepo.Verify(r => r.CountByStatusAsync("Open",       It.IsAny<CancellationToken>()), Times.Once);
        _ticketRepo.Verify(r => r.CountByStatusAsync("InProgress", It.IsAny<CancellationToken>()), Times.Once);
        _ticketRepo.Verify(r => r.CountByStatusAsync("Resolved",   It.IsAny<CancellationToken>()), Times.Once);
        _ticketRepo.Verify(r => r.CountByStatusAsync("Closed",     It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Trends ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Trends_Returns200_WithMappedSeries()
    {
        var day = new DateOnly(2026, 3, 15);
        var series = new List<(DateOnly Date, int Count)> { (day, 5) };

        _userRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(series);
        _envelopeRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(series);
        _ticketRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(series);

        var result = await CreateController().Trends(30, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value
                         .Should().BeOfType<AnalyticsTrendResponse>().Subject;

        body.UserRegistrations.Should().ContainSingle(d => d.Date == "2026-03-15" && d.Count == 5);
        body.EnvelopesSent.Should().ContainSingle(d => d.Date == "2026-03-15" && d.Count == 5);
        body.TicketsCreated.Should().ContainSingle(d => d.Date == "2026-03-15" && d.Count == 5);
    }

    [Fact]
    public async Task Trends_ClampsDaysBelow7_To7()
    {
        SetupTrendsDefaults(7);

        await CreateController().Trends(1, CancellationToken.None);

        _userRepo.Verify(r => r.CountByDayAsync(7, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Trends_ClampsDaysAbove90_To90()
    {
        SetupTrendsDefaults(90);

        await CreateController().Trends(200, CancellationToken.None);

        _userRepo.Verify(r => r.CountByDayAsync(90, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Trends_ReturnsEmptySeries_WhenNoData()
    {
        var empty = new List<(DateOnly Date, int Count)>();
        _userRepo.Setup(r => r.CountByDayAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        _envelopeRepo.Setup(r => r.CountByDayAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        _ticketRepo.Setup(r => r.CountByDayAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(empty);

        var result = await CreateController().Trends(30, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value
                         .Should().BeOfType<AnalyticsTrendResponse>().Subject;

        body.UserRegistrations.Should().BeEmpty();
        body.EnvelopesSent.Should().BeEmpty();
        body.TicketsCreated.Should().BeEmpty();
    }

    [Fact]
    public async Task Trends_DocumentsSigned_UsesSameDataAsEnvelopesSent()
    {
        var day    = new DateOnly(2026, 4, 1);
        var series = new List<(DateOnly Date, int Count)> { (day, 12) };
        var empty  = new List<(DateOnly Date, int Count)>();

        _userRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        _envelopeRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(series);
        _ticketRepo.Setup(r => r.CountByDayAsync(30, It.IsAny<CancellationToken>())).ReturnsAsync(empty);

        var result = await CreateController().Trends(30, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value
                         .Should().BeOfType<AnalyticsTrendResponse>().Subject;

        // DocumentsSigned is a proxy for EnvelopesSent in the current implementation
        body.DocumentsSigned.Should().BeEquivalentTo(body.EnvelopesSent);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void SetupSummaryDefaults()
    {
        _userRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _envelopeRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _envelopeRepo.Setup(r => r.CountByStatusAsync(It.IsAny<EnvelopeStatus>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _signedDocRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _ticketRepo.Setup(r => r.CountAllAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _ticketRepo.Setup(r => r.CountByStatusAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(0);
    }

    private void SetupTrendsDefaults(int clampedDays)
    {
        var empty = new List<(DateOnly Date, int Count)>();
        _userRepo.Setup(r => r.CountByDayAsync(clampedDays, It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        _envelopeRepo.Setup(r => r.CountByDayAsync(clampedDays, It.IsAny<CancellationToken>())).ReturnsAsync(empty);
        _ticketRepo.Setup(r => r.CountByDayAsync(clampedDays, It.IsAny<CancellationToken>())).ReturnsAsync(empty);
    }
}
