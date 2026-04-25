using System.Security.Cryptography;
using System.Text;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Generates and validates HMAC-SHA256 confirmation tokens bound to a signer ID.
/// Token format: {signerId:N}.{expiryUnixSeconds}.{hmac-sha256-hex}
/// </summary>
public class ConfirmTokenService : IConfirmTokenService
{
    private readonly byte[] _secretKey;
    private readonly int _validityMinutes;

    public ConfirmTokenService(IConfiguration config)
    {
        var secret = config["Token:Secret"]
            ?? throw new InvalidOperationException("Token:Secret is not configured.");
        _secretKey = Encoding.UTF8.GetBytes(secret + ":confirm");
        _validityMinutes = config.GetValue<int>("App:ConfirmTokenValidityMinutes", 10080); // 7 days default
    }

    public string GenerateToken(Guid signerId)
    {
        var expiryUnix = DateTimeOffset.UtcNow.AddMinutes(_validityMinutes).ToUnixTimeSeconds();
        var hmac = ComputeHmac(signerId, expiryUnix);
        return $"{signerId:N}.{expiryUnix}.{hmac}";
    }

    public bool ValidateToken(string token, out Guid signerId)
    {
        signerId = Guid.Empty;
        var parts = token.Split('.', 3);
        if (parts.Length != 3) return false;

        if (!Guid.TryParseExact(parts[0], "N", out signerId)) return false;
        if (!long.TryParse(parts[1], out var expiryUnix)) return false;

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiryUnix)
        {
            signerId = Guid.Empty;
            return false;
        }

        var expected = ComputeHmac(signerId, expiryUnix);
        var valid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(parts[2]));

        if (!valid) signerId = Guid.Empty;
        return valid;
    }

    private string ComputeHmac(Guid signerId, long expiryUnix)
    {
        var payload = Encoding.UTF8.GetBytes($"{signerId:N}{expiryUnix}");
        var hash = HMACSHA256.HashData(_secretKey, payload);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
