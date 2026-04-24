namespace DocumentSigning.Core.Interfaces;

/// <summary>
/// Generates and validates short-lived HMAC confirmation tokens bound to a signer ID.
/// Token format: {signerId:N}.{expiryUnixSeconds}.{hmac-sha256-hex}
/// </summary>
public interface IConfirmTokenService
{
    /// <summary>Generates a confirmation token for the given signer, valid for the configured window.</summary>
    string GenerateToken(Guid signerId);

    /// <summary>
    /// Validates the token signature and expiry. Returns true and sets <paramref name="signerId"/>
    /// on success, false on any failure (malformed, expired, or bad HMAC).
    /// </summary>
    bool ValidateToken(string token, out Guid signerId);
}
