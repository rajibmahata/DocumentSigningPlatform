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

    private MerchantController CreateController()
    {
        var controller = new MerchantController(_merchantRepo.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        return controller;
    }

    // ── Create ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidRequest_Returns201WithApiKey()
    {
        _merchantRepo.Setup(r => r.AddAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();
        var result = await controller.Create(
            new CreateMerchantRequest("Acme Corp", "acme@test.com", 100),
            CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var response = created.Value.Should().BeOfType<MerchantResponse>().Subject;
        response.Name.Should().Be("Acme Corp");
        response.Email.Should().Be("acme@test.com");
        response.RequestLimit.Should().Be(100);
        response.ApiKey.Should().StartWith("msk_");
    }

    [Fact]
    public async Task Create_ZeroRequestLimit_IsUnlimited()
    {
        _merchantRepo.Setup(r => r.AddAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);
        _merchantRepo.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        var controller = CreateController();
        var result = await controller.Create(
            new CreateMerchantRequest("Free Corp", "free@test.com", 0),
            CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var response = created.Value.Should().BeOfType<MerchantResponse>().Subject;
        response.RequestLimit.Should().Be(0);
    }

    // ── GetAll ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsList()
    {
        var merchants = new List<Merchant>
        {
            new() { Id = Guid.NewGuid(), Name = "A", Email = "a@t.com", ApiKey = "msk_aaa",
                    RequestLimit = 10, RequestUsed = 2, CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "B", Email = "b@t.com", ApiKey = "msk_bbb",
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

    // ── GetById ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Exists_Returns200()
    {
        var id = Guid.NewGuid();
        _merchantRepo.Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new Merchant { Id = id, Name = "X", Email = "x@t.com",
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
        var merchant = new Merchant { Id = id, Name = "Old", Email = "old@t.com",
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
            new UpdateMerchantRequest("New Name", "new@t.com", true, 50, null),
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        merchant.Name.Should().Be("New Name");
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
            new UpdateMerchantRequest("X", "x@t.com", true, 0, null),
            CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ── RegenerateKey ────────────────────────────────────────────────────────

    [Fact]
    public async Task RegenerateKey_Regenerates()
    {
        var id = Guid.NewGuid();
        var merchant = new Merchant { Id = id, Name = "M", Email = "m@t.com",
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
