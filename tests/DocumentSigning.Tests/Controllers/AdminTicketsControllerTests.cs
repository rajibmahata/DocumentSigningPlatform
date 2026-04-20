using System.Security.Claims;
using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class AdminTicketsControllerTests
{
    private readonly Mock<ITicketRepository> _repo  = new();
    private readonly Mock<IAuditService>     _audit = new();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AdminTicketsController CreateController()
    {
        var identity  = new ClaimsIdentity(new[] { new System.Security.Claims.Claim(ClaimTypes.Role, "Admin") }, "Test");
        var principal = new ClaimsPrincipal(identity);

        return new AdminTicketsController(_repo.Object, _audit.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            }
        };
    }

    private static Ticket MakeTicket(string status = "Open", string? priority = null) => new()
    {
        Id          = Guid.NewGuid(),
        UserId      = Guid.NewGuid(),
        Title       = "Sample ticket",
        Description = "Description",
        Type        = "Bug",
        Status      = status,
        Priority    = priority,
        CreatedAt   = DateTime.UtcNow,
        User        = new User { Id = Guid.NewGuid(), Name = "Bob", Email = "bob@example.com" },
        Messages    = new List<TicketMessage>(),
    };

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/admin/tickets — Get all tickets
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetAll_Returns200WithAllTickets()
    {
        _repo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(new List<Ticket> { MakeTicket(), MakeTicket(), MakeTicket() });

        var result = await CreateController().GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<List<TicketSummary>>()
                .Which.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAll_NoTickets_ReturnsEmptyList()
    {
        _repo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(new List<Ticket>());

        var result = await CreateController().GetAll(CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>()
              .Which.Value.Should().BeAssignableTo<List<TicketSummary>>()
              .Which.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAll_SummaryIncludesMessageCount()
    {
        var ticket = MakeTicket();
        ticket.Messages = new List<TicketMessage>
        {
            new() { Id = Guid.NewGuid(), SenderType = "User",  Message = "Hi",   TicketId = ticket.Id, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), SenderType = "Admin", Message = "Done", TicketId = ticket.Id, CreatedAt = DateTime.UtcNow },
        };
        _repo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(new List<Ticket> { ticket });

        var result = await CreateController().GetAll(CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>()
              .Which.Value.Should().BeAssignableTo<List<TicketSummary>>()
              .Which[0].MessageCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAll_SummaryMapsUserNameAndEmail()
    {
        var ticket = MakeTicket();
        ticket.User = new User { Id = ticket.UserId, Name = "Carol", Email = "carol@test.com" };
        _repo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
             .ReturnsAsync(new List<Ticket> { ticket });

        var result = await CreateController().GetAll(CancellationToken.None);

        var summary = result.Should().BeOfType<OkObjectResult>()
                            .Which.Value.Should().BeAssignableTo<List<TicketSummary>>()
                            .Which[0];
        summary.UserName.Should().Be("Carol");
        summary.UserEmail.Should().Be("carol@test.com");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PUT /api/admin/tickets/{id}/status — Update status & priority
    // ═════════════════════════════════════════════════════════════════════════

    [Theory]
    [InlineData("Open")]
    [InlineData("InProgress")]
    [InlineData("Resolved")]
    [InlineData("Closed")]
    public async Task UpdateStatus_ValidStatuses_Returns204(string status)
    {
        var ticket = MakeTicket();
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var result = await CreateController().UpdateStatus(
            ticket.Id,
            new UpdateTicketStatusRequest(status, null),
            CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    [Theory]
    [InlineData("open")]       // wrong case
    [InlineData("pending")]    // not a valid value
    [InlineData("")]
    [InlineData("CLOSED")]
    public async Task UpdateStatus_InvalidStatus_Returns400(string badStatus)
    {
        var result = await CreateController().UpdateStatus(
            Guid.NewGuid(),
            new UpdateTicketStatusRequest(badStatus, null),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateStatus_UnknownTicketId_Returns404()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((Ticket?)null);

        var result = await CreateController().UpdateStatus(
            Guid.NewGuid(),
            new UpdateTicketStatusRequest("Resolved", null),
            CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task UpdateStatus_WithPriority_SetsPriorityOnTicket()
    {
        var ticket = MakeTicket();
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController().UpdateStatus(
            ticket.Id,
            new UpdateTicketStatusRequest("InProgress", "High"),
            CancellationToken.None);

        ticket.Priority.Should().Be("High");
        ticket.Status.Should().Be("InProgress");
    }

    [Fact]
    public async Task UpdateStatus_SetsUpdatedAt()
    {
        var ticket = MakeTicket();
        ticket.UpdatedAt = null;

        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController().UpdateStatus(
            ticket.Id,
            new UpdateTicketStatusRequest("Resolved", null),
            CancellationToken.None);

        ticket.UpdatedAt.Should().NotBeNull()
              .And.BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task UpdateStatus_NullPriority_ClearsPriorityOnTicket()
    {
        var ticket = MakeTicket(priority: "High");
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController().UpdateStatus(
            ticket.Id,
            new UpdateTicketStatusRequest("Resolved", null),
            CancellationToken.None);

        ticket.Priority.Should().BeNull();
    }
}
