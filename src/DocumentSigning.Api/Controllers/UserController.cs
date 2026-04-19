using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// User management endpoints.
/// Admin → full control (list, view, update any user).
/// User  → can view and update their own profile.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserRepository _userRepo;
    private readonly IEmailService    _emailService;
    private readonly IAuditService    _audit;

    public UserController(
        IUserRepository userRepo,
        IEmailService   emailService,
        IAuditService   audit)
    {
        _userRepo     = userRepo;
        _emailService = emailService;
        _audit        = audit;
    }

    private Guid? CallerUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    /// <summary>List all users. Requires Admin role.</summary>
    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(IEnumerable<UserResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var users = await _userRepo.GetAllAsync(ct);
        var response = users.Select(ToResponse);
        return Ok(response);
    }

    /// <summary>
    /// Get a user by ID.
    /// Admins may look up any user. Users may only look up themselves.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var callerId = CallerUserId();
        if (!User.IsInRole("Admin") && callerId != id)
            return Forbid();

        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null)
            return NotFound();

        return Ok(ToResponse(user));
    }

    /// <summary>
    /// Update a user''s Name and/or AccessRole.
    /// Admins may update any user. Users may only update their own Name
    /// (AccessRole changes require Admin).
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest req,
        CancellationToken ct)
    {
        var callerId = CallerUserId();
        if (!User.IsInRole("Admin"))
        {
            if (callerId != id)
                return Forbid();
            if (req.AccessRole.HasValue)
                return Forbid();
        }

        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Name))
            user.Name = req.Name.Trim();
        if (req.AccessRole.HasValue)
            user.AccessRole = req.AccessRole.Value;

        await _userRepo.UpdateAsync(user, ct);
        await _userRepo.SaveChangesAsync(ct);

        return Ok(ToResponse(user));
    }

    /// <summary>List admin users pending activation. Requires Admin role.</summary>
    [HttpGet("/api/admin/users/pending")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(IEnumerable<UserResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingAdmins(CancellationToken ct)
    {
        var users = await _userRepo.GetPendingAdminsAsync(ct);
        return Ok(users.Select(ToResponse));
    }

    /// <summary>Activate a user account. Requires Admin role.</summary>
    [HttpPost("/api/admin/users/{id:guid}/activate")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateUser(Guid id, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        user.IsActive = true;
        await _userRepo.UpdateAsync(user, ct);
        await _userRepo.SaveChangesAsync(ct);

        _ = _emailService.SendAccountActivatedAsync(user.Email, user.Name)
            .ContinueWith(t => { /* fire-and-forget */ }, TaskContinuationOptions.OnlyOnFaulted);

        _audit.Log(new AuditEntry(
            Action:      DocumentSigning.Core.Enums.AuditActions.UserActivated,
            EntityType:  DocumentSigning.Core.Enums.AuditEntities.User,
            EntityId:    id,
            Description: $"User {user.Email} activated by admin."));

        return Ok(ToResponse(user));
    }

    /// <summary>Deactivate a user account. Requires Admin role.</summary>
    [HttpPost("/api/admin/users/{id:guid}/deactivate")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateUser(Guid id, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        user.IsActive = false;
        await _userRepo.UpdateAsync(user, ct);
        await _userRepo.SaveChangesAsync(ct);

        _audit.Log(new AuditEntry(
            Action:      DocumentSigning.Core.Enums.AuditActions.UserDeactivated,
            EntityType:  DocumentSigning.Core.Enums.AuditEntities.User,
            EntityId:    id,
            Description: $"User {user.Email} deactivated by admin."));

        return Ok(ToResponse(user));
    }

    private static UserResponse ToResponse(Core.Entities.User u) =>
        new(u.Id, u.Name, u.Email, u.Country, u.IsEmailVerified, u.IsActive, u.AccessRole, u.CreatedAt);
}
