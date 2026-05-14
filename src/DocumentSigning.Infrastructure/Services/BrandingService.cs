using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

public sealed class BrandingService : IBrandingService
{
    private readonly IMerchantBrandingRepository _repo;

    public BrandingService(IMerchantBrandingRepository repo) => _repo = repo;

    public async Task<MerchantBrandingDto?> GetAsync(Guid merchantId, CancellationToken ct = default)
    {
        var b = await _repo.GetByMerchantIdAsync(merchantId, ct);
        return b is null ? null : Map(b);
    }

    public async Task<MerchantBrandingDto> UpsertAsync(Guid merchantId, UpsertBrandingRequest request, CancellationToken ct = default)
    {
        var existing = await _repo.GetByMerchantIdAsync(merchantId, ct);
        if (existing is null)
        {
            var entity = new MerchantBranding
            {
                Id              = Guid.NewGuid(),
                MerchantId      = merchantId,
                CustomDomain    = request.CustomDomain,
                LogoUrl         = request.LogoUrl,
                PrimaryColor    = request.PrimaryColor,
                EmailFromName   = request.EmailFromName,
                PortalFooterText = request.PortalFooterText,
                CreatedAt       = DateTime.UtcNow,
            };
            await _repo.AddAsync(entity, ct);
            await _repo.SaveChangesAsync(ct);
            return Map(entity);
        }

        existing.CustomDomain    = request.CustomDomain;
        existing.LogoUrl         = request.LogoUrl;
        existing.PrimaryColor    = request.PrimaryColor;
        existing.EmailFromName   = request.EmailFromName;
        existing.PortalFooterText = request.PortalFooterText;
        existing.UpdatedAt       = DateTime.UtcNow;
        await _repo.UpdateAsync(existing, ct);
        await _repo.SaveChangesAsync(ct);
        return Map(existing);
    }

    private static MerchantBrandingDto Map(MerchantBranding b) =>
        new(b.MerchantId, b.CustomDomain, b.LogoUrl, b.PrimaryColor, b.EmailFromName, b.PortalFooterText, b.UpdatedAt);
}
