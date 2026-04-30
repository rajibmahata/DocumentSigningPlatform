using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IMerchantBrandingRepository
{
    Task<MerchantBranding?> GetByMerchantIdAsync(Guid merchantId, CancellationToken ct = default);
    Task AddAsync(MerchantBranding branding, CancellationToken ct = default);
    Task UpdateAsync(MerchantBranding branding, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
