using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IFeatureFlagRepository
{
    Task<IReadOnlyList<MerchantFeatureFlag>> GetByMerchantIdAsync(Guid merchantId, CancellationToken ct = default);
    Task<MerchantFeatureFlag?> GetAsync(Guid merchantId, string featureKey, CancellationToken ct = default);
    Task AddAsync(MerchantFeatureFlag flag, CancellationToken ct = default);
    Task UpdateAsync(MerchantFeatureFlag flag, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
