using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Document Library — user-scoped document repository integrated with envelopes, templates and workflows.
/// </summary>
[ApiController]
[Produces("application/json")]
[Authorize]
public class DocumentLibraryController : ControllerBase
{
    private static readonly string[] AllowedMimeTypes  = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/html"];
    private static readonly string[] AllowedExtensions = [".pdf", ".docx", ".txt", ".html"];
    private const long MaxDocBytes = 20 * 1024 * 1024; // 20 MB

    private readonly ILibraryDocumentService _svc;
    private readonly IMerchantRepository     _merchantRepo;
    private readonly IWebHostEnvironment     _env;

    public DocumentLibraryController(
        ILibraryDocumentService svc,
        IMerchantRepository merchantRepo,
        IWebHostEnvironment env)
    {
        _svc          = svc;
        _merchantRepo = merchantRepo;
        _env          = env;
    }

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("No user identity claim."));

    private async Task<Guid> GetMerchantIdAsync(CancellationToken ct = default)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(UserId, ct);
        return merchants.FirstOrDefault()?.Id
            ?? throw new UnauthorizedAccessException("No merchant account found for this user.");
    }

    // ── Document CRUD ──────────────────────────────────────────────────────────

    /// <summary>List all documents in the library.</summary>
    [HttpGet("api/library/documents")]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] string? purpose,
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool?   isSample,
        CancellationToken ct)
        => Ok(await _svc.GetAllAsync(await GetMerchantIdAsync(ct), purpose, category, search, isSample, ct));

    /// <summary>Get a single document by ID.</summary>
    [HttpGet("api/library/documents/{id:guid}")]
    public async Task<IActionResult> GetDocument(Guid id, CancellationToken ct)
    {
        var doc = await _svc.GetByIdAsync(id, await GetMerchantIdAsync(ct), ct);
        return doc is null ? NotFound() : Ok(doc);
    }

    /// <summary>Create a document with inline HTML content (no file).</summary>
    [HttpPost("api/library/documents")]
    public async Task<IActionResult> CreateDocument([FromBody] CreateLibraryDocumentRequest req, CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        var doc = await _svc.CreateAsync(merchantId, UserId, req, ct);
        return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, doc);
    }

    /// <summary>Upload a document file (pdf/docx/txt/html) to the library.</summary>
    [HttpPost("api/library/documents/upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument(
        IFormFile file,
        [FromForm] string name,
        [FromForm] string? description,
        [FromForm] string purpose = "Other",
        [FromForm] string? category = null,
        CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });
        if (file.Length > MaxDocBytes)
            return BadRequest(new { error = "File exceeds the 20 MB limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = "Only PDF, DOCX, TXT and HTML files are allowed." });

        var merchantId = await GetMerchantIdAsync(ct);
        var uniqueName = $"{Guid.NewGuid():N}{ext}";
        var dir        = Path.Combine(_env.WebRootPath, "documents", merchantId.ToString("N"));
        Directory.CreateDirectory(dir);

        var destPath = Path.Combine(dir, uniqueName);
        await using var stream = System.IO.File.Create(destPath);
        await file.CopyToAsync(stream, ct);

        var relativePath = $"/documents/{merchantId:N}/{uniqueName}";
        var fileType     = ext.TrimStart('.');

        var doc = await _svc.CreateAsync(merchantId, UserId, new CreateLibraryDocumentRequest(
            Name:             name,
            Description:      description,
            Purpose:          purpose,
            Category:         category,
            FileType:         fileType,
            FilePath:         relativePath,
            EditorContentHtml: null
        ), ct);

        return CreatedAtAction(nameof(GetDocument), new { id = doc.Id }, doc);
    }

    /// <summary>Update document metadata / content.</summary>
    [HttpPut("api/library/documents/{id:guid}")]
    public async Task<IActionResult> UpdateDocument(Guid id, [FromBody] UpdateLibraryDocumentRequest req, CancellationToken ct)
    {
        var doc = await _svc.UpdateAsync(id, await GetMerchantIdAsync(ct), req, ct);
        return Ok(doc);
    }

    /// <summary>Delete a document and its physical file.</summary>
    [HttpDelete("api/library/documents/{id:guid}")]
    public async Task<IActionResult> DeleteDocument(Guid id, CancellationToken ct)
    {
        var merchantId = await GetMerchantIdAsync(ct);
        var doc = await _svc.GetByIdAsync(id, merchantId, ct);
        if (doc is null) return NotFound();

        // Delete physical file
        if (!string.IsNullOrWhiteSpace(doc.FilePath) &&
            !doc.FilePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var abs = Path.Combine(_env.WebRootPath, doc.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(abs)) System.IO.File.Delete(abs);
        }

        await _svc.DeleteAsync(id, merchantId, ct);
        return NoContent();
    }

    /// <summary>Duplicate a document.</summary>
    [HttpPost("api/library/documents/{id:guid}/duplicate")]
    public async Task<IActionResult> DuplicateDocument(Guid id, CancellationToken ct)
    {
        var copy = await _svc.DuplicateAsync(id, await GetMerchantIdAsync(ct), UserId, ct);
        return CreatedAtAction(nameof(GetDocument), new { id = copy.Id }, copy);
    }

    /// <summary>Mark a document as "last used".</summary>
    [HttpPost("api/library/documents/{id:guid}/touch")]
    public async Task<IActionResult> TouchDocument(Guid id, CancellationToken ct)
    {
        await _svc.TouchLastUsedAsync(id, ct);
        return Ok();
    }

    /// <summary>Get all sample documents.</summary>
    [HttpGet("api/library/documents/samples")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSamples(CancellationToken ct)
    {
        return Ok(await _svc.GetSamplesAsync(ct));
    }

    // ── Template document links ────────────────────────────────────────────────

    /// <summary>Get documents linked to a document template.</summary>
    [HttpGet("api/library/templates/{templateId:guid}/documents")]
    public async Task<IActionResult> GetTemplateDocuments(Guid templateId, CancellationToken ct)
        => Ok(await _svc.GetByTemplateAsync(templateId, await GetMerchantIdAsync(ct), ct));

    /// <summary>Link documents to a document template.</summary>
    [HttpPost("api/library/templates/{templateId:guid}/documents")]
    public async Task<IActionResult> LinkToTemplate(
        Guid templateId, [FromBody] LinkDocumentsToTemplateRequest req, CancellationToken ct)
    {
        await _svc.LinkToTemplateAsync(templateId, await GetMerchantIdAsync(ct), req.DocumentIds, ct);
        return Ok();
    }

    /// <summary>Remove a document from a document template.</summary>
    [HttpDelete("api/library/templates/{templateId:guid}/documents/{documentId:guid}")]
    public async Task<IActionResult> UnlinkFromTemplate(Guid templateId, Guid documentId, CancellationToken ct)
    {
        await _svc.UnlinkFromTemplateAsync(templateId, documentId, await GetMerchantIdAsync(ct), ct);
        return NoContent();
    }

    // ── Workflow document links ────────────────────────────────────────────────

    /// <summary>Get documents linked to a workflow.</summary>
    [HttpGet("api/library/workflows/{workflowId:guid}/documents")]
    public async Task<IActionResult> GetWorkflowDocuments(Guid workflowId, CancellationToken ct)
        => Ok(await _svc.GetByWorkflowAsync(workflowId, await GetMerchantIdAsync(ct), ct));

    /// <summary>Link documents to a workflow definition.</summary>
    [HttpPost("api/library/workflows/{workflowId:guid}/documents")]
    public async Task<IActionResult> LinkToWorkflow(
        Guid workflowId, [FromBody] LinkDocumentsToWorkflowRequest req, CancellationToken ct)
    {
        await _svc.LinkToWorkflowAsync(workflowId, await GetMerchantIdAsync(ct), req.DocumentIds, ct);
        return Ok();
    }

    /// <summary>Remove a document from a workflow definition.</summary>
    [HttpDelete("api/library/workflows/{workflowId:guid}/documents/{documentId:guid}")]
    public async Task<IActionResult> UnlinkFromWorkflow(Guid workflowId, Guid documentId, CancellationToken ct)
    {
        await _svc.UnlinkFromWorkflowAsync(workflowId, documentId, await GetMerchantIdAsync(ct), ct);
        return NoContent();
    }
}
