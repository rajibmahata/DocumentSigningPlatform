using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class EnvelopeControllerTests
{
    private readonly Mock<IMerchantRepository>          _merchantRepo      = new();
    private readonly Mock<ISigningEnvelopeRepository>   _envelopeRepo      = new();
    private readonly Mock<IClaimRepository>             _claimRepo         = new();
    private readonly Mock<ISigningRequestRepository>    _signingRequestRepo = new();
    private readonly Mock<ISignedDocumentRepository>    _signedDocRepo     = new();
    private readonly Mock<IOutboxQueueRepository>       _outboxRepo        = new();
    private readonly Mock<IAuditService>                _audit             = new();
    private readonly Mock<ITokenService>                _tokenService      = new();
    private readonly Mock<IConfiguration>               _config            = new();

    // ── Helpers ───────────────────────────────────────────────────────────────

    private EnvelopeController CreateController(Merchant? merchant = null)
    {
        var controller = new EnvelopeController(
            _merchantRepo.Object,
            _envelopeRepo.Object,
            _claimRepo.Object,
            _signingRequestRepo.Object,
            _signedDocRepo.Object,
            _outboxRepo.Object,
            _audit.Object,
            _tokenService.Object,
            _config.Object);

        var httpContext = new DefaultHttpContext();
        if (merchant is not null)
            httpContext.Items["Merchant"] = merchant;

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    private static Merchant MakeMerchant(Guid? id = null) => new()
    {
        Id         = id ?? Guid.NewGuid(),
        Name       = "Test Corp",
        ApiKey     = "mk_test",
        IsActive   = true,
        RequestUsed = 0,
        RequestLimit = 100
    };

    private static SigningEnvelope MakeEnvelope(Guid merchantId, EnvelopeStatus status = EnvelopeStatus.Sent) => new()
    {
        Id         = Guid.NewGuid(),
        MerchantId = merchantId,
        Title      = "Test Envelope",
        Status     = status,
        CreatedAt  = DateTime.UtcNow,
        Documents  = new List<Document>(),
        Signers    = new List<Signer>()
    };

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsUnauthorized_WhenNoMerchantInContext()
    {
        var result = await CreateController(merchant: null).GetById(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenEnvelopeDoesNotExist()
    {
        var merchant = MakeMerchant();
        _envelopeRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SigningEnvelope?)null);

        var result = await CreateController(merchant).GetById(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenEnvelopeBelongsToDifferentMerchant()
    {
        var merchant  = MakeMerchant();
        var envelope  = MakeEnvelope(Guid.NewGuid()); // different merchant

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).GetById(envelope.Id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetById_Returns200_WithMappedResponse()
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, EnvelopeStatus.Sent);

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).GetById(envelope.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().NotBeNull();
    }

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsUnauthorized_WhenNoMerchantInContext()
    {
        var result = await CreateController(merchant: null).GetAll(CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task GetAll_Returns200_WithAllEnvelopes()
    {
        var merchant = MakeMerchant();
        var envelopes = new List<SigningEnvelope>
        {
            MakeEnvelope(merchant.Id, EnvelopeStatus.Sent),
            MakeEnvelope(merchant.Id, EnvelopeStatus.Completed),
        };

        _envelopeRepo.Setup(r => r.GetByMerchantAsync(merchant.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelopes);

        var result = await CreateController(merchant).GetAll(CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Cancel_ReturnsUnauthorized_WhenNoMerchantInContext()
    {
        var result = await CreateController(merchant: null).Cancel(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task Cancel_ReturnsNotFound_WhenEnvelopeDoesNotExist()
    {
        var merchant = MakeMerchant();
        _envelopeRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SigningEnvelope?)null);

        var result = await CreateController(merchant).Cancel(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Cancel_ReturnsNotFound_WhenEnvelopeBelongsToDifferentMerchant()
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(Guid.NewGuid(), EnvelopeStatus.Sent); // different merchant

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).Cancel(envelope.Id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Theory]
    [InlineData(EnvelopeStatus.Completed)]
    [InlineData(EnvelopeStatus.Cancelled)]
    [InlineData(EnvelopeStatus.Failed)]
    [InlineData(EnvelopeStatus.Expired)]
    [InlineData(EnvelopeStatus.Rejected)]
    public async Task Cancel_ReturnsBadRequest_WhenEnvelopeInTerminalState(EnvelopeStatus status)
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, status);

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).Cancel(envelope.Id, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<string>()
            .Which.Should().Contain(status.ToString());
    }

    [Theory]
    [InlineData(EnvelopeStatus.Processing)]
    [InlineData(EnvelopeStatus.Sent)]
    [InlineData(EnvelopeStatus.Signed)]
    public async Task Cancel_ReturnsNoContent_WhenEnvelopeIsCancellable(EnvelopeStatus status)
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, status);

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);
        _envelopeRepo.Setup(r => r.UpdateAsync(envelope, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _envelopeRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await CreateController(merchant).Cancel(envelope.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        envelope.Status.Should().Be(EnvelopeStatus.Cancelled);
    }

    [Fact]
    public async Task Cancel_AuditsTheCancellation()
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, EnvelopeStatus.Sent);

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);
        _envelopeRepo.Setup(r => r.UpdateAsync(envelope, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _envelopeRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        await CreateController(merchant).Cancel(envelope.Id, CancellationToken.None);

        _audit.Verify(a => a.Log(It.Is<AuditEntry>(e =>
            e.Action     == AuditActions.EnvelopeCancelled &&
            e.EntityId   == envelope.Id &&
            e.MerchantId == merchant.Id)), Times.Once);
    }

    // ── MapToResponse (via GetById) ───────────────────────────────────────────

    [Fact]
    public async Task MapToResponse_DerivedStatus_IsCompleted_WhenAllSignersSigned()
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, EnvelopeStatus.Sent);
        envelope.Signers = new List<Signer>
        {
            new() { Name = "Alice", Email = "a@test.com", Role = "S", Status = SigningStatus.Signed, CreatedAt = DateTime.UtcNow },
            new() { Name = "Bob",   Email = "b@test.com", Role = "S", Status = SigningStatus.Signed, CreatedAt = DateTime.UtcNow },
        };

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).GetById(envelope.Id, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value;
        body.Should().NotBeNull();
        // Status field should be Completed since all signers signed
        var statusProp = body!.GetType().GetProperty("Status")?.GetValue(body)?.ToString();
        statusProp.Should().Be("Completed");
    }

    [Fact]
    public async Task MapToResponse_DerivedStatus_IsSigned_WhenPartiallyComplete()
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, EnvelopeStatus.Sent);
        envelope.Signers = new List<Signer>
        {
            new() { Name = "Alice", Email = "a@test.com", Role = "S", Status = SigningStatus.Signed,  CreatedAt = DateTime.UtcNow },
            new() { Name = "Bob",   Email = "b@test.com", Role = "S", Status = SigningStatus.Pending, CreatedAt = DateTime.UtcNow },
        };

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).GetById(envelope.Id, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value;
        var statusProp = body!.GetType().GetProperty("Status")?.GetValue(body)?.ToString();
        statusProp.Should().Be("Signed");
    }

    [Theory]
    [InlineData(EnvelopeStatus.Cancelled)]
    [InlineData(EnvelopeStatus.Rejected)]
    [InlineData(EnvelopeStatus.Failed)]
    [InlineData(EnvelopeStatus.Expired)]
    public async Task MapToResponse_PreservesTerminalStatus_EvenWhenSignersExist(EnvelopeStatus terminalStatus)
    {
        var merchant = MakeMerchant();
        var envelope = MakeEnvelope(merchant.Id, terminalStatus);
        envelope.Signers = new List<Signer>
        {
            // Even if signer is technically "Signed", terminal DB status wins
            new() { Name = "Alice", Email = "a@test.com", Role = "S", Status = SigningStatus.Signed, CreatedAt = DateTime.UtcNow },
        };

        _envelopeRepo.Setup(r => r.GetByIdAsync(envelope.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(envelope);

        var result = await CreateController(merchant).GetById(envelope.Id, CancellationToken.None);

        var body = result.Should().BeOfType<OkObjectResult>().Subject.Value;
        var statusProp = body!.GetType().GetProperty("Status")?.GetValue(body)?.ToString();
        statusProp.Should().Be(terminalStatus.ToString());
    }
}
