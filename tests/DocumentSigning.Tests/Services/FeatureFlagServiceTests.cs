using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Services;
using FluentAssertions;
using Moq;

namespace DocumentSigning.Tests.Services;

public class FeatureFlagServiceTests
{
    private readonly Mock<IFeatureFlagRepository> _repo = new();

    private FeatureFlagService CreateService() => new(_repo.Object);

    // ── IsEnabledAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task IsEnabledAsync_ReturnsTrue_WhenFlagExistsAndEnabled()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetAsync(merchantId, "ai.summary", default))
             .ReturnsAsync(new MerchantFeatureFlag { IsEnabled = true });

        var result = await CreateService().IsEnabledAsync(merchantId, "ai.summary");

        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsEnabledAsync_ReturnsFalse_WhenFlagExistsButDisabled()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetAsync(merchantId, "bulk.send", default))
             .ReturnsAsync(new MerchantFeatureFlag { IsEnabled = false });

        var result = await CreateService().IsEnabledAsync(merchantId, "bulk.send");

        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsEnabledAsync_ReturnsFalse_WhenFlagDoesNotExist()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetAsync(merchantId, "unknown.feature", default))
             .ReturnsAsync((MerchantFeatureFlag?)null);

        var result = await CreateService().IsEnabledAsync(merchantId, "unknown.feature");

        result.Should().BeFalse();
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsMappedDtos()
    {
        var merchantId = Guid.NewGuid();
        var updatedAt  = DateTime.UtcNow;
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default))
             .ReturnsAsync(new List<MerchantFeatureFlag>
             {
                 new() { FeatureKey = "ai.summary", IsEnabled = true, UpdatedAt = updatedAt },
                 new() { FeatureKey = "bulk.send",  IsEnabled = false, UpdatedAt = null },
             });

        var result = await CreateService().GetAllAsync(merchantId);

        result.Should().HaveCount(2);
        result[0].FeatureKey.Should().Be("ai.summary");
        result[0].IsEnabled.Should().BeTrue();
        result[0].UpdatedAt.Should().Be(updatedAt);
        result[1].IsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmpty_WhenNoFlagsExist()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetByMerchantIdAsync(merchantId, default))
             .ReturnsAsync(new List<MerchantFeatureFlag>());

        var result = await CreateService().GetAllAsync(merchantId);

        result.Should().BeEmpty();
    }

    // ── SetAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task SetAsync_CreatesNewFlag_WhenNotExists()
    {
        var merchantId = Guid.NewGuid();
        _repo.Setup(r => r.GetAsync(merchantId, "ai.summary", default))
             .ReturnsAsync((MerchantFeatureFlag?)null);

        MerchantFeatureFlag? added = null;
        _repo.Setup(r => r.AddAsync(It.IsAny<MerchantFeatureFlag>(), default))
             .Callback<MerchantFeatureFlag, CancellationToken>((f, _) => added = f)
             .Returns(Task.CompletedTask);

        await CreateService().SetAsync(merchantId, "ai.summary", true);

        added.Should().NotBeNull();
        added!.MerchantId.Should().Be(merchantId);
        added.FeatureKey.Should().Be("ai.summary");
        added.IsEnabled.Should().BeTrue();
        _repo.Verify(r => r.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task SetAsync_UpdatesExistingFlag_WhenAlreadyExists()
    {
        var merchantId = Guid.NewGuid();
        var existing   = new MerchantFeatureFlag { MerchantId = merchantId, FeatureKey = "bulk.send", IsEnabled = false };
        _repo.Setup(r => r.GetAsync(merchantId, "bulk.send", default))
             .ReturnsAsync(existing);

        await CreateService().SetAsync(merchantId, "bulk.send", true);

        existing.IsEnabled.Should().BeTrue();
        existing.UpdatedAt.Should().NotBeNull();
        _repo.Verify(r => r.UpdateAsync(existing, default), Times.Once);
        _repo.Verify(r => r.SaveChangesAsync(default), Times.Once);
        _repo.Verify(r => r.AddAsync(It.IsAny<MerchantFeatureFlag>(), default), Times.Never);
    }
}
