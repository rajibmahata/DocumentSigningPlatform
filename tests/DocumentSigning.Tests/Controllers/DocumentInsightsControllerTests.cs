using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class DocumentInsightsControllerTests
{
    private readonly Mock<IAiInsightService>  _aiInsight = new();
    private readonly Mock<IOcrService>        _ocr       = new();
    private readonly Mock<IFeatureFlagService> _features  = new();

    private DocumentInsightsController CreateController()
    {
        var ctrl = new DocumentInsightsController(_aiInsight.Object, _ocr.Object, _features.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return ctrl;
    }

    // ── GetSummary ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSummary_Returns200_WhenInsightExists()
    {
        var documentId = Guid.NewGuid();
        var dto = new DocumentInsightDto(Guid.NewGuid(), documentId, "Summary text", new[] { "Risk 1" }, "Done", DateTime.UtcNow, DateTime.UtcNow);
        _aiInsight.Setup(s => s.GetInsightAsync(documentId, default)).ReturnsAsync(dto);

        var result = await CreateController().GetSummary(documentId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(dto);
    }

    [Fact]
    public async Task GetSummary_Returns404_WhenNoInsight()
    {
        var documentId = Guid.NewGuid();
        _aiInsight.Setup(s => s.GetInsightAsync(documentId, default)).ReturnsAsync((DocumentInsightDto?)null);

        var result = await CreateController().GetSummary(documentId, default);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── Analyze ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Analyze_Returns202_WhenFeatureEnabled()
    {
        var documentId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "ai.summary", default)).ReturnsAsync(true);
        _aiInsight.Setup(s => s.EnqueueSummaryAsync(documentId, merchantId, default)).Returns(Task.CompletedTask);

        var result = await CreateController().Analyze(documentId, merchantId, default);

        result.Should().BeOfType<AcceptedResult>();
        _aiInsight.Verify(s => s.EnqueueSummaryAsync(documentId, merchantId, default), Times.Once);
    }

    [Fact]
    public async Task Analyze_Returns402_WhenFeatureDisabled()
    {
        var documentId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "ai.summary", default)).ReturnsAsync(false);

        var result = await CreateController().Analyze(documentId, merchantId, default);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(402);
        _aiInsight.Verify(s => s.EnqueueSummaryAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), default), Times.Never);
    }

    // ── GetFields ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetFields_Returns200_WithFieldList()
    {
        var documentId = Guid.NewGuid();
        var fields = new List<DocumentFieldDto>
        {
            new(Guid.NewGuid(), documentId, "Signature", 1, 0.1f, 0.9f, 0.2f, 0.05f, 0.92f),
        };
        _ocr.Setup(s => s.GetFieldsAsync(documentId, default)).ReturnsAsync(fields);

        var result = await CreateController().GetFields(documentId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(fields);
    }

    // ── TriggerOcr ────────────────────────────────────────────────────────────

    [Fact]
    public async Task TriggerOcr_Returns202_WhenFeatureEnabled()
    {
        var documentId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "ocr.auto_fields", default)).ReturnsAsync(true);
        _ocr.Setup(s => s.EnqueueFieldDetectionAsync(documentId, default)).Returns(Task.CompletedTask);

        var result = await CreateController().TriggerOcr(documentId, merchantId, default);

        result.Should().BeOfType<AcceptedResult>();
    }

    [Fact]
    public async Task TriggerOcr_Returns402_WhenFeatureDisabled()
    {
        var documentId = Guid.NewGuid();
        var merchantId = Guid.NewGuid();
        _features.Setup(f => f.IsEnabledAsync(merchantId, "ocr.auto_fields", default)).ReturnsAsync(false);

        var result = await CreateController().TriggerOcr(documentId, merchantId, default);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(402);
    }
}
