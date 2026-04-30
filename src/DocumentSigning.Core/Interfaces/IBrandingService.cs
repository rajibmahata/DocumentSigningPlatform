using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IBrandingService
{
    Task<MerchantBrandingDto?> GetAsync(Guid merchantId, CancellationToken ct = default);
    Task<MerchantBrandingDto> UpsertAsync(Guid merchantId, UpsertBrandingRequest request, CancellationToken ct = default);
}
