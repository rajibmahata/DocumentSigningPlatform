using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IClaimRepository
{
    Task<Claim?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Claim claim, CancellationToken ct = default);
    Task UpdateAsync(Claim claim, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
