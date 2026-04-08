using System.Text;
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

public class SigningControllerTests
{
    private readonly Mock<IClaimRepository> _claimRepo = new();
    private readonly Mock<IDocumentRepository> _docRepo = new();
    private readonly Mock<ISigningRequestRepository> _signingRequestRepo = new();
    private readonly Mock<IOutboxQueueRepository> _outboxRepo = new();
    private readonly Mock<IAuditLogRepository> _auditRepo = new();
    private readonly Mock<ITokenService> _tokenService = new();
    private readonly IConfiguration _config;

    public SigningControllerTests()
    {
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "App:BaseUrl", "https://test.example.com" }
            })
            .Build();
    }

    private SigningController CreateController()
    {
        var controller = new SigningController(
            _claimRepo.Object,
            _docRepo.Object,
            _signingRequestRepo.Object,
            _outboxRepo.Object,
            _auditRepo.Object,
            _tokenService.Object,
            _config);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    // ── Initiate ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Initiate_ReturnsBadRequest_WhenDocumentBase64IsEmpty()
    {
        var request = new InitiateSigningRequest(
            "e@test.com", "Alice", "", "application/pdf");

        var result = await CreateController().Initiate(request, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("Document content is required.");
    }

    [Fact]
    public async Task Initiate_ReturnsBadRequest_WhenDocumentBase64IsInvalid()
    {
        var request = new InitiateSigningRequest(
            "e@test.com", "Alice", "!!!not-base64!!!", "application/pdf");

        var result = await CreateController().Initiate(request, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().Be("DocumentBase64 is not valid base64.");
    }

    [Fact]
    public async Task Initiate_ReturnsBadRequest_WhenContentTypeIsUnsupported()
    {
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes("hello"));
        var request = new InitiateSigningRequest(
            "e@test.com", "Alice", base64, "image/png");

        var result = await CreateController().Initiate(request, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.As<string>().Should().StartWith("Unsupported document content type.");
    }

    [Fact]
    public async Task Initiate_ReturnsCreated_WithValidRequest()
    {
        var docBytes = Encoding.UTF8.GetBytes("%PDF-1.4 fake");
        var base64 = Convert.ToBase64String(docBytes);
        var fakeToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.deadbeef";

        // ClaimId is now server-generated, so use It.IsAny<Guid>()
        _claimRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Claim?)null); // will auto-create claim

        _claimRepo.Setup(r => r.AddAsync(It.IsAny<Claim>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _claimRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _docRepo.Setup(r => r.AddAsync(It.IsAny<Document>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _docRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _tokenService.Setup(t => t.GenerateToken(It.IsAny<Guid>(), It.IsAny<Guid>(), out It.Ref<Guid>.IsAny))
            .Returns((Guid cId, Guid dId, ref Guid tGuid) =>
            {
                tGuid = Guid.NewGuid();
                return fakeToken;
            });

        _signingRequestRepo.Setup(r => r.AddAsync(It.IsAny<SigningRequest>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _signingRequestRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _outboxRepo.Setup(r => r.AddAsync(It.IsAny<OutboxQueue>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _outboxRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _auditRepo.Setup(r => r.AppendAsync(It.IsAny<AuditLog>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _auditRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var request = new InitiateSigningRequest("e@test.com", "Alice", base64, "application/pdf");

        var result = await CreateController().Initiate(request, CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var response = created.Value.Should().BeOfType<InitiateSigningResponse>().Subject;
        response.ClaimId.Should().NotBeEmpty();
        response.SigningRequestId.Should().NotBeEmpty();
        response.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    // ── GetStatus ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_ReturnsNotFound_WhenSigningRequestNotFound()
    {
        var id = Guid.NewGuid();
        _signingRequestRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SigningRequest?)null);

        var result = await CreateController().GetStatus(id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetStatus_ReturnsOk_WithCorrectStatus()
    {
        var sr = new SigningRequest
        {
            Id = Guid.NewGuid(),
            Status = SigningStatus.Signed,
            SignedAt = DateTime.UtcNow
        };
        _signingRequestRepo.Setup(r => r.GetByIdAsync(sr.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(sr);

        var result = await CreateController().GetStatus(sr.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<SigningStatusResponse>().Subject;
        response.Status.Should().Be("Signed");
        response.SignedAt.Should().NotBeNull();
    }
}
