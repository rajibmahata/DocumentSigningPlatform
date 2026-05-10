using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

[ApiController]
[Produces("application/json")]
public class BlogController : ControllerBase
{
    private readonly IBlogService        _svc;
    private readonly IMerchantRepository _merchantRepo;

    public BlogController(IBlogService svc, IMerchantRepository merchantRepo)
    {
        _svc          = svc;
        _merchantRepo = merchantRepo;
    }

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("No user identity claim."));

    private async Task<Guid> GetMerchantIdAsync(CancellationToken ct = default)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(UserId, ct);
        return merchants.FirstOrDefault()?.Id
            ?? throw new UnauthorizedAccessException("No merchant account found for this user.");
    }

    // ── Admin (authenticated) routes ──────────────────────────────────────────

    [HttpGet("api/blogs")]
    [Authorize]
    public async Task<IActionResult> GetBlogs([FromQuery] string? status, [FromQuery] string? category, CancellationToken ct)
        => Ok(await _svc.GetBlogsAsync(await GetMerchantIdAsync(ct), status, category));

    [HttpPost("api/blogs")]
    [Authorize]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogRequest req, CancellationToken ct)
    {
        var blog = await _svc.CreateBlogAsync(await GetMerchantIdAsync(ct), req, "user");
        return CreatedAtAction(nameof(GetBlog), new { id = blog.Id }, blog);
    }

    [HttpGet("api/blogs/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetBlog(Guid id, CancellationToken ct)
    {
        var blog = await _svc.GetBlogAsync(id, await GetMerchantIdAsync(ct));
        return blog is null ? NotFound() : Ok(blog);
    }

    [HttpPut("api/blogs/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateBlog(Guid id, [FromBody] UpdateBlogRequest req, CancellationToken ct)
    {
        var blog = await _svc.UpdateBlogAsync(id, await GetMerchantIdAsync(ct), req);
        return Ok(blog);
    }

    [HttpDelete("api/blogs/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteBlog(Guid id, CancellationToken ct)
    {
        await _svc.DeleteBlogAsync(id, await GetMerchantIdAsync(ct));
        return NoContent();
    }

    [HttpPost("api/blogs/{id:guid}/publish")]
    [Authorize]
    public async Task<IActionResult> PublishBlog(Guid id, CancellationToken ct)
        => Ok(await _svc.PublishBlogAsync(id, await GetMerchantIdAsync(ct)));

    [HttpPost("api/blogs/{id:guid}/unpublish")]
    [Authorize]
    public async Task<IActionResult> UnpublishBlog(Guid id, CancellationToken ct)
        => Ok(await _svc.UnpublishBlogAsync(id, await GetMerchantIdAsync(ct)));

    [HttpPost("api/blogs/generate")]
    [Authorize]
    public async Task<IActionResult> GenerateBlog([FromBody] GenerateBlogRequest req, CancellationToken ct)
        => Ok(await _svc.GenerateBlogWithAiAsync(await GetMerchantIdAsync(ct), req));

    // ── Public routes ─────────────────────────────────────────────────────────

    [HttpGet("api/public/blogs")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicBlogs(
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
        => Ok(await _svc.GetPublicBlogsAsync(category, page, pageSize));

    [HttpGet("api/public/blogs/trending")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTrendingBlogs([FromQuery] int count = 6, CancellationToken ct = default)
        => Ok(await _svc.GetTrendingBlogsAsync(count));

    [HttpGet("api/public/blogs/categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories(CancellationToken ct = default)
        => Ok(await _svc.GetCategoriesAsync());

    [HttpGet("api/public/blogs/{slug}/related")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRelatedBlogs(string slug, [FromQuery] int count = 4, CancellationToken ct = default)
        => Ok(await _svc.GetRelatedBlogsAsync(slug, count));

    [HttpPost("api/public/blogs/{slug}/view")]
    [AllowAnonymous]
    public async Task<IActionResult> TrackView(string slug, CancellationToken ct = default)
    {
        await _svc.IncrementViewCountAsync(slug);
        return Ok();
    }

    [HttpGet("api/public/blogs/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicBlogBySlug(string slug, CancellationToken ct = default)
    {
        var blog = await _svc.GetPublicBlogBySlugAsync(slug);
        return blog is null ? NotFound() : Ok(blog);
    }
}
