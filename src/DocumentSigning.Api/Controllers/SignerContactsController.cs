using System.Security.Claims;
using System.Text;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Signer contact management. Each user owns their own contact list.
/// All endpoints require JWT authentication and operate only on the caller's contacts.
/// </summary>
[ApiController]
[Route("api/signer-contacts")]
[Authorize]
public class SignerContactsController : ControllerBase
{
    private readonly ISignerContactService _service;

    public SignerContactsController(ISignerContactService service) => _service = service;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── GET /api/signer-contacts ──────────────────────────────────────────────

    /// <summary>List all signer contacts for the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var contacts = await _service.GetAllAsync(CurrentUserId, ct);
        return Ok(contacts);
    }

    // ── GET /api/signer-contacts/search?query= ───────────────────────────────

    /// <summary>Search contacts by name or email (used for autocomplete on the send form).</summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Ok(Array.Empty<SignerContactResponse>());

        var contacts = await _service.SearchAsync(CurrentUserId, query, ct);
        return Ok(contacts);
    }

    // ── POST /api/signer-contacts ─────────────────────────────────────────────

    /// <summary>Create a new signer contact.</summary>
    [HttpPost]
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
    [HttpPut("{id:guid}")]
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
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await _service.DeleteAsync(CurrentUserId, id, ct);
        return deleted ? NoContent() : NotFound();
    }

    // ── POST /api/signer-contacts/import ─────────────────────────────────────

    /// <summary>
    /// Import contacts from a CSV file upload.
    /// Expected CSV columns: Name, Email, Role (optional), Phone (optional), Company (optional).
    /// </summary>
    [HttpPost("import")]
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
    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var csv   = await _service.ExportCsvAsync(CurrentUserId, ct);
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "signer-contacts.csv");
    }
}
