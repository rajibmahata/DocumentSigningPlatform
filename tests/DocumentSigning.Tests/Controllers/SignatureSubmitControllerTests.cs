using System.Text;
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

public class SignatureSubmitControllerTests
{
    private readonly Mock<ISigningRequestRepository> _signingRequestRepo = new();
    private readonly Mock<IOutboxQueueRepository> _outboxRepo = new();
    private readonly Mock<IAuditLogRepository> _auditRepo = new();
    private readonly Mock<ITokenService> _tokenService = new();

    private SignatureSubmitController CreateController()
    {
        var controller = new SignatureSubmitController(
            _signingRequestRepo.Object,
            _outboxRepo.Object,
            _auditRepo.Object,
            _tokenService.Object);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    private static SubmitSignatureRequest ValidRequest() =>
        new(Convert.ToBase64String(Encoding.UTF8.GetBytes("sig-image-data")));

    private SigningRequest MakePendingRequest(string token = "tok") => new()
    {
        Id = Guid.NewGuid(),
        Token = token,
        ClaimId = Guid.NewGuid(),
        DocumentId = Guid.NewGuid(),
        Status = SigningStatus.Pending,
        ExpiresAt = DateTime.UtcNow.AddDays(1)
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Submit_ReturnsBadRequest_WhenSignatureBase64IsEmpty()
    {
        var request = new SubmitSignatureRequest("");

        var result = await CreateController().Submit("tok", request, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("SignatureBase64 is required.");
    }

    [Fact]
    public async Task Submit_ReturnsNotFound_WhenTokenNotFound()
    {
        _signingRequestRepo.Setup(r => r.GetByTokenAsync("missing", It.IsAny<CancellationToken>()))
            .ReturnsAsync((SigningRequest?)null);

        var result = await CreateController().Submit("missing", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().Be("Token not found.");
    }

    [Fact]
    public async Task Submit_ReturnsGone_WhenTokenExpired()
    {
        var sr = MakePendingRequest("tok");
        sr.ExpiresAt = DateTime.UtcNow.AddDays(-1);

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);

        var result = await CreateController().Submit("tok", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status410Gone);
    }

    [Fact]
    public async Task Submit_ReturnsBadRequest_WhenStatusIsNotPending()
    {
        var sr = MakePendingRequest("tok");
        sr.Status = SigningStatus.Signed;

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);

        var result = await CreateController().Submit("tok", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("This signing request is no longer pending.");
    }

    [Fact]
    public async Task Submit_ReturnsBadRequest_WhenTokenSignatureInvalid()
    {
        var sr = MakePendingRequest("tok");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(false);

        var result = await CreateController().Submit("tok", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("Invalid token signature.");
    }

    [Fact]
    public async Task Submit_ReturnsBadRequest_WhenSignatureBase64IsInvalidBase64()
    {
        var sr = MakePendingRequest("tok");
        var badRequest = new SubmitSignatureRequest("!!!not-valid-base64!!!");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(true);

        var result = await CreateController().Submit("tok", badRequest, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("SignatureBase64 is not valid base64.");
    }

    [Fact]
    public async Task Submit_ReturnsConflict_WhenLockFails()
    {
        var sr = MakePendingRequest("tok");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(true);
        _signingRequestRepo.Setup(r => r.TryLockForProcessingAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await CreateController().Submit("tok", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>()
            .Which.Value.Should().Be("Signing request is already being processed.");
    }

    [Fact]
    public async Task Submit_ReturnsAccepted_WhenValid()
    {
        var sr = MakePendingRequest("tok");

        _signingRequestRepo.Setup(r => r.GetByTokenAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);
        _tokenService.Setup(t => t.ValidateTokenSignature("tok", sr.ClaimId, sr.DocumentId))
            .Returns(true);
        _signingRequestRepo.Setup(r => r.TryLockForProcessingAsync("tok", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _outboxRepo.Setup(r => r.AddAsync(It.IsAny<OutboxQueue>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _outboxRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _auditRepo.Setup(r => r.AppendAsync(It.IsAny<AuditLog>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _auditRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var result = await CreateController().Submit("tok", ValidRequest(), CancellationToken.None);

        result.Should().BeOfType<AcceptedResult>();
    }
}
