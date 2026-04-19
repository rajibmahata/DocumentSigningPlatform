using DocumentSigning.Api.Controllers;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace DocumentSigning.Tests.Controllers;

public class MerchantControllerTests
{
    private readonly Mock<IMerchantRepository> _merchantRepo = new();
    private readonly Mock<IAuditService>       _audit        = new();

    private MerchantController CreateController()
    {
        var controller = new MerchantController(_merchantRepo.Object, _audit.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidRequest_Returns201WithMerchantResponse()
    {
        _merchantRepo.Setup(r => r.AddAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();
        var result = await controller.Create(
            new CreateMerchantRequest(Guid.NewGuid(), "Second Workspace", "For invoices", 200),
            CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        var response = created.Value.Should().BeOfType<MerchantResponse>().Subject;
        response.Name.Should().Be("Second Workspace");
        response.Description.Should().Be("For invoices");
        response.RequestLimit.Should().Be(200);
        response.ApiKey.Should().StartWith("msk_");
    }

    [Fact]
    public async Task Create_EmptyName_Returns400()
    {
        var controller = CreateController();
        var result = await controller.Create(
            new CreateMerchantRequest(Guid.NewGuid(), "   ", null, 100),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_NegativeRequestLimit_Returns400()
    {
        var controller = CreateController();
        var result = await controller.Create(
            new CreateMerchantRequest(Guid.NewGuid(), "My Workspace", null, -1),
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_SameUser_CanCreateMultipleMerchants()
    {
        var userId = Guid.NewGuid();
        _merchantRepo.Setup(r => r.AddAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();

        var result1 = await controller.Create(
            new CreateMerchantRequest(userId, "Workspace A", null, 100), CancellationToken.None);
        var result2 = await controller.Create(
            new CreateMerchantRequest(userId, "Workspace B", null, 50), CancellationToken.None);

        result1.Should().BeOfType<CreatedAtActionResult>();
        result2.Should().BeOfType<CreatedAtActionResult>();

        _merchantRepo.Verify(r => r.AddAsync(
            It.Is<Merchant>(m => m.UserId == userId),
            It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    // ── GetAll ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsList()
    {
        var userId = Guid.NewGuid();
        var merchants = new List<Merchant>
        {
            new() { Id = Guid.NewGuid(), UserId = userId, Name = "A", ApiKey = "msk_aaa",
                    RequestLimit = 10, RequestUsed = 2, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), UserId = userId, Name = "B", ApiKey = "msk_bbb",
                    RequestLimit = 0, RequestUsed = 0, CreatedAt = DateTime.UtcNow }
        };
        _merchantRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
                     .ReturnsAsync(merchants.AsReadOnly());

        var controller = CreateController();
        var result = await controller.GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IEnumerable<MerchantResponse>>()
          .Which.Should().HaveCount(2);
    }

    // ── GetByUser ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByUser_ReturnsMerchantsForUser()
    {
        var userId = Guid.NewGuid();
        var merchants = new List<Merchant>
        {
            new() { Id = Guid.NewGuid(), UserId = userId, Name = "Workspace 1",
                    ApiKey = "msk_aaa", CreatedAt = DateTime.UtcNow }
        };
        _merchantRepo.Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(merchants.AsReadOnly());

        var controller = CreateController();
        var result = await controller.GetByUser(userId, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IEnumerable<MerchantResponse>>()
          .Which.Should().HaveCount(1);
    }

    // ── GetById ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Exists_Returns200()
    {
        var id = Guid.NewGuid();
        _merchantRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new Merchant { Id = id, UserId = Guid.NewGuid(), Name = "X",
                                                  ApiKey = "msk_xxx", CreatedAt = DateTime.UtcNow });

        var controller = CreateController();
        var result = await controller.GetById(id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        _merchantRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Merchant?)null);

        var controller = CreateController();
        var result = await controller.GetById(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_Exists_Updates()
    {
        var id = Guid.NewGuid();
        var merchant = new Merchant { Id = id, UserId = Guid.NewGuid(), Name = "Old",
                                      ApiKey = "msk_old", CreatedAt = DateTime.UtcNow };
        _merchantRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(merchant);
        _merchantRepo.Setup(r => r.UpdateAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();
        var result = await controller.Update(
            id,
            new UpdateMerchantRequest("New Name", "Updated description", true, 50, null),
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        merchant.Name.Should().Be("New Name");
        merchant.Description.Should().Be("Updated description");
        merchant.RequestLimit.Should().Be(50);
    }

    [Fact]
    public async Task Update_NotFound_Returns404()
    {
        _merchantRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Merchant?)null);

        var controller = CreateController();
        var result = await controller.Update(
            Guid.NewGuid(),
            new UpdateMerchantRequest("X", null, true, 0, null),
            CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── RegenerateKey ────────────────────────────────────────────────────────

    [Fact]
    public async Task RegenerateKey_Regenerates()
    {
        var id = Guid.NewGuid();
        var merchant = new Merchant { Id = id, UserId = Guid.NewGuid(), Name = "M",
                                      ApiKey = "msk_old", CreatedAt = DateTime.UtcNow };
        _merchantRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(merchant);
        _merchantRepo.Setup(r => r.UpdateAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();
        var result = await controller.RegenerateKey(id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<MerchantResponse>().Subject;
        response.ApiKey.Should().StartWith("msk_");
        response.ApiKey.Should().NotBe("msk_old");
    }
}
