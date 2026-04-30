using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace DocumentSigning.Tests.Services;

public class IdentityVerificationServiceTests
{
    private readonly Mock<IIdentityVerificationRepository> _verificationRepo  = new();
    private readonly Mock<ISigningRequestRepository>       _signingRequestRepo = new();

    private IdentityVerificationService CreateService() =>
        new(_verificationRepo.Object, _signingRequestRepo.Object, NullLogger<IdentityVerificationService>.Instance);

    private static SigningRequest MakeSigningRequest(Guid id) => new()
    {
        Id         = id,
        Token      = "tok",
        ClaimId    = Guid.NewGuid(),
        DocumentId = Guid.NewGuid(),
        ExpiresAt  = DateTime.UtcNow.AddDays(7),
        CreatedAt  = DateTime.UtcNow,
    };

    // ── StartAsync — auto-approve when high confidence ─────────────────────────

    [Fact]
    public async Task StartAsync_AutoApproves_WhenHighConfidenceImage()
    {
        var srId       = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _signingRequestRepo.Setup(r => r.GetByIdAsync(srId, default))
                           .ReturnsAsync(MakeSigningRequest(srId));

        // Image large enough to push confidence above 70 threshold
        // EstimateConfidence = min(95, 50 + len/1000) → need len >= 20000
        var largeBase64 = Convert.ToBase64String(new byte[20000]);

        IdentityVerification? saved = null;
        _verificationRepo.Setup(r => r.AddAsync(It.IsAny<IdentityVerification>(), default))
                         .Callback<IdentityVerification, CancellationToken>((e, _) => saved = e)
                         .Returns(Task.CompletedTask);

        var result = await CreateService().StartAsync(srId, merchantId, "alice@test.com", "Passport", largeBase64);

        saved.Should().NotBeNull();
        saved!.Status.Should().Be("Approved");
        saved.ConfidenceScore.Should().BeGreaterThanOrEqualTo(70);
        result.Status.Should().Be("Approved");
    }

    [Fact]
    public async Task StartAsync_SetsPendingStatus_WhenLowConfidenceImage()
    {
        var srId       = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _signingRequestRepo.Setup(r => r.GetByIdAsync(srId, default))
                           .ReturnsAsync(MakeSigningRequest(srId));

        // Short base64 → confidence = 50 + small/1000 < 70
        var shortBase64 = Convert.ToBase64String(new byte[100]);

        IdentityVerification? saved = null;
        _verificationRepo.Setup(r => r.AddAsync(It.IsAny<IdentityVerification>(), default))
                         .Callback<IdentityVerification, CancellationToken>((e, _) => saved = e)
                         .Returns(Task.CompletedTask);

        var result = await CreateService().StartAsync(srId, merchantId, "bob@test.com", "License", shortBase64);

        saved!.Status.Should().Be("Pending");
        saved.ConfidenceScore.Should().BeLessThan(70);
        result.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task StartAsync_ThrowsInvalidOperationException_WhenSigningRequestNotFound()
    {
        var srId = Guid.NewGuid();
        _signingRequestRepo.Setup(r => r.GetByIdAsync(srId, default))
                           .ReturnsAsync((SigningRequest?)null);

        var act = () => CreateService().StartAsync(srId, Guid.NewGuid(), "x@x.com", "Passport", "abc");

        await act.Should().ThrowAsync<InvalidOperationException>()
                 .WithMessage($"*{srId}*");
    }

    [Fact]
    public async Task StartAsync_NormalisesEmailToLowercase()
    {
        var srId = Guid.NewGuid();
        _signingRequestRepo.Setup(r => r.GetByIdAsync(srId, default))
                           .ReturnsAsync(MakeSigningRequest(srId));

        IdentityVerification? saved = null;
        _verificationRepo.Setup(r => r.AddAsync(It.IsAny<IdentityVerification>(), default))
                         .Callback<IdentityVerification, CancellationToken>((e, _) => saved = e)
                         .Returns(Task.CompletedTask);

        await CreateService().StartAsync(srId, Guid.NewGuid(), "Alice@Test.COM", "Passport", "abc");

        saved!.SignerEmail.Should().Be("alice@test.com");
    }

    // ── ReviewAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task ReviewAsync_ApprovesVerification()
    {
        var verificationId = Guid.NewGuid();
        var entity = new IdentityVerification { Id = verificationId, Status = "Pending" };
        _verificationRepo.Setup(r => r.GetByIdAsync(verificationId, default)).ReturnsAsync(entity);

        await CreateService().ReviewAsync(verificationId, approved: true, rejectionReason: null);

        entity.Status.Should().Be("Approved");
        entity.RejectionReason.Should().BeNull();
        entity.ReviewedAt.Should().NotBeNull();
        _verificationRepo.Verify(r => r.UpdateAsync(entity, default), Times.Once);
        _verificationRepo.Verify(r => r.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task ReviewAsync_RejectsVerification_WithReason()
    {
        var verificationId = Guid.NewGuid();
        var entity = new IdentityVerification { Id = verificationId, Status = "Pending" };
        _verificationRepo.Setup(r => r.GetByIdAsync(verificationId, default)).ReturnsAsync(entity);

        await CreateService().ReviewAsync(verificationId, approved: false, rejectionReason: "Document expired");

        entity.Status.Should().Be("Rejected");
        entity.RejectionReason.Should().Be("Document expired");
    }

    [Fact]
    public async Task ReviewAsync_ThrowsInvalidOperationException_WhenNotFound()
    {
        var id = Guid.NewGuid();
        _verificationRepo.Setup(r => r.GetByIdAsync(id, default))
                         .ReturnsAsync((IdentityVerification?)null);

        var act = () => CreateService().ReviewAsync(id, true, null);

        await act.Should().ThrowAsync<InvalidOperationException>()
                 .WithMessage($"*{id}*");
    }
}
