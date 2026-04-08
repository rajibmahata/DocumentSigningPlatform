using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IAuditLogRepository
{
    Task AppendAsync(AuditLog entry, CancellationToken ct = default);
    Task<IReadOnlyList<AuditLog>> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
