using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class PaymentControllerTests
{
    private readonly Mock<IPaymentService> _svc = new();

    private PaymentController CreateController(Merchant? merchant = null)
    {
        var ctrl = new PaymentController(_svc.Object);
        var ctx  = new DefaultHttpContext();
        if (merchant is not null) ctx.Items["Merchant"] = merchant;
        ctrl.ControllerContext = new ControllerContext { HttpContext = ctx };
        return ctrl;
    }

    private static Merchant MakeMerchant() => new()
    {
        Id           = Guid.NewGuid(),
        Name         = "Test Corp",
        ApiKey       = "mk_test",
        IsActive     = true,
        RequestUsed  = 0,
        RequestLimit = 100,
    };

    // ── CreateIntent ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateIntent_Returns201_WithPaymentResult()
    {
        var merchant   = MakeMerchant();
        var envelopeId = Guid.NewGuid();
        var request    = new CreatePaymentIntentRequest(envelopeId, 5000, "usd");
        var returned   = new CreatePaymentIntentResult(Guid.NewGuid(), "pi_secret_xyz", "requires_payment_method");
        _svc.Setup(s => s.CreateIntentAsync(envelopeId, merchant.Id, 5000, "usd", default))
            .ReturnsAsync(returned);

        var result = await CreateController(merchant).CreateIntent(request, default);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.Value.Should().Be(returned);
    }

    [Fact]
    public async Task CreateIntent_Returns401_WhenNoMerchantInContext()
    {
        var request = new CreatePaymentIntentRequest(Guid.NewGuid(), 5000, "usd");

        var result = await CreateController().CreateIntent(request, default);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task CreateIntent_Returns400_WhenAmountIsZero()
    {
        var request = new CreatePaymentIntentRequest(Guid.NewGuid(), 0, "usd");

        var result = await CreateController(MakeMerchant()).CreateIntent(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateIntent_Returns400_WhenCurrencyIsEmpty()
    {
        var request = new CreatePaymentIntentRequest(Guid.NewGuid(), 5000, "");

        var result = await CreateController(MakeMerchant()).CreateIntent(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── GetPayment ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetPayment_Returns200_WhenPaymentExists()
    {
        var envelopeId = Guid.NewGuid();
        var dto        = new EnvelopePaymentDto(Guid.NewGuid(), envelopeId, "pi_abc", 5000, "usd", "succeeded", DateTime.UtcNow, null);
        _svc.Setup(s => s.GetPaymentAsync(envelopeId, default)).ReturnsAsync(dto);

        var result = await CreateController(MakeMerchant()).GetPayment(envelopeId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(dto);
    }

    [Fact]
    public async Task GetPayment_Returns404_WhenPaymentNotFound()
    {
        var envelopeId = Guid.NewGuid();
        _svc.Setup(s => s.GetPaymentAsync(envelopeId, default)).ReturnsAsync((EnvelopePaymentDto?)null);

        var result = await CreateController(MakeMerchant()).GetPayment(envelopeId, default);

        result.Should().BeOfType<NotFoundResult>();
    }
}
