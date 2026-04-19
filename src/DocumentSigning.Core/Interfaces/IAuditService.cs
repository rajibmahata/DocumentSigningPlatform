namespace DocumentSigning.Core.Interfaces;

/// <summary>
/// Fire-and-forget audit service. Callers do not need to await — entries are
/// queued in-memory and flushed to the database by a background worker.
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Enqueues an audit entry without blocking the caller.
    /// Safe to call from any controller action.
    /// </summary>
    void Log(AuditEntry entry);

    /// <summary>
    /// Enqueues an audit entry asynchronously (useful from non-controller contexts).
    /// </summary>
    ValueTask LogAsync(AuditEntry entry, CancellationToken ct = default);
}

/// <summary>Builder record for creating an audit log entry.</summary>
public record AuditEntry(
    string  Action,
    string  EntityType,
    Guid?   EntityId    = null,
    Guid?   UserId      = null,
    Guid?   MerchantId  = null,
    string  Status      = "Success",
    string? Description = null,
    string? IpAddress   = null,
    string? UserAgent   = null,
    string? Metadata    = null,
    // Legacy chain support
    Guid?   SigningRequestId = null,
    Guid?   ClaimId          = null);
