using System.Security.Cryptography;
using System.Text;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _db;
    public AuditLogRepository(AppDbContext db) => _db = db;

    // ── Write ─────────────────────────────────────────────────────────────────

    public async Task AppendAsync(AuditLog entry, CancellationToken ct = default)
    {
        // Build hash chain — scoped to SigningRequestId when present, otherwise global
        string prevHash;
        if (entry.SigningRequestId.HasValue)
        {
            prevHash = await _db.AuditLogs
                .Where(a => a.SigningRequestId == entry.SigningRequestId)
                .OrderByDescending(a => a.Timestamp)
                .Select(a => a.Hash)
                .FirstOrDefaultAsync(ct) ?? "GENESIS";
        }
        else
        {
            prevHash = await _db.AuditLogs
                .OrderByDescending(a => a.Timestamp)
                .Select(a => a.Hash)
                .FirstOrDefaultAsync(ct) ?? "GENESIS";
        }

        var raw = $"{prevHash}{entry.Timestamp:o}{entry.Action}{entry.EntityType}{entry.EntityId}{entry.UserId}{entry.IpAddress}{entry.UserAgent}";
        entry.Hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();

        await _db.AuditLogs.AddAsync(entry, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    // ── Read (legacy) ─────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<AuditLog>> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default)
        => await _db.AuditLogs
            .Where(a => a.SigningRequestId == signingRequestId)
            .OrderBy(a => a.Timestamp)
            .ToListAsync(ct);

    // ── Read (production) ─────────────────────────────────────────────────────

    public async Task<PagedResult<AuditLog>> GetPagedAsync(AuditLogQueryParams q, CancellationToken ct = default)
    {
        var query = _db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Action))
            query = query.Where(a => a.Action == q.Action);

        if (!string.IsNullOrWhiteSpace(q.EntityType))
            query = query.Where(a => a.EntityType == q.EntityType);

        if (q.EntityId.HasValue)
            query = query.Where(a => a.EntityId == q.EntityId);

        if (q.UserId.HasValue)
            query = query.Where(a => a.UserId == q.UserId);

        if (q.MerchantId.HasValue)
            query = query.Where(a => a.MerchantId == q.MerchantId);

        if (!string.IsNullOrWhiteSpace(q.Status))
            query = query.Where(a => a.Status == q.Status);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var s = q.Search.ToLower();
            query = query.Where(a =>
                a.Description.ToLower().Contains(s) ||
                a.Action.ToLower().Contains(s) ||
                (a.IpAddress != null && a.IpAddress.Contains(s)));
        }

        if (q.From.HasValue)
            query = query.Where(a => a.Timestamp >= q.From.Value);

        if (q.To.HasValue)
            query = query.Where(a => a.Timestamp <= q.To.Value);

        var total = await query.CountAsync(ct);
        var page  = Math.Max(1, q.Page);
        var size  = Math.Clamp(q.PageSize, 1, 200);

        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return new PagedResult<AuditLog>(items, total, page, size);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByEntityAsync(string entityType, Guid entityId, CancellationToken ct = default)
        => await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.EntityType == entityType && a.EntityId == entityId)
            .OrderBy(a => a.Timestamp)
            .ToListAsync(ct);
}
