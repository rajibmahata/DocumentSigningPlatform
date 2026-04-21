using System.Security.Claims;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Document template CRUD — reusable envelope configurations for merchants.
/// All endpoints require JWT authentication. Merchants can only access their own templates.
/// </summary>
[ApiController]
[Route("api/templates")]
[Authorize]
[Produces("application/json")]
public class TemplatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMerchantRepository _merchantRepo;

    public TemplatesController(AppDbContext db, IMerchantRepository merchantRepo)
    {
        _db           = db;
        _merchantRepo = merchantRepo;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<Merchant?> ResolveCurrentMerchantAsync(CancellationToken ct)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(CurrentUserId, ct);
        return merchants.FirstOrDefault();
    }

    private static TemplateResponse ToResponse(DocumentTemplate t, List<TemplateSigner> signers) =>
        new(t.Id, t.MerchantId, t.Name, t.Description, t.DefaultTitle, signers, t.CreatedAt, t.UpdatedAt);

    private static List<TemplateSigner> Deserialize(string json)
    {
        try { return JsonSerializer.Deserialize<List<TemplateSigner>>(json, _opts) ?? []; }
        catch { return []; }
    }

    private static readonly JsonSerializerOptions _opts = new(JsonSerializerDefaults.Web);

    // ── GET /api/templates ────────────────────────────────────────────────────

    /// <summary>List all templates belonging to the caller's merchant.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TemplateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var merchant = await ResolveCurrentMerchantAsync(ct);
        if (merchant is null) return NotFound("No merchant account found for this user.");

        var templates = await _db.DocumentTemplates
            .Where(t => t.MerchantId == merchant.Id)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(ct);

        var result = templates.Select(t => ToResponse(t, Deserialize(t.SignersJson))).ToList();
        return Ok(result);
    }

    // ── GET /api/templates/{id} ───────────────────────────────────────────────

    /// <summary>Get a single template by ID.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var merchant = await ResolveCurrentMerchantAsync(ct);
        if (merchant is null) return NotFound("No merchant account found for this user.");

        var template = await _db.DocumentTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.MerchantId == merchant.Id, ct);

        if (template is null) return NotFound();

        return Ok(ToResponse(template, Deserialize(template.SignersJson)));
    }

    // ── POST /api/templates ───────────────────────────────────────────────────

    /// <summary>Create a new document template.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(TemplateResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateTemplateRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var merchant = await ResolveCurrentMerchantAsync(ct);
        if (merchant is null) return NotFound("No merchant account found for this user.");

        var template = new DocumentTemplate
        {
            MerchantId   = merchant.Id,
            Name         = req.Name.Trim(),
            Description  = req.Description?.Trim(),
            DefaultTitle = req.DefaultTitle.Trim(),
            SignersJson  = JsonSerializer.Serialize(req.Signers, _opts),
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow,
        };

        await _db.DocumentTemplates.AddAsync(template, ct);
        await _db.SaveChangesAsync(ct);

        var response = ToResponse(template, req.Signers);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, response);
    }

    // ── PUT /api/templates/{id} ───────────────────────────────────────────────

    /// <summary>Update an existing template.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(TemplateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTemplateRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var merchant = await ResolveCurrentMerchantAsync(ct);
        if (merchant is null) return NotFound("No merchant account found for this user.");

        var template = await _db.DocumentTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.MerchantId == merchant.Id, ct);

        if (template is null) return NotFound();

        template.Name         = req.Name.Trim();
        template.Description  = req.Description?.Trim();
        template.DefaultTitle = req.DefaultTitle.Trim();
        template.SignersJson  = JsonSerializer.Serialize(req.Signers, _opts);
        template.UpdatedAt    = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(ToResponse(template, req.Signers));
    }

    // ── DELETE /api/templates/{id} ────────────────────────────────────────────

    /// <summary>Delete a template.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var merchant = await ResolveCurrentMerchantAsync(ct);
        if (merchant is null) return NotFound("No merchant account found for this user.");

        var template = await _db.DocumentTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.MerchantId == merchant.Id, ct);

        if (template is null) return NotFound();

        _db.DocumentTemplates.Remove(template);
        await _db.SaveChangesAsync(ct);

        return NoContent();
    }
}
