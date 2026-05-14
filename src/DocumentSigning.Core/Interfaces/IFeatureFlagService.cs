using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IFeatureFlagService
{
    /// <summary>Returns true if the feature is enabled for the given merchant.</summary>
    Task<bool> IsEnabledAsync(Guid merchantId, string featureKey, CancellationToken ct = default);

    /// <summary>Returns all feature flags for a merchant.</summary>
    Task<IReadOnlyList<FeatureFlagDto>> GetAllAsync(Guid merchantId, CancellationToken ct = default);

    /// <summary>Enable or disable a feature for a merchant.</summary>
    Task SetAsync(Guid merchantId, string featureKey, bool isEnabled, CancellationToken ct = default);
}
