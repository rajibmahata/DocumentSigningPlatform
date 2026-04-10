using System.Security.Cryptography;
using System.Text;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly AppDbContext _db;
    public AuditLogRepository(AppDbContext db) => _db = db;

    public async Task AppendAsync(AuditLog entry, CancellationToken ct = default)
    {
        var prevHash = await _db.AuditLogs
            .Where(a => a.SigningRequestId == entry.SigningRequestId)
            .OrderByDescending(a => a.Timestamp)
            .Select(a => a.Hash)
            .FirstOrDefaultAsync(ct) ?? "GENESIS";

        var raw = $"{prevHash}{entry.Timestamp:o}{entry.Action}{entry.ClaimId}{entry.IpAddress}{entry.UserAgent}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        entry.Hash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        await _db.AuditLogs.AddAsync(entry, ct);
    }

    public async Task<IReadOnlyList<AuditLog>> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default)
        => await _db.AuditLogs
            .Where(a => a.SigningRequestId == signingRequestId)
            .OrderBy(a => a.Timestamp)
            .ToListAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
