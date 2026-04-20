using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// Immutable audit log entry — rows are never updated or deleted.
/// Supports both the legacy signing-request chain model and the new
/// entity-centric production model.
/// </summary>
public class AuditLog
{
    // ── Identity ──────────────────────────────────────────────────────────
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── Legacy chain fields (kept for existing data) ──────────────────────
    public Guid? SigningRequestId { get; set; }
    public Guid? ClaimId { get; set; }
    /// <summary>SHA-256 hash chain value for immutability verification.</summary>
    public string Hash { get; set; } = string.Empty;

    // ── Actor ─────────────────────────────────────────────────────────────
    public Guid?   UserId     { get; set; }
    public Guid?   MerchantId { get; set; }

    // ── Entity being acted on ─────────────────────────────────────────────
    /// <summary>E.g. "Envelope", "User", "Merchant", "Ticket", "Document"</summary>
    public string  EntityType { get; set; } = string.Empty;
    public Guid?   EntityId   { get; set; }

    // ── Event ─────────────────────────────────────────────────────────────
    /// <summary>Verb — see <see cref="AuditActions"/> constants.</summary>
    public string Action      { get; set; } = string.Empty;
    /// <summary>"Success", "Failure", "Warning" — see <see cref="AuditStatuses"/> constants.</summary>
    public string Status      { get; set; } = AuditStatuses.Success;
    public string Description { get; set; } = string.Empty;

    // ── Request context ───────────────────────────────────────────────────
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;

    // ── Payload ───────────────────────────────────────────────────────────
    /// <summary>JSON blob for extra structured data (envelope title, email, etc.)</summary>
    public string? Metadata { get; set; }

    // ── Timestamp ─────────────────────────────────────────────────────────
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
