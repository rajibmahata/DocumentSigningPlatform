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
        => await _db.AuditLogs.AddAsync(entry, ct);

    public async Task<IReadOnlyList<AuditLog>> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default)
        => await _db.AuditLogs
            .Where(a => a.SigningRequestId == signingRequestId)
            .OrderBy(a => a.Timestamp)
            .ToListAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
