using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class AuthControllerTests
{
    // ── Shared mocks ─────────────────────────────────────────────────────────

    private readonly Mock<IUserRepository>                    _userRepo       = new();
    private readonly Mock<IEmailVerificationTokenRepository>  _tokenRepo      = new();
    private readonly Mock<IPasswordResetTokenRepository>      _resetTokenRepo = new();
    private readonly Mock<IOutboxQueueRepository>             _outboxRepo     = new();
    private readonly Mock<IJwtService>                        _jwtService     = new();
    private readonly Mock<IMerchantRepository>                _merchantRepo   = new();
    private readonly IConfiguration                           _config;

    public AuthControllerTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "App:BaseUrl", "http://localhost:5163" }
            })
            .Build();

        // Default: all write operations succeed
        _userRepo.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                 .Returns(Task.CompletedTask);

        _tokenRepo.Setup(r => r.CreateAsync(It.IsAny<EmailVerificationToken>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);
        _tokenRepo.Setup(r => r.UpdateAsync(It.IsAny<EmailVerificationToken>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);
        _tokenRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _resetTokenRepo.Setup(r => r.CreateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
                       .Returns(Task.CompletedTask);
        _resetTokenRepo.Setup(r => r.UpdateAsync(It.IsAny<PasswordResetToken>(), It.IsAny<CancellationToken>()))
                       .Returns(Task.CompletedTask);
        _resetTokenRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                       .Returns(Task.CompletedTask);

        _outboxRepo.Setup(r => r.AddAsync(It.IsAny<OutboxQueue>(), It.IsAny<CancellationToken>()))
                   .Returns(Task.CompletedTask);

        _merchantRepo.Setup(r => r.AddAsync(It.IsAny<Core.Entities.Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new List<Core.Entities.Merchant>().AsReadOnly());
    }

    private readonly Mock<IAuditService> _audit = new();

    private AuthController CreateController() =>
        new(_userRepo.Object, _tokenRepo.Object, _resetTokenRepo.Object,
            _outboxRepo.Object, _jwtService.Object, _config, _merchantRepo.Object, _audit.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

    // ═════════════════════════════════════════════════════════════════════════
    // Register
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Register_NewEmail_Returns201()
    {
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        var result = await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", "India"),
            CancellationToken.None);

        result.Should().BeOfType<StatusCodeResult>()
              .Which.StatusCode.Should().Be(StatusCodes.Status201Created);
    }

    [Theory]
    [InlineData("short1A")]          // too short (7 chars)
    [InlineData("alllowercase1")]    // no uppercase
    [InlineData("ALLUPPERCASE1")]    // no lowercase
    [InlineData("NoDigitsHere")]     // no number
    [InlineData("12345678")]         // no letters
    public async Task Register_WeakPassword_Returns400(string weakPassword)
    {
        var result = await CreateController().Register(
            new RegisterRequest("John", "john@example.com", weakPassword, null),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
              .Which.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new User { Id = Guid.NewGuid(), Email = "john@example.com" });

        var result = await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task Register_NormalizesEmailToLowercase()
    {
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        await CreateController().Register(
            new RegisterRequest("John", "JOHN@EXAMPLE.COM", "Password1", null),
            CancellationToken.None);

        // SaveChangesAsync on user repo should have been called
        _userRepo.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Register_EnqueuesVerificationEmailOutboxJob()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        _outboxRepo.Verify(r => r.AddAsync(
            It.Is<OutboxQueue>(j => j.JobType == "SendVerificationEmail"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Register_CreatesEmailVerificationToken()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        _tokenRepo.Verify(r => r.CreateAsync(
            It.Is<EmailVerificationToken>(t => !t.IsUsed && t.ExpiresAt > DateTime.UtcNow),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Register_AutoCreatesMerchant_WhenUserHasNone()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);
        // GetByUserIdAsync returns empty → should auto-create
        _merchantRepo.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new List<Core.Entities.Merchant>().AsReadOnly());

        await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        _merchantRepo.Verify(r => r.AddAsync(
            It.Is<Core.Entities.Merchant>(m => m.Name.Contains("John") && m.IsActive),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Register_SkipsMerchantCreation_WhenUserAlreadyHasOne()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);
        // GetByUserIdAsync returns an existing merchant → should NOT auto-create
        _merchantRepo.Setup(r => r.GetByUserIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new List<Core.Entities.Merchant>
                     {
                         new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "Existing", ApiKey = "msk_x", CreatedAt = DateTime.UtcNow }
                     }.AsReadOnly());

        await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        _merchantRepo.Verify(r => r.AddAsync(
            It.IsAny<Core.Entities.Merchant>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Login
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithToken()
    {
        var password = "Password1";
        var user = new User
        {
            Id              = Guid.NewGuid(),
            Email           = "john@example.com",
            Name            = "John",
            PasswordHash    = PasswordHelper.Hash(password),
            IsEmailVerified = true
        };

        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _jwtService.Setup(j => j.GenerateToken(user)).Returns("jwt-token-abc");

        var result = await CreateController().Login(
            new LoginRequest("john@example.com", password),
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<LoginResponse>().Subject;
        response.Token.Should().Be("jwt-token-abc");
        response.IsEmailVerified.Should().BeTrue();
    }

    [Fact]
    public async Task Login_UserNotFound_Returns401()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        var result = await CreateController().Login(
            new LoginRequest("nobody@example.com", "Password1"),
            CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var user = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "john@example.com",
            PasswordHash = PasswordHelper.Hash("CorrectPassword1")
        };

        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        var result = await CreateController().Login(
            new LoginRequest("john@example.com", "WrongPassword1"),
            CancellationToken.None);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Login_UnverifiedEmail_ReturnsIsEmailVerifiedFalse()
    {
        var password = "Password1";
        var user = new User
        {
            Id              = Guid.NewGuid(),
            Email           = "john@example.com",
            PasswordHash    = PasswordHelper.Hash(password),
            IsEmailVerified = false
        };

        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _jwtService.Setup(j => j.GenerateToken(user)).Returns("jwt-token");

        var result = await CreateController().Login(
            new LoginRequest("john@example.com", password),
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<LoginResponse>().Subject;
        response.IsEmailVerified.Should().BeFalse();
    }

    [Fact]
    public async Task Login_NormalizesEmailToLowercase()
    {
        var password = "Password1";
        var user = new User
        {
            Id           = Guid.NewGuid(),
            Email        = "john@example.com",
            PasswordHash = PasswordHelper.Hash(password)
        };

        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);
        _jwtService.Setup(j => j.GenerateToken(user)).Returns("jwt-token");

        var result = await CreateController().Login(
            new LoginRequest("JOHN@EXAMPLE.COM", password),
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // VerifyEmail
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task VerifyEmail_ValidToken_Returns200AndMarksUsed()
    {
        var userId = Guid.NewGuid();
        var record = new EmailVerificationToken
        {
            Id        = Guid.NewGuid(),
            UserId    = userId,
            Token     = "valid-token",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed    = false
        };
        var user = new User { Id = userId, IsEmailVerified = false };

        _tokenRepo.Setup(r => r.GetByTokenAsync("valid-token", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(record);
        _userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        var result = await CreateController().VerifyEmail("valid-token", CancellationToken.None);

        var content = result.Should().BeOfType<ContentResult>().Subject;
        content.ContentType.Should().Be("text/html");
        content.Content.Should().Contain("Email verified successfully.");
        record.IsUsed.Should().BeTrue();
        user.IsEmailVerified.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyEmail_TokenNotFound_Returns400()
    {
        _tokenRepo.Setup(r => r.GetByTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync((EmailVerificationToken?)null);

        var result = await CreateController().VerifyEmail("bad-token", CancellationToken.None);

        var content = result.Should().BeOfType<ContentResult>().Subject;
        content.ContentType.Should().Be("text/html");
        content.Content.Should().Contain("Invalid or expired");
    }

    [Fact]
    public async Task VerifyEmail_AlreadyUsedToken_Returns400()
    {
        var record = new EmailVerificationToken
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(),
            Token = "used-token", ExpiresAt = DateTime.UtcNow.AddHours(1), IsUsed = true
        };
        _tokenRepo.Setup(r => r.GetByTokenAsync("used-token", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(record);

        var result = await CreateController().VerifyEmail("used-token", CancellationToken.None);

        var content = result.Should().BeOfType<ContentResult>().Subject;
        content.ContentType.Should().Be("text/html");
        content.Content.Should().Contain("Invalid or expired");
    }

    [Fact]
    public async Task VerifyEmail_ExpiredToken_Returns400()
    {
        var record = new EmailVerificationToken
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(),
            Token = "expired-token", ExpiresAt = DateTime.UtcNow.AddHours(-1), IsUsed = false
        };
        _tokenRepo.Setup(r => r.GetByTokenAsync("expired-token", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(record);

        var result = await CreateController().VerifyEmail("expired-token", CancellationToken.None);

        var content = result.Should().BeOfType<ContentResult>().Subject;
        content.ContentType.Should().Be("text/html");
        content.Content.Should().Contain("Invalid or expired");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ForgotPassword
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task ForgotPassword_ExistingEmail_Returns200SilentMessage()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "john@example.com", Name = "John" };
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        var result = await CreateController().ForgotPassword(
            new ForgotPasswordRequest("john@example.com"),
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value!.ToString().Should().Contain("reset link");
    }

    [Fact]
    public async Task ForgotPassword_NonExistingEmail_StillReturns200SilentMessage()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        var result = await CreateController().ForgotPassword(
            new ForgotPasswordRequest("ghost@example.com"),
            CancellationToken.None);

        // Must still return 200 — never reveal whether email exists
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task ForgotPassword_ExistingEmail_EnqueuesPasswordResetEmailOutboxJob()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "john@example.com", Name = "John" };
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        await CreateController().ForgotPassword(
            new ForgotPasswordRequest("john@example.com"),
            CancellationToken.None);

        _outboxRepo.Verify(r => r.AddAsync(
            It.Is<OutboxQueue>(j => j.JobType == "SendPasswordReset"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ForgotPassword_NonExistingEmail_DoesNotEnqueueAnyJob()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        await CreateController().ForgotPassword(
            new ForgotPasswordRequest("ghost@example.com"),
            CancellationToken.None);

        _outboxRepo.Verify(r => r.AddAsync(It.IsAny<OutboxQueue>(), It.IsAny<CancellationToken>()),
                           Times.Never);
    }

    [Fact]
    public async Task ForgotPassword_ExistingEmail_CreatesResetTokenExpiringInOneHour()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "john@example.com", Name = "John" };
        _userRepo.Setup(r => r.GetByEmailAsync("john@example.com", It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        await CreateController().ForgotPassword(
            new ForgotPasswordRequest("john@example.com"),
            CancellationToken.None);

        _resetTokenRepo.Verify(r => r.CreateAsync(
            It.Is<PasswordResetToken>(t =>
                !t.IsUsed &&
                t.ExpiresAt > DateTime.UtcNow &&
                t.ExpiresAt <= DateTime.UtcNow.AddHours(1).AddSeconds(5)),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ResetPassword
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task ResetPassword_ValidTokenAndStrongPassword_Returns200()
    {
        var userId = Guid.NewGuid();
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = userId,
            Token = "reset-token", ExpiresAt = DateTime.UtcNow.AddMinutes(30), IsUsed = false
        };
        var user = new User { Id = userId, PasswordHash = PasswordHelper.Hash("OldPassword1") };

        _resetTokenRepo.Setup(r => r.GetByTokenAsync("reset-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);
        _userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        var result = await CreateController().ResetPassword(
            new ResetPasswordRequest("reset-token", "NewPassword1"),
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        record.IsUsed.Should().BeTrue();
        PasswordHelper.Verify("NewPassword1", user.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPassword_TokenNotFound_Returns400()
    {
        _resetTokenRepo.Setup(r => r.GetByTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                       .ReturnsAsync((PasswordResetToken?)null);

        var result = await CreateController().ResetPassword(
            new ResetPasswordRequest("bad-token", "NewPassword1"),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ResetPassword_AlreadyUsedToken_Returns400()
    {
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(),
            Token = "used-token", ExpiresAt = DateTime.UtcNow.AddMinutes(30), IsUsed = true
        };
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("used-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);

        var result = await CreateController().ResetPassword(
            new ResetPasswordRequest("used-token", "NewPassword1"),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_Returns400()
    {
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(),
            Token = "expired-token", ExpiresAt = DateTime.UtcNow.AddHours(-1), IsUsed = false
        };
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("expired-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);

        var result = await CreateController().ResetPassword(
            new ResetPasswordRequest("expired-token", "NewPassword1"),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("short1")]         // < 8 chars
    [InlineData("alllowercase1")]  // no uppercase
    [InlineData("ALLUPPERCASE1")]  // no lowercase
    [InlineData("NoNumbers!!")]    // no digit
    public async Task ResetPassword_WeakPassword_Returns400(string weakPassword)
    {
        var result = await CreateController().ResetPassword(
            new ResetPasswordRequest("some-token", weakPassword),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        // No token lookup should happen when password is weak
        _resetTokenRepo.Verify(r => r.GetByTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                                Times.Never);
    }

    [Fact]
    public async Task ResetPassword_ValidReset_MarksTokenAsUsed()
    {
        var userId = Guid.NewGuid();
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = userId,
            Token = "reset-token", ExpiresAt = DateTime.UtcNow.AddMinutes(30), IsUsed = false
        };
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("reset-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);
        _userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new User { Id = userId, PasswordHash = PasswordHelper.Hash("Old1Password") });

        await CreateController().ResetPassword(
            new ResetPasswordRequest("reset-token", "NewPassword1"),
            CancellationToken.None);

        record.IsUsed.Should().BeTrue();
        _resetTokenRepo.Verify(r => r.UpdateAsync(record, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_ValidReset_UpdatesPasswordHash()
    {
        var userId = Guid.NewGuid();
        var user   = new User { Id = userId, PasswordHash = PasswordHelper.Hash("OldPassword1") };
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = userId,
            Token = "reset-token", ExpiresAt = DateTime.UtcNow.AddMinutes(30), IsUsed = false
        };
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("reset-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);
        _userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(user);

        await CreateController().ResetPassword(
            new ResetPasswordRequest("reset-token", "NewPassword1"),
            CancellationToken.None);

        PasswordHelper.Verify("OldPassword1", user.PasswordHash).Should().BeFalse();
        PasswordHelper.Verify("NewPassword1", user.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPassword_TokenIsNotReusable()
    {
        var userId = Guid.NewGuid();
        var record = new PasswordResetToken
        {
            Id = Guid.NewGuid(), UserId = userId,
            Token = "one-time-token", ExpiresAt = DateTime.UtcNow.AddMinutes(30), IsUsed = false
        };
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("one-time-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record);
        _userRepo.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new User { Id = userId, PasswordHash = PasswordHelper.Hash("OldPassword1") });

        // First use — succeeds
        await CreateController().ResetPassword(
            new ResetPasswordRequest("one-time-token", "NewPassword1"),
            CancellationToken.None);

        // Token is now used — simulate what the DB would return on second use
        _resetTokenRepo.Setup(r => r.GetByTokenAsync("one-time-token", It.IsAny<CancellationToken>()))
                       .ReturnsAsync(record); // record.IsUsed is now true in-memory

        var secondResult = await CreateController().ResetPassword(
            new ResetPasswordRequest("one-time-token", "AnotherPass1"),
            CancellationToken.None);

        secondResult.Should().BeOfType<BadRequestObjectResult>();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Register – AccessRole
    // ═════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Register_WithoutAccessRole_DefaultsToUser()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        User? captured = null;
        _userRepo.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Callback<User, CancellationToken>((u, _) => captured = u)
                 .Returns(Task.CompletedTask);

        await CreateController().Register(
            new RegisterRequest("John", "john@example.com", "Password1", null),
            CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.AccessRole.Should().Be(AccessRole.User);
    }

    [Fact]
    public async Task Register_WithAdminAccessRole_SetsAdmin()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        User? captured = null;
        _userRepo.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Callback<User, CancellationToken>((u, _) => captured = u)
                 .Returns(Task.CompletedTask);

        await CreateController().Register(
            new RegisterRequest("Admin", "admin@example.com", "Password1", null, AccessRole.Admin),
            CancellationToken.None);

        captured!.AccessRole.Should().Be(AccessRole.Admin);
    }

    [Fact]
    public async Task Register_WithViewerAccessRole_SetsViewer()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync((User?)null);

        User? captured = null;
        _userRepo.Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                 .Callback<User, CancellationToken>((u, _) => captured = u)
                 .Returns(Task.CompletedTask);

        await CreateController().Register(
            new RegisterRequest("Viewer", "viewer@example.com", "Password1", null, AccessRole.Viewer),
            CancellationToken.None);

        captured!.AccessRole.Should().Be(AccessRole.Viewer);
    }
}
