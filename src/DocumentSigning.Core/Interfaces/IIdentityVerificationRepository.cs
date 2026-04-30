using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IIdentityVerificationRepository
{
    Task<IdentityVerification?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IdentityVerification?> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default);
    Task AddAsync(IdentityVerification verification, CancellationToken ct = default);
    Task UpdateAsync(IdentityVerification verification, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
