using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Services;
using FluentAssertions;
using Moq;

namespace DocumentSigning.Tests.Services;

public class BrandingServiceTests
{
    private readonly Mock<IMerchantBrandingRepository> _repo = new();

    private BrandingService CreateService() => new(_repo.Object);

    private static MerchantBranding MakeEntity(Guid merchantId) => new()
    {
        Id               = Guid.NewGuid(),
        MerchantId       = merchantId,
        CustomDomain     = "sign.acme.com",
        LogoUrl          = "https://cdn.acme.com/logo.png",
        PrimaryColor     = "#0055FF",
        EmailFromName    = "Acme Contracts",
        PortalFooterText = "© 2026 Acme",
        CreatedAt        = DateTime.UtcNow,
        UpdatedAt        = DateTime.UtcNow,
    };

    // ── GetAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAsync_ReturnsDto_WhenBrandingExists()
    {
        var merchantId = Guid.NewGuid();
        var entity     = MakeEntity(merchantId);
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default)).ReturnsAsync(entity);

        var result = await CreateService().GetAsync(merchantId);

        result.Should().NotBeNull();
        result!.MerchantId.Should().Be(merchantId);
        result.CustomDomain.Should().Be("sign.acme.com");
        result.PrimaryColor.Should().Be("#0055FF");
    }

    [Fact]
    public async Task GetAsync_ReturnsNull_WhenNoBrandingExists()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default))
             .ReturnsAsync((MerchantBranding?)null);

        var result = await CreateService().GetAsync(merchantId);

        result.Should().BeNull();
    }

    // ── UpsertAsync (create path) ─────────────────────────────────────────────

    [Fact]
    public async Task UpsertAsync_CreatesNewBranding_WhenNoneExists()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default))
             .ReturnsAsync((MerchantBranding?)null);

        MerchantBranding? added = null;
        _repo.Setup(r => r.AddAsync(It.IsAny<MerchantBranding>(), default))
             .Callback<MerchantBranding, CancellationToken>((e, _) => added = e)
             .Returns(Task.CompletedTask);

        var request = new UpsertBrandingRequest("sign.acme.com", "https://logo.png", "#123456", "Acme", "Footer");

        var result = await CreateService().UpsertAsync(merchantId, request);

        added.Should().NotBeNull();
        added!.MerchantId.Should().Be(merchantId);
        added.CustomDomain.Should().Be("sign.acme.com");
        result.MerchantId.Should().Be(merchantId);
        result.PrimaryColor.Should().Be("#123456");
        _repo.Verify(r => r.AddAsync(It.IsAny<MerchantBranding>(), default), Times.Once);
        _repo.Verify(r => r.SaveChangesAsync(default), Times.Once);
    }

    // ── UpsertAsync (update path) ─────────────────────────────────────────────

    [Fact]
    public async Task UpsertAsync_UpdatesExistingBranding_WhenAlreadyExists()
    {
        var merchantId = Guid.NewGuid();
        var entity     = MakeEntity(merchantId);
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default)).ReturnsAsync(entity);

        var request = new UpsertBrandingRequest("new.domain.com", null, "#FFFFFF", null, null);

        var result = await CreateService().UpsertAsync(merchantId, request);

        entity.CustomDomain.Should().Be("new.domain.com");
        entity.PrimaryColor.Should().Be("#FFFFFF");
        entity.UpdatedAt.Should().NotBeNull();
        result.CustomDomain.Should().Be("new.domain.com");
        _repo.Verify(r => r.UpdateAsync(entity, default), Times.Once);
        _repo.Verify(r => r.AddAsync(It.IsAny<MerchantBranding>(), default), Times.Never);
    }
}
