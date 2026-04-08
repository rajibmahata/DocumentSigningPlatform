using System.Security.Cryptography;
using System.Text;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Generates and validates signing tokens of the form: {guid:N}.{HMAC-SHA256(guid+claimId+docId, secret)}
/// </summary>
public class TokenService : ITokenService
{
    private readonly byte[] _secretKey;

    public TokenService(IConfiguration config)
    {
        var secret = config["Token:Secret"]
            ?? throw new InvalidOperationException("Token:Secret is not configured.");
        _secretKey = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(Guid claimId, Guid documentId, out Guid tokenGuid)
    {
        tokenGuid = Guid.NewGuid();
        var signature = ComputeSignature(tokenGuid, claimId, documentId);
        return $"{tokenGuid:N}.{signature}";
    }

    public bool ValidateTokenSignature(string token, Guid claimId, Guid documentId)
    {
        var parts = token.Split('.', 2);
        if (parts.Length != 2) return false;
        if (!Guid.TryParseExact(parts[0], "N", out var tokenGuid)) return false;

        var expected = ComputeSignature(tokenGuid, claimId, documentId);

        // Constant-time comparison to prevent timing attacks
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(parts[1]));
    }

    private string ComputeSignature(Guid tokenGuid, Guid claimId, Guid documentId)
    {
        var payload = Encoding.UTF8.GetBytes($"{tokenGuid:N}{claimId:N}{documentId:N}");
        var hash = HMACSHA256.HashData(_secretKey, payload);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
