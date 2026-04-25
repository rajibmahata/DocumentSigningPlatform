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
    private readonly Mock<IAuditLogRepository>          _auditLogRepo      = new();
    private readonly Mock<ITokenService>                _tokenService      = new();
    private readonly Mock<IDocumentRepository>          _documentRepo      = new();
    private readonly Mock<IConfiguration>               _config            = new();
    private readonly Mock<IWebhookService>              _webhookService    = new();
    private readonly Mock<IEmailService>                _emailService      = new();
    private readonly Mock<IUserRepository>              _userRepo          = new();
    private readonly Mock<ISignerContactService>        _signerContactSvc  = new();
    private readonly Mock<INotificationService>         _notificationSvc   = new();
    private readonly Mock<IConfirmTokenService>         _confirmTokenSvc   = new();

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
            _auditLogRepo.Object,
            _tokenService.Object,
            _documentRepo.Object,
            _config.Object,
            _webhookService.Object,
            _emailService.Object,
            _userRepo.Object,
            _signerContactSvc.Object,
            _notificationSvc.Object,
            _confirmTokenSvc.Object);

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

    // ── TokenTtlDays ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_WithTokenTtlDays2_SetsExpiresAtWithin2DaysOfNow()
    {
        // Arrange
        var merchant = MakeMerchant();

        // Use a real IConfiguration so GetValue<int>() extension works
        var realConfig = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:FrontendUrl"]        = "http://localhost:3000",
                ["App:EnvelopeExpiryDays"] = "7"   // server default; should be overridden by TokenTtlDays=2
            })
            .Build();

        _tokenService
            .Setup(t => t.GenerateToken(It.IsAny<Guid>(), It.IsAny<Guid>(), out It.Ref<Guid>.IsAny))
            .Returns("tok_test");
        _confirmTokenSvc
            .Setup(s => s.GenerateToken(It.IsAny<Guid>()))
            .Returns("confirm_test");

        _envelopeRepo.Setup(r => r.AddAsync(It.IsAny<SigningEnvelope>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _envelopeRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _envelopeRepo.Setup(r => r.UpdateAsync(It.IsAny<SigningEnvelope>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _claimRepo.Setup(r => r.AddAsync(It.IsAny<DocumentSigning.Core.Entities.Claim>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _claimRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _signingRequestRepo.Setup(r => r.AddAsync(It.IsAny<SigningRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _signingRequestRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _outboxRepo.Setup(r => r.AddAsync(It.IsAny<DocumentSigning.Core.Entities.OutboxQueue>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _outboxRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.UpdateAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _signerContactSvc
            .Setup(s => s.UpsertFromSignerAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _notificationSvc
            .Setup(s => s.NotifyAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _webhookService
            .Setup(s => s.TriggerAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Capture the SigningRequest that gets saved so we can inspect ExpiresAt
        SigningRequest? capturedRequest = null;
        _signingRequestRepo
            .Setup(r => r.AddAsync(It.IsAny<SigningRequest>(), It.IsAny<CancellationToken>()))
            .Callback<SigningRequest, CancellationToken>((sr, _) => capturedRequest = sr)
            .Returns(Task.CompletedTask);

        // A valid PDF base64 (minimal 1-byte content is enough for base64 decode)
        var pdfBase64 = Convert.ToBase64String(new byte[] { 0x25, 0x50, 0x44, 0x46 }); // "%PDF"

        var request = new DocumentSigning.Core.DTOs.InitiateEnvelopeRequest(
            Title:        "TTL Test Envelope",
            MerchantId:   merchant.Id,
            Documents:    new List<DocumentSigning.Core.DTOs.DocumentInput>
            {
                new("Contract", "contract.pdf", pdfBase64, "application/pdf")
            },
            Signers:      new List<DocumentSigning.Core.DTOs.SignerInput>
            {
                new("Alice", "alice@test.com", "Signer", 1, "Please sign")
            },
            TokenTtlDays: 2);

        var before = DateTime.UtcNow;

        // Build controller using real config instead of mock
        var controller = new EnvelopeController(
            _merchantRepo.Object,
            _envelopeRepo.Object,
            _claimRepo.Object,
            _signingRequestRepo.Object,
            _signedDocRepo.Object,
            _outboxRepo.Object,
            _audit.Object,
            _auditLogRepo.Object,
            _tokenService.Object,
            _documentRepo.Object,
            realConfig,
            _webhookService.Object,
            _emailService.Object,
            _userRepo.Object,
            _signerContactSvc.Object,
            _notificationSvc.Object,
            _confirmTokenSvc.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { Items = { ["Merchant"] = merchant } }
        };

        // Act
        var result = await controller.Create(request, CancellationToken.None);

        // Assert — HTTP 201
        result.Should().BeOfType<CreatedAtActionResult>();

        // Assert — ExpiresAt is approx now + 2 days (not the server default of 7)
        capturedRequest.Should().NotBeNull();
        capturedRequest!.ExpiresAt.Should().BeCloseTo(before.AddDays(2), precision: TimeSpan.FromSeconds(5));
    }
}
