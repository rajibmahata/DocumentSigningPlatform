using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class BrandingControllerTests
{
    private readonly Mock<IBrandingService> _svc = new();

    private BrandingController CreateController()
    {
        var ctrl = new BrandingController(_svc.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return ctrl;
    }

    private static MerchantBrandingDto MakeDto(Guid merchantId) =>
        new(merchantId, "sign.acme.com", "https://logo.png", "#0055FF", "Acme", "© 2026", DateTime.UtcNow);

    // ── Get ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Get_Returns200_WhenBrandingExists()
    {
        var merchantId = Guid.NewGuid();
        _svc.Setup(s => s.GetAsync(merchantId, default)).ReturnsAsync(MakeDto(merchantId));

        var result = await CreateController().Get(merchantId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<MerchantBrandingDto>()
          .Which.MerchantId.Should().Be(merchantId);
    }

    [Fact]
    public async Task Get_Returns200WithDefaults_WhenNoBranding()
    {
        var merchantId = Guid.NewGuid();
        _svc.Setup(s => s.GetAsync(merchantId, default)).ReturnsAsync((MerchantBrandingDto?)null);

        var result = await CreateController().Get(merchantId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<MerchantBrandingDto>()
          .Which.MerchantId.Should().Be(merchantId);
    }

    // ── Upsert ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Upsert_Returns200_WithUpdatedDto()
    {
        var merchantId = Guid.NewGuid();
        var request    = new UpsertBrandingRequest("sign.acme.com", null, "#ABCDEF", "Test", null);
        var returned   = new MerchantBrandingDto(merchantId, "sign.acme.com", null, "#ABCDEF", "Test", null, DateTime.UtcNow);
        _svc.Setup(s => s.UpsertAsync(merchantId, request, default)).ReturnsAsync(returned);

        var result = await CreateController().Upsert(merchantId, request, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<MerchantBrandingDto>()
          .Which.PrimaryColor.Should().Be("#ABCDEF");
    }

    [Fact]
    public async Task Upsert_Returns400_WhenRequestIsNull()
    {
        var result = await CreateController().Upsert(Guid.NewGuid(), null!, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
