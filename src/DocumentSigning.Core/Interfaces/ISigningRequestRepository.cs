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
    Task SaveChangesAsync(CancellationToken ct = default);
}
