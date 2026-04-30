using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

public sealed class FeatureFlagService : IFeatureFlagService
{
    private readonly IFeatureFlagRepository _repo;

    public FeatureFlagService(IFeatureFlagRepository repo) => _repo = repo;

    public async Task<bool> IsEnabledAsync(Guid merchantId, string featureKey, CancellationToken ct = default)
    {
        var flag = await _repo.GetAsync(merchantId, featureKey, ct);
        return flag?.IsEnabled ?? false;
    }

    public async Task<IReadOnlyList<FeatureFlagDto>> GetAllAsync(Guid merchantId, CancellationToken ct = default)
    {
        var flags = await _repo.GetByMerchantIdAsync(merchantId, ct);
        return flags
            .Select(f => new FeatureFlagDto(f.FeatureKey, f.IsEnabled, f.UpdatedAt))
            .ToList();
    }

    public async Task SetAsync(Guid merchantId, string featureKey, bool isEnabled, CancellationToken ct = default)
    {
        var existing = await _repo.GetAsync(merchantId, featureKey, ct);
        if (existing is null)
        {
            await _repo.AddAsync(new MerchantFeatureFlag
            {
                Id         = Guid.NewGuid(),
                MerchantId = merchantId,
                FeatureKey = featureKey,
                IsEnabled  = isEnabled,
                CreatedAt  = DateTime.UtcNow,
            }, ct);
        }
        else
        {
            existing.IsEnabled = isEnabled;
            existing.UpdatedAt = DateTime.UtcNow;
            await _repo.UpdateAsync(existing, ct);
        }

        await _repo.SaveChangesAsync(ct);
    }
}
