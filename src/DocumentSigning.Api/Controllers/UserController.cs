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

    public UserController(IUserRepository userRepo) => _userRepo = userRepo;

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

    private static UserResponse ToResponse(Core.Entities.User u) =>
        new(u.Id, u.Name, u.Email, u.Country, u.IsEmailVerified, u.AccessRole, u.CreatedAt);
}
