using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IIdentityVerificationService
{
    /// <summary>Starts an ID verification session for a signing request.</summary>
    Task<StartVerificationResult> StartAsync(
        Guid signingRequestId,
        Guid merchantId,
        string signerEmail,
        string documentType,
        string idImageBase64,
        CancellationToken ct = default);

    /// <summary>Returns current verification status for a signing request.</summary>
    Task<IdentityVerificationDto?> GetAsync(Guid signingRequestId, CancellationToken ct = default);

    /// <summary>Admin: approves or rejects a verification.</summary>
    Task ReviewAsync(Guid verificationId, bool approved, string? rejectionReason, CancellationToken ct = default);
}
