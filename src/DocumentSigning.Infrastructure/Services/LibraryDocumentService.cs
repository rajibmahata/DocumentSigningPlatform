using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Services;

public class LibraryDocumentService(AppDbContext db, IAuditService audit) : ILibraryDocumentService
{
    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<List<LibraryDocumentSummaryDto>> GetAllAsync(
        Guid merchantId, string? purpose = null, string? category = null,
        string? search = null, bool? isSample = null, CancellationToken ct = default)
    {
        var q = db.LibraryDocuments.Where(x => x.MerchantId == merchantId || x.IsSample);
        if (!string.IsNullOrWhiteSpace(purpose))  q = q.Where(x => x.Purpose  == purpose);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(x => x.Category == category);
        if (isSample.HasValue)                    q = q.Where(x => x.IsSample  == isSample.Value);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(x => x.Name.Contains(search) || (x.Description != null && x.Description.Contains(search)));

        return await q
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => ToSummary(x))
            .ToListAsync(ct);
    }

    public async Task<LibraryDocumentDto?> GetByIdAsync(Guid id, Guid merchantId, CancellationToken ct = default)
    {
        var doc = await db.LibraryDocuments.FirstOrDefaultAsync(x => x.Id == id && (x.MerchantId == merchantId || x.IsSample), ct);
        return doc is null ? null : ToDto(doc);
    }

    public async Task<LibraryDocumentDto> CreateAsync(
        Guid merchantId, Guid userId,
        CreateLibraryDocumentRequest req, CancellationToken ct = default)
    {
        var doc = new LibraryDocument
        {
            MerchantId       = merchantId,
            UserId           = userId,
            Name             = req.Name,
            Description      = req.Description,
            Purpose          = req.Purpose,
            Category         = req.Category,
            FileType         = req.FileType,
            FilePath         = req.FilePath,
            EditorContentHtml = req.EditorContentHtml,
            IsTemplateReady  = req.IsTemplateReady,
            IsWorkflowReady  = req.IsWorkflowReady,
        };
        db.LibraryDocuments.Add(doc);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(new AuditEntry(
            Action:      "document.created",
            EntityType:  "LibraryDocument",
            EntityId:    doc.Id,
            UserId:      userId,
            MerchantId:  merchantId,
            Status:      "Success",
            Description: $"Document '{doc.Name}' created."
        ));
        return ToDto(doc);
    }

    public async Task<LibraryDocumentDto> UpdateAsync(
        Guid id, Guid merchantId,
        UpdateLibraryDocumentRequest req, CancellationToken ct = default)
    {
        var doc = await db.LibraryDocuments.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId && !x.IsSample, ct)
            ?? throw new KeyNotFoundException($"Document {id} not found.");

        doc.Name             = req.Name;
        doc.Description      = req.Description;
        doc.Purpose          = req.Purpose;
        doc.Category         = req.Category;
        doc.EditorContentHtml = req.EditorContentHtml ?? doc.EditorContentHtml;
        doc.IsTemplateReady  = req.IsTemplateReady;
        doc.IsWorkflowReady  = req.IsWorkflowReady;
        doc.Version         += 1;
        doc.UpdatedAt        = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        await audit.LogAsync(new AuditEntry(
            Action:      "document.updated",
            EntityType:  "LibraryDocument",
            EntityId:    doc.Id,
            MerchantId:  merchantId,
            Status:      "Success",
            Description: $"Document '{doc.Name}' updated to v{doc.Version}."
        ));
        return ToDto(doc);
    }

    public async Task DeleteAsync(Guid id, Guid merchantId, CancellationToken ct = default)
    {
        var doc = await db.LibraryDocuments.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId && !x.IsSample, ct);
        if (doc is null) return;

        var name = doc.Name;
        var filePath = doc.FilePath;
        db.LibraryDocuments.Remove(doc);
        await db.SaveChangesAsync(ct);

        // Delete physical file if it's a relative path under wwwroot
        if (!string.IsNullOrWhiteSpace(filePath) && !filePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            // Caller (controller) handles physical deletion to avoid wwwroot dependency here
        }

        await audit.LogAsync(new AuditEntry(
            Action:      "document.deleted",
            EntityType:  "LibraryDocument",
            EntityId:    id,
            MerchantId:  merchantId,
            Status:      "Success",
            Description: $"Document '{name}' deleted."
        ));
    }

    public async Task<LibraryDocumentDto> DuplicateAsync(
        Guid id, Guid merchantId, Guid userId, CancellationToken ct = default)
    {
        var src = await db.LibraryDocuments.FirstOrDefaultAsync(x => x.Id == id && (x.MerchantId == merchantId || x.IsSample), ct)
            ?? throw new KeyNotFoundException($"Document {id} not found.");

        var copy = new LibraryDocument
        {
            MerchantId        = merchantId,
            UserId            = userId,
            Name              = $"{src.Name} (Copy)",
            Description       = src.Description,
            Purpose           = src.Purpose,
            Category          = src.Category,
            FileType          = src.FileType,
            EditorContentHtml = src.EditorContentHtml,
            IsTemplateReady   = src.IsTemplateReady,
            IsWorkflowReady   = src.IsWorkflowReady,
            IsSample          = false,
        };
        db.LibraryDocuments.Add(copy);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(new AuditEntry(
            Action:      "document.cloned",
            EntityType:  "LibraryDocument",
            EntityId:    copy.Id,
            UserId:      userId,
            MerchantId:  merchantId,
            Status:      "Success",
            Description: $"Document '{src.Name}' duplicated as '{copy.Name}'."
        ));
        return ToDto(copy);
    }

    // ── Template linking ──────────────────────────────────────────────────────

    public async Task<List<LibraryDocumentSummaryDto>> GetByTemplateAsync(
        Guid templateId, Guid merchantId, CancellationToken ct = default)
        => await db.TemplateLibraryDocuments
            .Where(x => x.DocumentTemplateId == templateId && x.Document!.MerchantId == merchantId)
            .Select(x => ToSummary(x.Document!))
            .ToListAsync(ct);

    public async Task LinkToTemplateAsync(
        Guid templateId, Guid merchantId, List<Guid> documentIds, CancellationToken ct = default)
    {
        var existing = await db.TemplateLibraryDocuments
            .Where(x => x.DocumentTemplateId == templateId)
            .Select(x => x.LibraryDocumentId)
            .ToListAsync(ct);

        foreach (var docId in documentIds.Except(existing))
        {
            db.TemplateLibraryDocuments.Add(new TemplateLibraryDocument
            {
                DocumentTemplateId = templateId,
                LibraryDocumentId  = docId,
            });
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task UnlinkFromTemplateAsync(
        Guid templateId, Guid documentId, Guid merchantId, CancellationToken ct = default)
    {
        var link = await db.TemplateLibraryDocuments
            .FirstOrDefaultAsync(x => x.DocumentTemplateId == templateId && x.LibraryDocumentId == documentId, ct);
        if (link is not null)
        {
            db.TemplateLibraryDocuments.Remove(link);
            await db.SaveChangesAsync(ct);
        }
    }

    // ── Workflow linking ──────────────────────────────────────────────────────

    public async Task<List<LibraryDocumentSummaryDto>> GetByWorkflowAsync(
        Guid workflowId, Guid merchantId, CancellationToken ct = default)
        => await db.WorkflowLibraryDocuments
            .Where(x => x.WorkflowDefinitionId == workflowId && x.Document!.MerchantId == merchantId)
            .Select(x => ToSummary(x.Document!))
            .ToListAsync(ct);

    public async Task LinkToWorkflowAsync(
        Guid workflowId, Guid merchantId, List<Guid> documentIds, CancellationToken ct = default)
    {
        var existing = await db.WorkflowLibraryDocuments
            .Where(x => x.WorkflowDefinitionId == workflowId)
            .Select(x => x.LibraryDocumentId)
            .ToListAsync(ct);

        foreach (var docId in documentIds.Except(existing))
        {
            db.WorkflowLibraryDocuments.Add(new WorkflowLibraryDocument
            {
                WorkflowDefinitionId = workflowId,
                LibraryDocumentId    = docId,
            });
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task UnlinkFromWorkflowAsync(
        Guid workflowId, Guid documentId, Guid merchantId, CancellationToken ct = default)
    {
        var link = await db.WorkflowLibraryDocuments
            .FirstOrDefaultAsync(x => x.WorkflowDefinitionId == workflowId && x.LibraryDocumentId == documentId, ct);
        if (link is not null)
        {
            db.WorkflowLibraryDocuments.Remove(link);
            await db.SaveChangesAsync(ct);
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    public async Task TouchLastUsedAsync(Guid id, CancellationToken ct = default)
    {
        await db.LibraryDocuments
            .Where(x => x.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.LastUsedAt, DateTime.UtcNow), ct);
    }

    // ── Samples ──────────────────────────────────────────────────────────────

    public async Task<List<LibraryDocumentSummaryDto>> GetSamplesAsync(
        CancellationToken ct = default)
        => await db.LibraryDocuments
            .Where(x => x.IsSample)
            .OrderBy(x => x.Name)
            .Select(x => ToSummary(x))
            .ToListAsync(ct);

    // ── Projections ───────────────────────────────────────────────────────────

    private static LibraryDocumentDto ToDto(LibraryDocument x) => new(
        x.Id, x.MerchantId, x.UserId,
        x.Name, x.Description, x.Purpose, x.Category, x.FileType,
        x.FilePath, x.EditorContentHtml,
        x.Version, x.IsSample, x.IsTemplateReady, x.IsWorkflowReady,
        x.CreatedAt, x.UpdatedAt, x.LastUsedAt);

    private static LibraryDocumentSummaryDto ToSummary(LibraryDocument x) => new(
        x.Id, x.Name, x.Description, x.Purpose, x.Category,
        x.FileType, x.IsSample, x.IsTemplateReady, x.IsWorkflowReady,
        x.UpdatedAt, x.LastUsedAt);
}
