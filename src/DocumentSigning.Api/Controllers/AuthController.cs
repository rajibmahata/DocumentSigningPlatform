using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using DocumentSigning.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository                    _userRepo;
    private readonly IEmailVerificationTokenRepository  _tokenRepo;
    private readonly IPasswordResetTokenRepository      _resetTokenRepo;
    private readonly IOutboxQueueRepository             _outboxRepo;
    private readonly IJwtService                        _jwtService;
    private readonly IConfiguration                     _config;

    public AuthController(
        IUserRepository                   userRepo,
        IEmailVerificationTokenRepository tokenRepo,
        IPasswordResetTokenRepository     resetTokenRepo,
        IOutboxQueueRepository            outboxRepo,
        IJwtService                       jwtService,
        IConfiguration                    config)
    {
        _userRepo       = userRepo;
        _tokenRepo      = tokenRepo;
        _resetTokenRepo = resetTokenRepo;
        _outboxRepo     = outboxRepo;
        _jwtService     = jwtService;
        _config         = config;
    }

    /// <summary>Register a new user account.</summary>
    /// <remarks>Returns 201 on success. Sends a verification email.</remarks>
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest req,
        CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        var existing = await _userRepo.GetByEmailAsync(normalizedEmail, ct);
        if (existing is not null)
            return Conflict(new { message = "Email is already registered." });

        var user = new User
        {
            Id              = Guid.NewGuid(),
            Name            = req.Name.Trim(),
            Email           = normalizedEmail,
            PasswordHash    = PasswordHelper.Hash(req.Password),
            Country         = req.Country?.Trim(),
            IsEmailVerified = false,
            AccessRole      = req.AccessRole ?? AccessRole.User,
            CreatedAt       = DateTime.UtcNow
        };

        await _userRepo.CreateAsync(user, ct);

        // Create email verification token (URL-safe base64, 48-byte random)
        var rawToken    = RandomNumberGenerator.GetBytes(48);
        var tokenString = Convert.ToBase64String(rawToken)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var verificationRecord = new EmailVerificationToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            Token     = tokenString,
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            IsUsed    = false
        };

        await _tokenRepo.CreateAsync(verificationRecord, ct);

        // Enqueue verification email via outbox
        var baseUrl          = _config["App:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5163";
        var verificationLink = $"{baseUrl}/api/auth/verify-email/{Uri.EscapeDataString(tokenString)}";

        var outboxJob = new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.SendVerificationEmail,
            Payload   = JsonSerializer.Serialize(
                            new VerificationEmailPayload(normalizedEmail, user.Name, verificationLink)),
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        await _outboxRepo.AddAsync(outboxJob, ct);
        await _userRepo.SaveChangesAsync(ct);   // saves User + EmailVerificationToken + OutboxJob (same DbContext)

        return StatusCode(StatusCodes.Status201Created);
    }

    /// <summary>Authenticate with email and password.</summary>
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req,
        CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();

        var user = await _userRepo.GetByEmailAsync(normalizedEmail, ct);
        if (user is null || !PasswordHelper.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var jwt = _jwtService.GenerateToken(user);
        return Ok(new LoginResponse(jwt, user.IsEmailVerified));
    }

    /// <summary>Verify email address using the token sent by email.</summary>
    [HttpGet("verify-email/{token}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail(
        string token,
        CancellationToken ct)
    {
        var record = await _tokenRepo.GetByTokenAsync(token, ct);

        if (record is null || record.IsUsed || record.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Invalid or expired verification token." });

        record.IsUsed = true;
        await _tokenRepo.UpdateAsync(record, ct);

        var user = await _userRepo.GetByIdAsync(record.UserId, ct);
        if (user is not null)
        {
            user.IsEmailVerified = true;
            await _userRepo.UpdateAsync(user, ct);
        }

        await _tokenRepo.SaveChangesAsync(ct);

        return Ok(new { message = "Email verified successfully." });
    }

    /// <summary>Request a password reset link. Always returns the same message to prevent user enumeration.</summary>
    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest req,
        CancellationToken ct)
    {
        var silentResponse = Ok(new { message = "If the email exists, a reset link has been sent." });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _userRepo.GetByEmailAsync(normalizedEmail, ct);
        if (user is null)
            return silentResponse; // never reveal whether email exists

        var rawToken    = RandomNumberGenerator.GetBytes(48);
        var tokenString = Convert.ToBase64String(rawToken)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var resetRecord = new PasswordResetToken
        {
            Id        = Guid.NewGuid(),
            UserId    = user.Id,
            Token     = tokenString,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed    = false,
            CreatedAt = DateTime.UtcNow
        };

        await _resetTokenRepo.CreateAsync(resetRecord, ct);

        var baseUrl    = _config["App:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5163";
        var resetLink  = $"{baseUrl}/api/auth/reset-password/{Uri.EscapeDataString(tokenString)}";

        var outboxJob = new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.SendPasswordReset,
            Payload   = JsonSerializer.Serialize(
                            new PasswordResetEmailPayload(normalizedEmail, user.Name, resetLink)),
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        await _outboxRepo.AddAsync(outboxJob, ct);
        await _resetTokenRepo.SaveChangesAsync(ct);

        return silentResponse;
    }

    /// <summary>Reset the user's password using a valid reset token.</summary>
    [HttpPost("reset-password")]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest req,
        CancellationToken ct)
    {
        if (!IsPasswordStrong(req.NewPassword))
            return BadRequest(new
            {
                message = "Password must be at least 8 characters and contain uppercase, lowercase, and a number."
            });

        var record = await _resetTokenRepo.GetByTokenAsync(req.Token, ct);
        if (record is null || record.IsUsed || record.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Invalid or expired reset token." });

        record.IsUsed = true;
        await _resetTokenRepo.UpdateAsync(record, ct);

        var user = await _userRepo.GetByIdAsync(record.UserId, ct);
        if (user is not null)
        {
            user.PasswordHash = PasswordHelper.Hash(req.NewPassword);
            await _userRepo.UpdateAsync(user, ct);
        }

        await _resetTokenRepo.SaveChangesAsync(ct);

        return Ok(new { message = "Password has been reset successfully." });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private static bool IsPasswordStrong(string password) =>
        password.Length >= 8 &&
        Regex.IsMatch(password, @"[A-Z]") &&
        Regex.IsMatch(password, @"[a-z]") &&
        Regex.IsMatch(password, @"[0-9]");
}
