using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class BulkSendControllerTests
{
    private readonly Mock<IBulkSendService> _svc = new();

    private BulkSendController CreateController()
    {
        var ctrl = new BulkSendController(_svc.Object);
        ctrl.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return ctrl;
    }

    private static BulkSendRequest ValidRequest(Guid merchantId) => new(
        MerchantId:                 merchantId,
        EnvelopeTitleTemplate:      "Agreement for {{Name}}",
        TemplateDocumentBase64:     Convert.ToBase64String(new byte[] { 1, 2, 3 }),
        TemplateDocumentFileName:   "template.pdf",
        TemplateDocumentContentType: "application/pdf",
        SignerRole:                 "signer",
        SignerMessage:              "Please sign",
        CsvContent:                 "Name,Email\nAlice,alice@test.com\nBob,bob@test.com");

    // ── StartBatch ────────────────────────────────────────────────────────────

    [Fact]
    public async Task StartBatch_Returns202_WithBatchResult()
    {
        var merchantId = Guid.NewGuid();
        var request    = ValidRequest(merchantId);
        var batchId    = Guid.NewGuid();
        var returned   = new BulkSendBatchResult(batchId, 2, 2, 0, new List<BulkSendRowError>());
        _svc.Setup(s => s.EnqueueBatchAsync(merchantId, request, default)).ReturnsAsync(returned);

        var result = await CreateController().StartBatch(request, default);

        var accepted = result.Should().BeOfType<AcceptedResult>().Subject;
        accepted.Value.Should().Be(returned);
    }

    [Fact]
    public async Task StartBatch_Returns400_WhenRequestIsNull()
    {
        var result = await CreateController().StartBatch(null!, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task StartBatch_Returns400_WhenCsvContentIsEmpty()
    {
        var request = ValidRequest(Guid.NewGuid()) with { CsvContent = "" };

        var result = await CreateController().StartBatch(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task StartBatch_Returns400_WhenTemplateDocumentBase64IsEmpty()
    {
        var request = ValidRequest(Guid.NewGuid()) with { TemplateDocumentBase64 = "" };

        var result = await CreateController().StartBatch(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task StartBatch_Returns400_WhenEnvelopeTitleTemplateIsEmpty()
    {
        var request = ValidRequest(Guid.NewGuid()) with { EnvelopeTitleTemplate = "" };

        var result = await CreateController().StartBatch(request, default);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ── GetStatus ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_Returns200_WhenBatchExists()
    {
        var batchId = Guid.NewGuid();
        var status  = new BulkSendBatchStatus(batchId, 5, 1, 2, 2, 0);
        _svc.Setup(s => s.GetBatchStatusAsync(batchId, default)).ReturnsAsync(status);

        var result = await CreateController().GetStatus(batchId, default);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().Be(status);
    }

    [Fact]
    public async Task GetStatus_Returns404_WhenBatchNotFound()
    {
        var batchId = Guid.NewGuid();
        _svc.Setup(s => s.GetBatchStatusAsync(batchId, default))
            .ReturnsAsync(new BulkSendBatchStatus(batchId, 0, 0, 0, 0, 0));

        var result = await CreateController().GetStatus(batchId, default);

        result.Should().BeOfType<NotFoundResult>();
    }
}
