using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class BlockchainControllerTests
{
    private readonly Mock<IBlockchainService>  _blockchain = new();
    private readonly Mock<IFeatureFlagService> _features   = new();

    private BlockchainController CreateController(Merchant? merchant = null)
    {
        var ctrl = new BlockchainController(_blockchain.Object, _features.Object);
        var ctx  = new DefaultHttpContext();
        if (merchant is not null) ctx.Items["Merchant"] = merchant;
        ctrl.ControllerContext = new ControllerContext { HttpContext = ctx };
        return ctrl;
    }

    private static Merchant MakeMerchant(Guid? id = null) => new()
    {
        Id           = id ?? Guid.NewGuid(),
        Name         = "Corp",
        ApiKey       = "mk_test",
        IsActive     = true,
        RequestUsed  = 0,
        RequestLimit = 100,
    };

    // ── GetRecord ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetRecord_Returns200_WhenRecordExists()
    {
        var envelopeId = Guid.NewGuid();
        var dto = new BlockchainRecordDto(Guid.NewGuid(), envelopeId, "abc123", "polygon", "0xTxHash", "Confirmed", DateTime.UtcNow, DateTime.UtcNow);
        _blockchain.Setup(s => s.GetRecordAsync(envelopeId, default)).ReturnsAsync(dto);

        var result = await CreateController().GetRecord(envelopeId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(dto);
    }

    [Fact]
    public async Task GetRecord_Returns404_WhenNoRecord()
    {
        var envelopeId = Guid.NewGuid();
        _blockchain.Setup(s => s.GetRecordAsync(envelopeId, default)).ReturnsAsync((BlockchainRecordDto?)null);

        var result = await CreateController().GetRecord(envelopeId, default);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── Notarize ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Notarize_Returns202_WhenFeatureEnabled()
    {
        var merchantId = Guid.NewGuid();
        var envelopeId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "blockchain", default)).ReturnsAsync(true);
        _blockchain.Setup(b => b.EnqueueNotarizationAsync(envelopeId, default)).Returns(Task.CompletedTask);

        var result = await CreateController().Notarize(envelopeId, merchantId, default);

        result.Should().BeOfType<AcceptedResult>();
        _blockchain.Verify(b => b.EnqueueNotarizationAsync(envelopeId, default), Times.Once);
    }

    [Fact]
    public async Task Notarize_Returns402_WhenFeatureDisabled()
    {
        var merchantId = Guid.NewGuid();
        var envelopeId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "blockchain", default)).ReturnsAsync(false);

        var result = await CreateController().Notarize(envelopeId, merchantId, default);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(402);
        _blockchain.Verify(b => b.EnqueueNotarizationAsync(It.IsAny<Guid>(), default), Times.Never);
    }
}
