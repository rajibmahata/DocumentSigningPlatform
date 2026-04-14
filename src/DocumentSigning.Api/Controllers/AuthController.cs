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
    private readonly IMerchantRepository                _merchantRepo;

    public AuthController(
        IUserRepository                   userRepo,
        IEmailVerificationTokenRepository tokenRepo,
        IPasswordResetTokenRepository     resetTokenRepo,
        IOutboxQueueRepository            outboxRepo,
        IJwtService                       jwtService,
        IConfiguration                    config,
        IMerchantRepository               merchantRepo)
    {
        _userRepo       = userRepo;
        _tokenRepo      = tokenRepo;
        _resetTokenRepo = resetTokenRepo;
        _outboxRepo     = outboxRepo;
        _jwtService     = jwtService;
        _config         = config;
        _merchantRepo   = merchantRepo;
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
        if (!IsPasswordStrong(req.Password))
            return BadRequest(new
            {
                message = "Password must be at least 8 characters and contain uppercase, lowercase, and a number."
            });

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

        // Auto-create a default merchant only if the user has no existing merchant account
        var existingMerchants = await _merchantRepo.GetByUserIdAsync(user.Id, ct);
        if (!existingMerchants.Any())
        {
            var merchant = new Merchant
            {
                Id                = Guid.NewGuid(),
                UserId            = user.Id,
                Name              = $"{user.Name.Trim()}'s Workspace",
                Description       = "Auto-created on registration",
                ApiKey            = MerchantController.GenerateApiKey(),
                IsActive          = true,
                RequestLimit      = 100,
                RequestUsed       = 0,
                SubscriptionStart = DateTime.UtcNow,
                CreatedAt         = DateTime.UtcNow
            };
            await _merchantRepo.AddAsync(merchant, ct);
        }

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
        var frontendUrl = (_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');
        var record = await _tokenRepo.GetByTokenAsync(token, ct);

        if (record is null || record.IsUsed || record.ExpiresAt < DateTime.UtcNow)
            return Content(VerifyEmailPage(success: false, frontendUrl), "text/html");

        record.IsUsed = true;
        await _tokenRepo.UpdateAsync(record, ct);

        var user = await _userRepo.GetByIdAsync(record.UserId, ct);
        if (user is not null)
        {
            user.IsEmailVerified = true;
            await _userRepo.UpdateAsync(user, ct);
        }

        await _tokenRepo.SaveChangesAsync(ct);

        return Content(VerifyEmailPage(success: true, frontendUrl), "text/html");
    }

    private static string VerifyEmailPage(bool success, string frontendUrl)
    {
        var title        = success ? "Email Verified" : "Verification Failed";
        var heading      = success ? "Email Verified!" : "Verification Failed";
        var bgGrad       = success ? "#e8f5e9 0%, #e3f2fd 100%" : "#fff8e1 0%, #fce4ec 100%";
        var circleGrad   = success ? "#43a047, #66bb6a" : "#e53935, #ef5350";
        var circleShadow = success ? "rgba(67,160,71,0.35)" : "rgba(229,57,53,0.35)";
        var headingColor = success ? "#1b5e20" : "#b71c1c";
        var badgeBg      = success ? "#e8f5e9" : "#fce4ec";
        var badgeColor   = success ? "#2e7d32" : "#c62828";
        var icon = success
            ? "<polyline class=\"anim\" points=\"4 13 9 18 20 7\"/>"
            : "<line class=\"anim\" x1=\"5\" y1=\"5\" x2=\"19\" y2=\"19\"/><line class=\"anim\" style=\"animation-delay:.15s\" x1=\"19\" y1=\"5\" x2=\"5\" y2=\"19\"/>";
        var bodyText = success
            ? "Your email address has been <span class=\"badge\">successfully verified</span>.<br/>Your account is now active and ready to use."
            : "The link you followed is <span class=\"badge\">invalid or has expired</span>.<br/>Verification links are valid for 24&nbsp;hours.";
        var extraBlock = success ? ""
            : "<div class=\"tip\"><strong>What to do next:</strong> Request a new verification email or register again if you haven't already.</div>";
        var jsonMsg = success ? "Email verified successfully." : "Invalid or expired verification token.";

        return $$"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>{{title}} — Document Signing Platform</title>
              <style>
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
                body{
                  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
                  background:linear-gradient(135deg,{{bgGrad}});
                  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
                }
                .card{
                  background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.10);
                  max-width:480px;width:100%;padding:56px 48px 48px;text-align:center;
                  animation:fadeUp .5s ease both;
                }
                @keyframes fadeUp{
                  from{opacity:0;transform:translateY(24px)}
                  to{opacity:1;transform:translateY(0)}
                }
                .circle{
                  width:88px;height:88px;border-radius:50%;
                  background:linear-gradient(135deg,{{circleGrad}});
                  display:flex;align-items:center;justify-content:center;
                  margin:0 auto 32px;box-shadow:0 6px 20px {{circleShadow}};
                }
                .circle svg{width:44px;height:44px;stroke:#fff;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
                .anim{stroke-dasharray:60;stroke-dashoffset:60;animation:draw .45s .3s ease forwards}
                @keyframes draw{
                  to{stroke-dashoffset:0}
                }
                h1{font-size:1.75rem;font-weight:700;color:{{headingColor}};margin-bottom:12px;letter-spacing:-.3px}
                .sub{font-size:1rem;color:#546e7a;line-height:1.6;margin-bottom:28px}
                .badge{display:inline-block;background:{{badgeBg}};color:{{badgeColor}};font-weight:600;padding:2px 10px;border-radius:6px}
                .json-box{
                  background:#f5f5f5;border:1px solid #e0e0e0;border-radius:10px;
                  padding:16px 20px;font-family:"Courier New",monospace;font-size:.88rem;
                  color:#37474f;margin-bottom:32px;text-align:left;word-break:break-all;
                }
                .tip{
                  background:#fff8e1;border-left:4px solid #ffc107;border-radius:8px;
                  padding:12px 16px;font-size:.85rem;color:#5d4037;text-align:left;
                  line-height:1.6;margin-bottom:28px;
                }
                .btn{
                  display:inline-block;background:linear-gradient(135deg,#1565c0,#1976d2);
                  color:#fff;text-decoration:none;font-size:.95rem;font-weight:600;
                  padding:14px 36px;border-radius:12px;
                  box-shadow:0 4px 16px rgba(21,101,192,.30);
                  transition:transform .15s ease,box-shadow .15s ease;
                }
                .btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(21,101,192,.40)}
              </style>
            </head>
            <body>
              <div class="card">
                <div class="circle">
                  <svg viewBox="0 0 24 24">{{icon}}</svg>
                </div>
                <h1>{{heading}}</h1>
                <p class="sub">{{bodyText}}</p>
                <div class="json-box">{"message":"{{jsonMsg}}"}</div>
                {{extraBlock}}
                <a href="{{frontendUrl}}/dashboard" class="btn">Back to home</a>
              </div>
            </body>
            </html>
            """;
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

    /// <summary>Renders the password reset form page when a user clicks the reset link from their email.</summary>
    [HttpGet("reset-password/{token}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult ResetPasswordPage(string token)
    {
        var frontendUrl = (_config["App:FrontendUrl"] ?? "http://localhost:3000").TrimEnd('/');
        return Content(ResetPasswordHtml(token, frontendUrl), "text/html");
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

    private static string ResetPasswordHtml(string token, string frontendUrl) => $$"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Reset Password — Document Signing Platform</title>
          <style>
            *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
            body{
              font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
              background:linear-gradient(135deg,#e3f2fd 0%,#ede7f6 100%);
              min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
            }
            .card{
              background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.10);
              max-width:440px;width:100%;padding:48px 40px 40px;
              animation:fadeUp .5s ease both;
            }
            @keyframes fadeUp{
              from{opacity:0;transform:translateY(24px)}
              to{opacity:1;transform:translateY(0)}
            }
            .icon-circle{
              width:72px;height:72px;border-radius:50%;
              background:linear-gradient(135deg,#1565c0,#7b1fa2);
              display:flex;align-items:center;justify-content:center;
              margin:0 auto 28px;box-shadow:0 6px 20px rgba(21,101,192,.30);
            }
            .icon-circle svg{width:36px;height:36px;stroke:#fff;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}
            h1{font-size:1.5rem;font-weight:700;color:#1a237e;text-align:center;margin-bottom:8px}
            .sub{font-size:.9rem;color:#78909c;text-align:center;margin-bottom:32px;line-height:1.5}
            label{display:block;font-size:.82rem;font-weight:600;color:#455a64;margin-bottom:6px}
            .field{margin-bottom:20px;position:relative}
            input[type=password]{
              width:100%;padding:12px 42px 12px 14px;border:1.5px solid #cfd8dc;border-radius:10px;
              font-size:.95rem;color:#263238;outline:none;transition:border-color .2s;
            }
            input[type=password]:focus{border-color:#1976d2}
            .toggle{
              position:absolute;right:12px;top:50%;transform:translateY(-50%);
              background:none;border:none;cursor:pointer;padding:0;color:#90a4ae;
            }
            .hint{font-size:.75rem;color:#90a4ae;margin-top:4px}
            .btn{
              width:100%;padding:14px;background:linear-gradient(135deg,#1565c0,#7b1fa2);
              color:#fff;border:none;border-radius:12px;font-size:.97rem;font-weight:600;
              cursor:pointer;box-shadow:0 4px 16px rgba(21,101,192,.30);
              transition:transform .15s ease,box-shadow .15s ease;
            }
            .btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(21,101,192,.40)}
            .btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
            .alert{
              border-radius:10px;padding:12px 16px;font-size:.88rem;margin-bottom:20px;
              display:none;line-height:1.5;
            }
            .alert.error{background:#fce4ec;color:#c62828;border-left:4px solid #e53935}
            .alert.success{background:#e8f5e9;color:#2e7d32;border-left:4px solid #43a047}
            .footer{margin-top:28px;font-size:.78rem;color:#90a4ae;text-align:center}
            .footer a{color:#1976d2;text-decoration:none}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-circle">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1>Reset Password</h1>
            <p class="sub">Enter and confirm your new password below. It must be at least 8 characters and include uppercase, lowercase, and a number.</p>

            <div class="alert error" id="errAlert"></div>
            <div class="alert success" id="okAlert"></div>

            <div class="field">
              <label for="np">New Password</label>
              <input type="password" id="np" placeholder="New password" autocomplete="new-password"/>
              <button type="button" class="toggle" onclick="toggleVis('np',this)" tabindex="-1">
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="field">
              <label for="cp">Confirm Password</label>
              <input type="password" id="cp" placeholder="Confirm password" autocomplete="new-password"/>
              <button type="button" class="toggle" onclick="toggleVis('cp',this)" tabindex="-1">
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <p class="hint">Min 8 chars · uppercase · lowercase · number</p>
            </div>

            <button class="btn" id="submitBtn" onclick="submit()">Reset Password</button>

            <p class="footer"><a href="{{frontendUrl}}/dashboard">Back to home</a></p>
          </div>

          <script>
            const TOKEN = "{{token}}";

            function toggleVis(id, btn) {
              const el = document.getElementById(id);
              el.type = el.type === "password" ? "text" : "password";
            }

            async function submit() {
              const newPassword = document.getElementById("np").value;
              const confirm     = document.getElementById("cp").value;
              const errEl = document.getElementById("errAlert");
              const okEl  = document.getElementById("okAlert");
              const btn   = document.getElementById("submitBtn");

              errEl.style.display = "none";
              okEl.style.display  = "none";

              if (!newPassword || !confirm) {
                errEl.textContent = "Please fill in both fields.";
                errEl.style.display = "block";
                return;
              }
              if (newPassword !== confirm) {
                errEl.textContent = "Passwords do not match.";
                errEl.style.display = "block";
                return;
              }

              btn.disabled = true;
              btn.textContent = "Resetting…";

              try {
                const res = await fetch("/api/auth/reset-password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: TOKEN, newPassword, confirmPassword: confirm })
                });
                const data = await res.json();
                if (res.ok) {
                  okEl.textContent = data.message || "Password reset successfully. You can now log in.";
                  okEl.style.display = "block";
                  document.getElementById("np").value = "";
                  document.getElementById("cp").value = "";
                  btn.textContent = "Done!";
                } else {
                  errEl.textContent = data.message || "Something went wrong. Please try again.";
                  errEl.style.display = "block";
                  btn.disabled = false;
                  btn.textContent = "Reset Password";
                }
              } catch {
                errEl.textContent = "Network error. Please check your connection.";
                errEl.style.display = "block";
                btn.disabled = false;
                btn.textContent = "Reset Password";
              }
            }

            document.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
          </script>
        </body>
        </html>
        """;

    private static bool IsPasswordStrong(string password) =>
        password.Length >= 8 &&
        Regex.IsMatch(password, @"[A-Z]") &&
        Regex.IsMatch(password, @"[a-z]") &&
        Regex.IsMatch(password, @"[0-9]");
}
