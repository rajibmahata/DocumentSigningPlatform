using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IAuditLogRepository
{
    // ── Write ─────────────────────────────────────────────────────────────────
    Task AppendAsync(AuditLog entry, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);

    // ── Read (legacy) ─────────────────────────────────────────────────────────
    Task<IReadOnlyList<AuditLog>> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default);

    // ── Read (production) ─────────────────────────────────────────────────────
    /// <summary>Returns paged, filtered audit logs for the admin viewer.</summary>
    Task<PagedResult<AuditLog>> GetPagedAsync(AuditLogQueryParams query, CancellationToken ct = default);

    /// <summary>Returns all audit entries for a specific entity (timeline view).</summary>
    Task<IReadOnlyList<AuditLog>> GetByEntityAsync(string entityType, Guid entityId, CancellationToken ct = default);
}
