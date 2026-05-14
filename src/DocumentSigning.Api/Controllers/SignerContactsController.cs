using System.Security.Claims;
using System.Text;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Signer contact management. Each user owns their own contact list.
/// All endpoints require JWT authentication and operate only on the caller's contacts.
/// </summary>
[ApiController]
[Route("api/signer-contacts")]
[Authorize]
[Produces("application/json")]
public class SignerContactsController : ControllerBase
{
    private readonly ISignerContactService _service;

    public SignerContactsController(ISignerContactService service) => _service = service;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET /api/signer-contacts ──────────────────────────────────────────────

    /// <summary>List all signer contacts for the authenticated user.</summary>
    /// <remarks>Returns all active contacts belonging to the caller, sorted by name.</remarks>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SignerContactResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var contacts = await _service.GetAllAsync(CurrentUserId, ct);
        return Ok(contacts);
    }

    // ── GET /api/signer-contacts/search?query= ───────────────────────────────

    /// <summary>Search contacts by name or email (used for autocomplete on the send form).</summary>
    /// <remarks>
    /// Case-insensitive substring match on both `name` and `email`.
    /// Returns up to 10 results. Accepts either `query` or `q` as the search parameter.
    /// Pass an empty query to receive an empty array.
    /// </remarks>
    /// <param name="query">Partial name or email to search for (alias: `q`).</param>
    /// <param name="q">Short alias for the `query` parameter.</param>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IReadOnlyList<SignerContactResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Search(
        [FromQuery] string? query,
        [FromQuery(Name = "q")] string? q,
        CancellationToken ct)
    {
        var term = query ?? q;
        if (string.IsNullOrWhiteSpace(term))
            return Ok(Array.Empty<SignerContactResponse>());

        var contacts = await _service.SearchAsync(CurrentUserId, term, ct);
        return Ok(contacts);
    }

    // ── POST /api/signer-contacts ─────────────────────────────────────────────

    /// <summary>Create a new signer contact.</summary>
    /// <remarks>
    /// `email` must be unique per user — returns `409 Conflict` if a contact with that email already exists.
    /// `role` defaults to `"signer"` when omitted.
    /// </remarks>
    [HttpPost]
    [ProducesResponseType(typeof(SignerContactResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateSignerContactRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        try
        {
            var contact = await _service.CreateAsync(CurrentUserId, request, ct);
            return CreatedAtAction(nameof(GetAll), new { }, contact);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // ── PUT /api/signer-contacts/{id} ─────────────────────────────────────────

    /// <summary>Update an existing signer contact.</summary>
    /// <remarks>
    /// All writable fields are replaced. Set `isActive` to `false` to disable the contact
    /// without deleting it. Returns `404` if the contact does not exist or belongs to another user.
    /// </remarks>
    /// <param name="id">The contact ID to update.</param>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SignerContactResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSignerContactRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email is required.");

        try
        {
            var contact = await _service.UpdateAsync(CurrentUserId, id, request, ct);
            if (contact is null) return NotFound();
            return Ok(contact);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // ── DELETE /api/signer-contacts/{id} ─────────────────────────────────────

    /// <summary>Soft-delete a signer contact.</summary>
    /// <remarks>
    /// Sets `isActive = false`. The contact remains in the database and can be restored via `PUT`.
    /// Returns `404` if the contact does not exist or belongs to another user.
    /// </remarks>
    /// <param name="id">The contact ID to delete.</param>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(CurrentUserId, id, ct);
        return deleted ? NoContent() : NotFound();
    }

    // ── POST /api/signer-contacts/import ─────────────────────────────────────

    /// <summary>Import contacts from a CSV file upload.</summary>
    /// <remarks>
    /// Accepts a `multipart/form-data` request with a single `.csv` file in the `file` field.
    ///
    /// **Required CSV columns:** `name`, `email`
    ///
    /// **Optional CSV columns:** `role` (default: `signer`), `phone`, `company`
    ///
    /// Existing contacts matched by email are updated; new ones are inserted.
    /// Returns an import summary with `imported`, `skipped`, `failed`, and `errors` counts.
    /// </remarks>
    [HttpPost("import")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(SignerContactImportResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Import(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
            return BadRequest("Only .csv files are supported.");

        string csvContent;
        using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
            csvContent = await reader.ReadToEndAsync(ct);

        var result = await _service.ImportCsvAsync(CurrentUserId, csvContent, ct);
        return Ok(result);
    }

    // ── GET /api/signer-contacts/export ──────────────────────────────────────

    /// <summary>Export all contacts as a CSV file download.</summary>
    /// <remarks>
    /// Returns a `text/csv` file named `signer-contacts.csv` containing all contacts
    /// (both active and inactive) for the authenticated user.
    ///
    /// **CSV columns:** `Name`, `Email`, `Role`, `Phone`, `Company`, `IsActive`, `CreatedAt`
    /// </remarks>
    [HttpGet("export")]
    [Produces("text/csv")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var csv   = await _service.ExportCsvAsync(CurrentUserId, ct);
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "signer-contacts.csv");
    }
}
