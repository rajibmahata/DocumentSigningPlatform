using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class PortalControllerTests
{
    private readonly Mock<ISigningRequestRepository> _signingRequestRepo = new();
    private readonly Mock<IDocumentRepository>        _docRepo            = new();
    private readonly Mock<IClaimRepository>           _claimRepo          = new();
    private readonly Mock<IAuditService>              _audit              = new();
    private readonly Mock<ITokenService>              _tokenService       = new();
    private readonly Mock<ISigningEnvelopeRepository> _envelopeRepo       = new();
    private readonly Mock<ISignedDocumentRepository>  _signedDocRepo      = new();
    private readonly Mock<IConfirmTokenService>       _confirmTokenSvc    = new();
    private readonly Mock<ISignerRepository>          _signerRepo         = new();
    private readonly Mock<IWebhookService>            _webhookService     = new();
    private readonly Mock<IConfiguration>             _config             = new();

    private PortalController CreateController()
    {
        var controller = new PortalController(
            _signingRequestRepo.Object,
            _docRepo.Object,
            _claimRepo.Object,
            _audit.Object,
            _tokenService.Object,
            _envelopeRepo.Object,
            _signedDocRepo.Object,
            _confirmTokenSvc.Object,
            _signerRepo.Object,
            _webhookService.Object,
            _config.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    private SigningRequest MakePendingRequest(string token = "validtoken") => new()
    {
        Id = Guid.NewGuid(),
        Token = token,
        ClaimId = Guid.NewGuid(),
        DocumentId = Guid.NewGuid(),
        Status = SigningStatus.Pending,
        ExpiresAt = DateTime.UtcNow.AddDays(1),
        CreatedAt = DateTime.UtcNow
    };

    // ── Validate ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Validate_ReturnsNotFound_WhenTokenNotFound()
    {
        _signingRequestRepo.Setup(r => r.GetByTokenAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((SigningRequest?)null);

        var result = await CreateController().Validate("missing", CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().Be("Token not found.");
    }

    [Fact]
    public async Task Validate_ReturnsGone_WhenTokenExpired()
    {
        var sr = MakePendingRequest();
        sr.ExpiresAt = DateTime.UtcNow.AddDays(-1); // expired

        _signingRequestRepo.Setup(r => r.GetByTokenAsync(sr.Token, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);

        var result = await CreateController().Validate(sr.Token, CancellationToken.None);

        var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusResult.StatusCode.Should().Be(StatusCodes.Status410Gone);
    }

    [Fact]
    public async Task Validate_ReturnsBadRequest_WhenAlreadySigned()
    {
        var sr = MakePendingRequest();
        sr.Status = SigningStatus.Signed;
        sr.ExpiresAt = DateTime.UtcNow.AddDays(1);

        _signingRequestRepo.Setup(r => r.GetByTokenAsync(sr.Token, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);

        var result = await CreateController().Validate(sr.Token, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("This document has already been signed.");
    }

    [Fact]
    public async Task Validate_ReturnsBadRequest_WhenTokenSignatureInvalid()
    {
        var sr = MakePendingRequest("token123");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("token123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("token123", sr.ClaimId, sr.DocumentId))
            .Returns(false);

        var result = await CreateController().Validate("token123", CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("Invalid token signature.");
    }

    [Fact]
    public async Task Validate_ReturnsNotFound_WhenDocumentNotFound()
    {
        var sr = MakePendingRequest("tok");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(true);
        _docRepo.Setup(r => r.GetByIdAsync(sr.DocumentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Document?)null);

        var result = await CreateController().Validate("tok", CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().Be("Document not found.");
    }

    [Fact]
    public async Task Validate_ReturnsNotFound_WhenClaimNotFound()
    {
        var sr = MakePendingRequest("tok");
        var doc = new Document
        {
            Id = sr.DocumentId,
            ContentBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 },
            ContentType = "application/pdf"
        };

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(true);
        _docRepo.Setup(r => r.GetByIdAsync(sr.DocumentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(doc);
        _claimRepo.Setup(r => r.GetByIdAsync(sr.ClaimId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Claim?)null);

        var result = await CreateController().Validate("tok", CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().Be("Claim not found.");
    }

    [Fact]
    public async Task Validate_ReturnsOk_WithDocumentPreview()
    {
        var sr = MakePendingRequest("goodtoken");
        var docBytes = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        var doc = new Document
        {
            Id = sr.DocumentId,
            ContentBytes = docBytes,
            ContentType = "application/pdf"
        };
        var claim = new Claim
        {
            Id = sr.ClaimId,
            ClaimantName = "Alice",
            ClaimantEmail = "alice@test.com"
        };

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("goodtoken", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("goodtoken", sr.ClaimId, sr.DocumentId))
            .Returns(true);
        _docRepo.Setup(r => r.GetByIdAsync(sr.DocumentId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(doc);
        _claimRepo.Setup(r => r.GetByIdAsync(sr.ClaimId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(claim);
        _audit.Setup(a => a.Log(It.IsAny<AuditEntry>()));

        var result = await CreateController().Validate("goodtoken", CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var preview = ok.Value.Should().BeOfType<DocumentPreviewResponse>().Subject;
        preview.ClaimantName.Should().Be("Alice");
        preview.ContentType.Should().Be("application/pdf");
        preview.DocumentBase64.Should().Be(Convert.ToBase64String(docBytes));
        preview.ExpiresAt.Should().Be(sr.ExpiresAt);
    }
}
