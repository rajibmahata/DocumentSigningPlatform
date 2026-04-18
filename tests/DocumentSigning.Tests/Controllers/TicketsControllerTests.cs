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

public class TicketsControllerTests
{
    private readonly Mock<ITicketRepository> _repo = new();
    private readonly Guid _userId = Guid.NewGuid();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private TicketsController CreateController(bool isAdmin = false)
    {
        var claims = new List<System.Security.Claims.Claim>
        {
            new(ClaimTypes.NameIdentifier, _userId.ToString()),
        };
        if (isAdmin)
            claims.Add(new System.Security.Claims.Claim(ClaimTypes.Role, "Admin"));

        var identity  = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var controller = new TicketsController(_repo.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            }
        };
        return controller;
    }

    private Ticket MakeTicket(Guid? ownerId = null, string status = "Open") => new()
    {
        Id          = Guid.NewGuid(),
        UserId      = ownerId ?? _userId,
        Title       = "Test ticket",
        Description = "Something is broken",
        Type        = "Bug",
        Status      = status,
        CreatedAt   = DateTime.UtcNow,
        User        = new User { Id = ownerId ?? _userId, Name = "Alice", Email = "alice@example.com" },
        Messages    = new List<TicketMessage>(),
    };

    // ═════════════════════════════════════════════════════════════════════════
    // POST /api/tickets — Create ticket
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Create_ValidBugTicket_Returns201WithTicketResponse()
    {
        var ticket = MakeTicket();

        _repo.Setup(r => r.AddTicketAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController().Create(
            new CreateTicketRequest("Login broken", "Can't sign in", "Bug"),
            CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        created.Value.Should().BeOfType<TicketResponse>()
               .Which.Type.Should().Be("Bug");
    }

    [Theory]
    [InlineData("Bug")]
    [InlineData("Feedback")]
    [InlineData("FeatureRequest")]
    public async Task Create_AllValidTypes_Returns201(string type)
    {
        var ticket = MakeTicket();
        ticket.Type = type;

        _repo.Setup(r => r.AddTicketAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController().Create(
            new CreateTicketRequest("Title", "Desc", type),
            CancellationToken.None);

        result.Should().BeOfType<CreatedAtActionResult>()
              .Which.StatusCode.Should().Be(StatusCodes.Status201Created);
    }

    [Theory]
    [InlineData("spam")]
    [InlineData("")]
    [InlineData("bug")]   // case-sensitive
    [InlineData("FEEDBACK")]
    public async Task Create_InvalidType_Returns400(string badType)
    {
        var result = await CreateController().Create(
            new CreateTicketRequest("Title", "Desc", badType),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_SetsStatusToOpen_AndAssignsCurrentUser()
    {
        Ticket? captured = null;

        _repo.Setup(r => r.AddTicketAsync(It.IsAny<Ticket>(), It.IsAny<CancellationToken>()))
             .Callback<Ticket, CancellationToken>((t, _) => captured = t)
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        // Return a fully-populated ticket so MapToResponse doesn't throw NullReferenceException
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(MakeTicket());

        await CreateController().Create(
            new CreateTicketRequest("Title", "Desc", "Feedback"),
            CancellationToken.None);

        // captured is the entity passed to AddTicketAsync — verify it was set correctly
        captured.Should().NotBeNull();
        captured!.Status.Should().Be("Open");
        captured.UserId.Should().Be(_userId);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/tickets/my — Get current user's tickets
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetMy_ReturnsOnlyCurrentUserTickets()
    {
        var tickets = new List<Ticket> { MakeTicket(), MakeTicket() };
        _repo.Setup(r => r.GetByUserIdAsync(_userId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(tickets);

        var result = await CreateController().GetMy(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<List<TicketSummary>>()
                .Which.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetMy_NoTickets_ReturnsEmptyList()
    {
        _repo.Setup(r => r.GetByUserIdAsync(_userId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(new List<Ticket>());

        var result = await CreateController().GetMy(CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>()
              .Which.Value.Should().BeAssignableTo<List<TicketSummary>>()
              .Which.Should().BeEmpty();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/tickets/{id} — Get ticket by ID
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetById_OwnTicket_Returns200WithFullDetail()
    {
        var ticket = MakeTicket(ownerId: _userId);
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController().GetById(ticket.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<TicketResponse>()
                .Which.Id.Should().Be(ticket.Id);
    }

    [Fact]
    public async Task GetById_AdminCanAccessAnyTicket()
    {
        var otherUserId = Guid.NewGuid();
        var ticket = MakeTicket(ownerId: otherUserId);
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController(isAdmin: true).GetById(ticket.Id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_OtherUserTicket_Returns403()
    {
        var ticket = MakeTicket(ownerId: Guid.NewGuid()); // belongs to someone else
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController(isAdmin: false).GetById(ticket.Id, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((Ticket?)null);

        var result = await CreateController().GetById(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // POST /api/tickets/{id}/message — Add message
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task AddMessage_OwnTicket_Returns201WithMessage()
    {
        var ticket = MakeTicket(ownerId: _userId);
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.AddMessageAsync(It.IsAny<TicketMessage>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        var result = await CreateController().AddMessage(
            ticket.Id,
            new AddTicketMessageRequest("Can you help?"),
            CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        created.Value.Should().BeOfType<TicketMessageResponse>()
               .Which.SenderType.Should().Be("User");
    }

    [Fact]
    public async Task AddMessage_AdminUser_SetsSenderTypeToAdmin()
    {
        var ticket = MakeTicket(ownerId: Guid.NewGuid()); // someone else's ticket
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        TicketMessage? capturedMsg = null;
        _repo.Setup(r => r.AddMessageAsync(It.IsAny<TicketMessage>(), It.IsAny<CancellationToken>()))
             .Callback<TicketMessage, CancellationToken>((m, _) => capturedMsg = m)
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController(isAdmin: true).AddMessage(
            ticket.Id,
            new AddTicketMessageRequest("We are looking into it."),
            CancellationToken.None);

        capturedMsg.Should().NotBeNull();
        capturedMsg!.SenderType.Should().Be("Admin");
    }

    [Fact]
    public async Task AddMessage_OtherUserTicket_Returns403()
    {
        var ticket = MakeTicket(ownerId: Guid.NewGuid());
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        var result = await CreateController(isAdmin: false).AddMessage(
            ticket.Id,
            new AddTicketMessageRequest("Trying to inject"),
            CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task AddMessage_UnknownTicketId_Returns404()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((Ticket?)null);

        var result = await CreateController().AddMessage(
            Guid.NewGuid(),
            new AddTicketMessageRequest("Hello?"),
            CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task AddMessage_TrimsWhitespace()
    {
        var ticket = MakeTicket(ownerId: _userId);
        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);

        TicketMessage? captured = null;
        _repo.Setup(r => r.AddMessageAsync(It.IsAny<TicketMessage>(), It.IsAny<CancellationToken>()))
             .Callback<TicketMessage, CancellationToken>((m, _) => captured = m)
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController().AddMessage(
            ticket.Id,
            new AddTicketMessageRequest("  Hello world  "),
            CancellationToken.None);

        captured!.Message.Should().Be("Hello world");
    }

    [Fact]
    public async Task AddMessage_SetsTicketUpdatedAt()
    {
        var ticket = MakeTicket(ownerId: _userId);
        ticket.UpdatedAt = null;

        _repo.Setup(r => r.GetByIdAsync(ticket.Id, It.IsAny<CancellationToken>()))
             .ReturnsAsync(ticket);
        _repo.Setup(r => r.AddMessageAsync(It.IsAny<TicketMessage>(), It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);
        _repo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
             .Returns(Task.CompletedTask);

        await CreateController().AddMessage(
            ticket.Id,
            new AddTicketMessageRequest("Update!"),
            CancellationToken.None);

        ticket.UpdatedAt.Should().NotBeNull();
    }
}
