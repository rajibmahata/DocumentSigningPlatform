using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class MerchantBrandingRepository : IMerchantBrandingRepository
{
    private readonly AppDbContext _db;
    public MerchantBrandingRepository(AppDbContext db) => _db = db;

    public async Task<MerchantBranding?> GetByMerchantIdAsync(Guid merchantId, CancellationToken ct = default)
        => await _db.MerchantBrandings.FirstOrDefaultAsync(b => b.MerchantId == merchantId, ct);

    public async Task AddAsync(MerchantBranding branding, CancellationToken ct = default)
        => await _db.MerchantBrandings.AddAsync(branding, ct);

    public Task UpdateAsync(MerchantBranding branding, CancellationToken ct = default)
    {
        _db.MerchantBrandings.Update(branding);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
