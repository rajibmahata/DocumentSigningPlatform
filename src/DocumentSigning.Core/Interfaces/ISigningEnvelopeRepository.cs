using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISigningEnvelopeRepository
{
    Task<SigningEnvelope?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<SigningEnvelope>> GetByMerchantAsync(Guid merchantId, CancellationToken ct = default);
    Task<SigningEnvelope?> GetBySignerEmailAsync(string email, CancellationToken ct = default);
    Task<IReadOnlyList<SigningEnvelope>> GetAllBySignerEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(SigningEnvelope envelope, CancellationToken ct = default);
    Task UpdateAsync(SigningEnvelope envelope, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<int> CountAllAsync(CancellationToken ct = default);
    Task<int> CountByStatusAsync(Core.Enums.EnvelopeStatus status, CancellationToken ct = default);
    Task<List<(DateOnly Date, int Count)>> CountByDayAsync(int days, CancellationToken ct = default);

    /// <summary>
    /// Returns all envelopes that are still active (Sent/Processing/Signed) but have at least one
    /// SigningRequest whose ExpiresAt is in the past and Status is Pending or Processing.
    /// Used by ExpiryWorker.
    /// </summary>
    Task<List<SigningEnvelope>> GetExpiredActiveEnvelopesAsync(CancellationToken ct = default);
}
