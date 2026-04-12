using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IMerchantRepository
{
    Task<Merchant?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Merchant?> GetByApiKeyAsync(string apiKey, CancellationToken ct = default);
    Task<IReadOnlyList<Merchant>> GetAllAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Merchant>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Merchant merchant, CancellationToken ct = default);
    Task UpdateAsync(Merchant merchant, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
