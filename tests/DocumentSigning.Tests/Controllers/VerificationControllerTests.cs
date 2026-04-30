using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class VerificationControllerTests
{
    private readonly Mock<IIdentityVerificationService> _verification = new();
    private readonly Mock<ISigningRequestRepository>    _srRepo       = new();
    private readonly Mock<IClaimRepository>             _claimRepo    = new();

    private VerificationController CreateController(Guid? merchantId = null)
    {
        var mid = merchantId ?? Guid.NewGuid();

        // Wire up IServiceProvider so the controller can resolve repos from HttpContext
        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider.Setup(sp => sp.GetService(typeof(ISigningRequestRepository)))
                       .Returns(_srRepo.Object);
        serviceProvider.Setup(sp => sp.GetService(typeof(IClaimRepository)))
                       .Returns(_claimRepo.Object);

        var httpContext = new DefaultHttpContext { RequestServices = serviceProvider.Object };
        httpContext.Items["Merchant"] = new Merchant { Id = mid, Name = "Test Merchant" };

        return new VerificationController(_verification.Object)
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext }
        };
    }

    // ── Start ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Start_Returns201_WhenRequestIsValid()
    {
        var merchantId       = Guid.NewGuid();
        var signingRequestId = Guid.NewGuid();
        var claimId          = Guid.NewGuid();

        _srRepo.Setup(r => r.GetByIdAsync(signingRequestId, default))
               .ReturnsAsync(new SigningRequest { Id = signingRequestId, ClaimId = claimId, Token = "tok",
                   DocumentId = Guid.NewGuid(), ExpiresAt = DateTime.UtcNow.AddDays(7), CreatedAt = DateTime.UtcNow });

        _claimRepo.Setup(r => r.GetByIdAsync(claimId, default))
                  .ReturnsAsync(new Claim { Id = claimId, ClaimantEmail = "signer@test.com",
                      ClaimantName = "Signer", Status = ClaimStatus.Active, CreatedAt = DateTime.UtcNow });

        var verificationId = Guid.NewGuid();
        _verification.Setup(s => s.StartAsync(signingRequestId, merchantId, "signer@test.com", "Passport", "base64img", default))
                     .ReturnsAsync(new StartVerificationResult(verificationId, "Pending"));

        var request = new StartVerificationRequest(signingRequestId, "Passport", "base64img");

        var result = await CreateController(merchantId).Start(request, default);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.StatusCode.Should().Be(201);
        var value = created.Value.Should().BeOfType<StartVerificationResult>().Subject;
        value.VerificationId.Should().Be(verificationId);
        value.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task Start_Returns400_WhenRequestBodyIsNull()
    {
        var result = await CreateController().Start(null!, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Start_Returns400_WhenDocumentTypeIsEmpty()
    {
        var request = new StartVerificationRequest(Guid.NewGuid(), "", "base64img");

        var result = await CreateController().Start(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Start_Returns400_WhenIdImageIsEmpty()
    {
        var request = new StartVerificationRequest(Guid.NewGuid(), "Passport", "");

        var result = await CreateController().Start(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Start_Returns404_WhenSigningRequestNotFound()
    {
        var signingRequestId = Guid.NewGuid();
        _srRepo.Setup(r => r.GetByIdAsync(signingRequestId, default))
               .ReturnsAsync((SigningRequest?)null);

        var request = new StartVerificationRequest(signingRequestId, "Passport", "base64img");

        var result = await CreateController().Start(request, default);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── GetStatus ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_Returns200_WhenFound()
    {
        var signingRequestId  = Guid.NewGuid();
        var verificationId    = Guid.NewGuid();
        var dto = new IdentityVerificationDto(verificationId, signingRequestId,
            "signer@test.com", "Passport", "Pending", 60, null, DateTime.UtcNow, DateTime.UtcNow.AddDays(7));

        _verification.Setup(s => s.GetAsync(signingRequestId, default)).ReturnsAsync(dto);

        var result = await CreateController().GetStatus(signingRequestId, default);

        result.Should().BeOfType<OkObjectResult>().Which.Value.Should().Be(dto);
    }

    [Fact]
    public async Task GetStatus_Returns404_WhenNotFound()
    {
        var signingRequestId = Guid.NewGuid();
        _verification.Setup(s => s.GetAsync(signingRequestId, default))
                     .ReturnsAsync((IdentityVerificationDto?)null);

        var result = await CreateController().GetStatus(signingRequestId, default);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── Review ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Review_Returns204_WhenApproved()
    {
        var verificationId = Guid.NewGuid();
        _verification.Setup(s => s.ReviewAsync(verificationId, true, null, default))
                     .Returns(Task.CompletedTask);

        var result = await CreateController().Review(verificationId, new ReviewVerificationRequest(true), default);

        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Review_Returns204_WhenRejectedWithReason()
    {
        var verificationId = Guid.NewGuid();
        _verification.Setup(s => s.ReviewAsync(verificationId, false, "Expired document", default))
                     .Returns(Task.CompletedTask);

        var result = await CreateController().Review(verificationId,
            new ReviewVerificationRequest(false, "Expired document"), default);

        result.Should().BeOfType<NoContentResult>();
    }
}
