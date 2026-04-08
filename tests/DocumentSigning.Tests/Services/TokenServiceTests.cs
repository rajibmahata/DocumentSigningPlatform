using DocumentSigning.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace DocumentSigning.Tests.Services;

public class TokenServiceTests
{
    private static TokenService CreateService(string secret = "test-secret-key-minimum-32-chars!!")
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Token:Secret", secret }
            })
            .Build();

        return new TokenService(config);
    }

    [Fact]
    public void Constructor_ThrowsInvalidOperationException_WhenSecretNotConfigured()
    {
        var config = new ConfigurationBuilder().Build(); // empty config

        var act = () => new TokenService(config);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Token:Secret is not configured.");
    }

    [Fact]
    public void GenerateToken_ReturnsTokenWithExpectedFormat()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service.GenerateToken(claimId, docId, out var tokenGuid);

        // Format: {32-hex-chars}.{64-hex-chars}
        var parts = token.Split('.');
        parts.Length.Should().Be(2);

        parts[0].Should().HaveLength(32); // guid:N = 32 hex chars, no hyphens
        parts[0].Should().MatchRegex("^[0-9a-f]{32}$");

        parts[1].Should().HaveLength(64); // HMAC-SHA256 = 32 bytes = 64 hex chars
        parts[1].Should().MatchRegex("^[0-9a-f]{64}$");

        tokenGuid.Should().NotBeEmpty();
        Guid.ParseExact(parts[0], "N").Should().Be(tokenGuid);
    }

    [Fact]
    public void GenerateToken_ReturnsDifferentTokensForDifferentCalls()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token1 = service.GenerateToken(claimId, docId, out _);
        var token2 = service.GenerateToken(claimId, docId, out _);

        // Different tokenGuids result in different tokens
        token1.Should().NotBe(token2);
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsTrueForValidToken()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service.GenerateToken(claimId, docId, out _);
        var isValid = service.ValidateTokenSignature(token, claimId, docId);

        isValid.Should().BeTrue();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForWrongClaimId()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service.GenerateToken(claimId, docId, out _);
        var isValid = service.ValidateTokenSignature(token, Guid.NewGuid(), docId);

        isValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForWrongDocId()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service.GenerateToken(claimId, docId, out _);
        var isValid = service.ValidateTokenSignature(token, claimId, Guid.NewGuid());

        isValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForTamperedSignature()
    {
        var service = CreateService();
        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service.GenerateToken(claimId, docId, out _);
        var tampered = token[..^4] + "0000"; // alter last 4 hex chars of signature

        var isValid = service.ValidateTokenSignature(tampered, claimId, docId);
        isValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForMalformedToken_NoDelimiter()
    {
        var service = CreateService();

        var isValid = service.ValidateTokenSignature("nodothere", Guid.NewGuid(), Guid.NewGuid());

        isValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForMalformedToken_InvalidGuid()
    {
        var service = CreateService();

        var isValid = service.ValidateTokenSignature("not-a-guid.somesignature", Guid.NewGuid(), Guid.NewGuid());

        isValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateTokenSignature_ReturnsFalseForDifferentSecret()
    {
        var service1 = CreateService("secret-one-minimum-length-32-chars!");
        var service2 = CreateService("secret-two-minimum-length-32-chars!");

        var claimId = Guid.NewGuid();
        var docId = Guid.NewGuid();

        var token = service1.GenerateToken(claimId, docId, out _);

        // Token generated with service1's secret should not validate with service2
        var isValid = service2.ValidateTokenSignature(token, claimId, docId);
        isValid.Should().BeFalse();
    }
}
