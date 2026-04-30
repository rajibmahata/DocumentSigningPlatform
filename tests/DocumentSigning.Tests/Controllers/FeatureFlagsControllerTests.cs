using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class FeatureFlagsControllerTests
{
    private readonly Mock<IFeatureFlagService> _svc = new();

    private FeatureFlagsController CreateController()
    {
        var ctrl = new FeatureFlagsController(_svc.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return ctrl;
    }

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200_WithFlagList()
    {
        var merchantId = Guid.NewGuid();
        var flags = new List<FeatureFlagDto>
        {
            new("ai.summary", true, DateTime.UtcNow),
            new("bulk.send",  false, null),
        };
        _svc.Setup(s => s.GetAllAsync(merchantId, default)).ReturnsAsync(flags);

        var result = await CreateController().GetAll(merchantId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(flags);
    }

    [Fact]
    public async Task GetAll_Returns200_WithEmptyList_WhenNoFlags()
    {
        var merchantId = Guid.NewGuid();
        _svc.Setup(s => s.GetAllAsync(merchantId, default))
            .ReturnsAsync(new List<FeatureFlagDto>());

        var result = await CreateController().GetAll(merchantId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ((IEnumerable<FeatureFlagDto>)ok.Value!).Should().BeEmpty();
    }

    // ── Set ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Set_Returns200_WithUpdatedFlag()
    {
        var merchantId  = Guid.NewGuid();
        var featureKey  = "ai.summary";
        var request     = new SetFeatureFlagRequest(featureKey, true);
        _svc.Setup(s => s.SetAsync(merchantId, featureKey, true, default))
            .Returns(Task.CompletedTask);

        var result = await CreateController().Set(merchantId, featureKey, request, default);

        var ok  = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<FeatureFlagDto>().Subject;
        dto.FeatureKey.Should().Be(featureKey);
        dto.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task Set_Returns400_WhenFeatureKeyIsEmpty()
    {
        var result = await CreateController().Set(Guid.NewGuid(), "", new SetFeatureFlagRequest("", true), default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
