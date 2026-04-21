using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Interfaces;

public interface ISigningRequestRepository
{
    Task<SigningRequest?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SigningRequest?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task<SigningRequest?> GetByDocumentAndEnvelopeAsync(Guid documentId, Guid envelopeId, CancellationToken ct = default);
    /// <summary>Returns the most recent signing request for a given claimant email + document.</summary>
    Task<SigningRequest?> GetLatestByEmailAndDocumentAsync(string claimantEmail, Guid documentId, CancellationToken ct = default);
    Task AddAsync(SigningRequest request, CancellationToken ct = default);
    Task UpdateAsync(SigningRequest request, CancellationToken ct = default);
    /// <summary>
    /// Atomically claims a pending signing request for processing. Returns true if status was updated.
    /// </summary>
    Task<bool> TryLockForProcessingAsync(string token, CancellationToken ct = default);

    /// <summary>
    /// Marks all Pending/Processing SigningRequests for documents in <paramref name="envelopeId"/>
    /// as Expired. Returns the number of rows updated.
    /// </summary>
    Task<int> ExpireByEnvelopeAsync(Guid envelopeId, CancellationToken ct = default);

    /// <summary>
    /// Returns Pending SigningRequests whose ExpiresAt is within each merchant's configured
    /// <c>ReminderWindowHours</c>, with no ReminderSentAt yet, and whose envelope is still active.
    /// Only returns reminders for merchants that have <c>ReminderEnabled = true</c>.
    /// Used by ReminderWorker.
    /// </summary>
    Task<List<PendingReminderDto>> GetPendingRemindersAsync(CancellationToken ct = default);

    /// <summary>
    /// Stamps <c>ReminderSentAt = UtcNow</c> on the given SigningRequest.
    /// </summary>
    Task MarkReminderSentAsync(Guid signingRequestId, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
