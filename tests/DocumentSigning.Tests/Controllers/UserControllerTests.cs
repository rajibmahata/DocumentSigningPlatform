using System.Security.Claims;
using ClaimsPrincipal = System.Security.Claims.ClaimsPrincipal;
using ClaimsIdentity  = System.Security.Claims.ClaimsIdentity;
using Claim           = System.Security.Claims.Claim;
using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class UserControllerTests
{
    private readonly Mock<IUserRepository> _userRepo = new();

    // ── Controller factory helpers ────────────────────────────────────────────

    private UserController CreateController(string? role = null, Guid? userId = null)
    {
        var claims = new List<Claim>();
        if (role is not null)
            claims.Add(new Claim(ClaimTypes.Role, role));
        if (userId.HasValue)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));

        var identity  = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var controller = new UserController(_userRepo.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            }
        };
        return controller;
    }

    private static User MakeUser(Guid? id = null, string name = "Alice",
                                 string email = "alice@example.com",
                                 AccessRole role = AccessRole.User) =>
        new()
        {
            Id          = id ?? Guid.NewGuid(),
            Name        = name,
            Email       = email,
            PasswordHash = "hashed",
            AccessRole  = role,
            CreatedAt   = DateTime.UtcNow
        };

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/users
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetAll_AsAdmin_ReturnsAllUsers()
    {
        var users = new List<User> { MakeUser(), MakeUser() };
        _userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(users.AsReadOnly());

        var result = await CreateController(role: "Admin").GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IEnumerable<UserResponse>>()
          .Which.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAll_Returns_UserResponseShape()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, name: "Bob", email: "bob@test.com", role: AccessRole.Admin);
        _userRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<User> { user }.AsReadOnly());

        var result = await CreateController(role: "Admin").GetAll(CancellationToken.None);

        var list = ((OkObjectResult)result).Value.Should()
            .BeAssignableTo<IEnumerable<UserResponse>>().Subject.ToList();

        list[0].Id.Should().Be(id);
        list[0].Name.Should().Be("Bob");
        list[0].Email.Should().Be("bob@test.com");
        list[0].AccessRole.Should().Be(AccessRole.Admin);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GET /api/users/{id}
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetById_AsAdmin_AnyUser_Returns200()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id);
        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        // Admin looking up someone else's id
        var callerId = Guid.NewGuid();
        var result = await CreateController(role: "Admin", userId: callerId)
            .GetById(id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_AsUser_OwnRecord_Returns200()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id);
        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        var result = await CreateController(role: "User", userId: id)
            .GetById(id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_AsUser_OtherRecord_Returns403()
    {
        var id = Guid.NewGuid();
        _userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(MakeUser(id: id));

        // User caller trying to look up a different user's id
        var result = await CreateController(role: "User", userId: Guid.NewGuid())
            .GetById(id, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetById_UserNotFound_Returns404()
    {
        _userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        var id = Guid.NewGuid();
        var result = await CreateController(role: "Admin", userId: id)
            .GetById(id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PUT /api/users/{id}
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task UpdateUser_AsAdmin_CanChangeName_Returns200()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, name: "Old Name");

        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        var result = await CreateController(role: "Admin", userId: Guid.NewGuid())
            .UpdateUser(id, new UpdateUserRequest("New Name", null), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<UserResponse>()
          .Which.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateUser_AsAdmin_CanChangeAccessRole_Returns200()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, role: AccessRole.User);

        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        var result = await CreateController(role: "Admin", userId: Guid.NewGuid())
            .UpdateUser(id, new UpdateUserRequest(null, AccessRole.Admin), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<UserResponse>()
          .Which.AccessRole.Should().Be(AccessRole.Admin);
        user.AccessRole.Should().Be(AccessRole.Admin);
    }

    [Fact]
    public async Task UpdateUser_AsUser_CanUpdateOwnName_Returns200()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, name: "Old Name");

        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        var result = await CreateController(role: "User", userId: id)
            .UpdateUser(id, new UpdateUserRequest("Updated Name", null), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        user.Name.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateUser_AsUser_CannotChangeAccessRole_Returns403()
    {
        var id = Guid.NewGuid();

        var result = await CreateController(role: "User", userId: id)
            .UpdateUser(id, new UpdateUserRequest(null, AccessRole.Admin), CancellationToken.None);

        // Attempting to self-promote to Admin is forbidden
        result.Should().BeOfType<ForbidResult>();
        _userRepo.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
                         Times.Never);
    }

    [Fact]
    public async Task UpdateUser_AsUser_CannotUpdateOtherUser_Returns403()
    {
        var targetId = Guid.NewGuid();
        var callerId = Guid.NewGuid(); // different user

        var result = await CreateController(role: "User", userId: callerId)
            .UpdateUser(targetId, new UpdateUserRequest("Hacked Name", null), CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task UpdateUser_UserNotFound_Returns404()
    {
        _userRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        var id = Guid.NewGuid();
        var result = await CreateController(role: "Admin", userId: Guid.NewGuid())
            .UpdateUser(id, new UpdateUserRequest("Any Name", null), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task UpdateUser_EmptyName_DoesNotOverwriteExistingName()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, name: "Original Name");

        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        await CreateController(role: "Admin", userId: Guid.NewGuid())
            .UpdateUser(id, new UpdateUserRequest(null, null), CancellationToken.None);

        user.Name.Should().Be("Original Name");
    }

    [Fact]
    public async Task UpdateUser_AdminPromotesToViewer_Returns200WithViewer()
    {
        var id   = Guid.NewGuid();
        var user = MakeUser(id: id, role: AccessRole.User);

        _userRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        var result = await CreateController(role: "Admin", userId: Guid.NewGuid())
            .UpdateUser(id, new UpdateUserRequest(null, AccessRole.Viewer), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<UserResponse>()
          .Which.AccessRole.Should().Be(AccessRole.Viewer);
    }
}
