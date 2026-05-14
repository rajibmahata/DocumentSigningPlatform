using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class FeatureFlagRepository : IFeatureFlagRepository
{
    private readonly AppDbContext _db;
    public FeatureFlagRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<MerchantFeatureFlag>> GetByMerchantIdAsync(Guid merchantId, CancellationToken ct = default)
        => await _db.MerchantFeatureFlags.Where(f => f.MerchantId == merchantId).ToListAsync(ct);

    public async Task<MerchantFeatureFlag?> GetAsync(Guid merchantId, string featureKey, CancellationToken ct = default)
        => await _db.MerchantFeatureFlags
            .FirstOrDefaultAsync(f => f.MerchantId == merchantId && f.FeatureKey == featureKey, ct);

    public async Task AddAsync(MerchantFeatureFlag flag, CancellationToken ct = default)
        => await _db.MerchantFeatureFlags.AddAsync(flag, ct);

    public Task UpdateAsync(MerchantFeatureFlag flag, CancellationToken ct = default)
    {
        _db.MerchantFeatureFlags.Update(flag);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
