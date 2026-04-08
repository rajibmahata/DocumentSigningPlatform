using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISigningEnvelopeRepository
{
    Task<SigningEnvelope?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<SigningEnvelope>> GetByMerchantAsync(Guid merchantId, CancellationToken ct = default);
    Task<SigningEnvelope?> GetBySignerEmailAsync(string email, CancellationToken ct = default);
    Task AddAsync(SigningEnvelope envelope, CancellationToken ct = default);
    Task UpdateAsync(SigningEnvelope envelope, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
