using System.Security.Cryptography;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// PBKDF2-SHA256 password hashing utility (100,000 iterations).
/// Stored format: base64(salt).base64(hash)
/// </summary>
public static class PasswordHelper
{
    private const int SaltSize   = 16;
    private const int HashSize   = 32;
    private const int Iterations = 100_000;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split('.');
        if (parts.Length != 2) return false;
        try
        {
            var salt       = Convert.FromBase64String(parts[0]);
            var storedHash = Convert.FromBase64String(parts[1]);
            var hash       = Rfc2898DeriveBytes.Pbkdf2(
                password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
            return CryptographicOperations.FixedTimeEquals(hash, storedHash);
        }
        catch
        {
            return false;
        }
    }
}
