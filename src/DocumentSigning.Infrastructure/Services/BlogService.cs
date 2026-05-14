using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Services;

public sealed class BlogService(AppDbContext db, IAgentOrchestrator orchestrator) : IBlogService
{
    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<List<BlogSummaryDto>> GetBlogsAsync(Guid merchantId, string? status = null, string? category = null)
    {
        var q = db.Blogs.Where(b => b.MerchantId == merchantId);
        if (!string.IsNullOrEmpty(status)) q = q.Where(b => b.Status == status);
        if (!string.IsNullOrEmpty(category)) q = q.Where(b => b.Category == category);
        var blogs = await q.OrderByDescending(b => b.CreatedAt).ToListAsync();
        return blogs.Select(ToSummaryDto).ToList();
    }

    public async Task<BlogDto?> GetBlogAsync(Guid id, Guid merchantId)
    {
        var b = await db.Blogs.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        return b is null ? null : ToDto(b);
    }

    public async Task<BlogDto?> GetBlogBySlugAsync(string slug, Guid merchantId)
    {
        var b = await db.Blogs.FirstOrDefaultAsync(x => x.Slug == slug && x.MerchantId == merchantId && x.Status == "published");
        return b is null ? null : ToDto(b);
    }

    public async Task<BlogDto> CreateBlogAsync(Guid merchantId, CreateBlogRequest req, string createdBy = "user")
    {
        var blog = new Blog
        {
            MerchantId      = merchantId,
            Title           = req.Title,
            Slug            = GenerateSlug(req.Title),
            Content         = req.Content,
            MetaDescription = req.MetaDescription,
            Keywords        = req.Keywords,
            Tags            = req.Tags,
            Category        = req.Category,
            CoverImageUrl   = req.CoverImageUrl,
            Status          = req.Status,
            CreatedByAgent  = createdBy,
        };
        db.Blogs.Add(blog);
        await db.SaveChangesAsync();
        return ToDto(blog);
    }

    public async Task<BlogDto> UpdateBlogAsync(Guid id, Guid merchantId, UpdateBlogRequest req)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (blog is null) throw new KeyNotFoundException($"Blog {id} not found.");

        blog.Title           = req.Title;
        blog.Content         = req.Content;
        blog.MetaDescription = req.MetaDescription ?? blog.MetaDescription;
        blog.Keywords        = req.Keywords        ?? blog.Keywords;
        blog.Tags            = req.Tags            ?? blog.Tags;
        blog.Category        = req.Category        ?? blog.Category;
        blog.CoverImageUrl   = req.CoverImageUrl   ?? blog.CoverImageUrl;
        if (!string.IsNullOrEmpty(req.Status)) blog.Status = req.Status;
        blog.UpdatedAt       = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(req.Title)) blog.Slug = GenerateSlug(req.Title);
        await db.SaveChangesAsync();
        return ToDto(blog);
    }

    public async Task<string?> DeleteBlogAsync(Guid id, Guid merchantId)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (blog is null) return null;
        var imageUrl = blog.CoverImageUrl;
        db.Blogs.Remove(blog);
        await db.SaveChangesAsync();
        return imageUrl;
    }

    // ── Publish / Unpublish ───────────────────────────────────────────────────

    public async Task<BlogDto> PublishBlogAsync(Guid id, Guid merchantId)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (blog is null) throw new KeyNotFoundException($"Blog {id} not found.");
        blog.Status      = "published";
        blog.PublishedAt = DateTime.UtcNow;
        blog.UpdatedAt   = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(blog);
    }

    public async Task<BlogDto> UnpublishBlogAsync(Guid id, Guid merchantId)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(x => x.Id == id && x.MerchantId == merchantId);
        if (blog is null) throw new KeyNotFoundException($"Blog {id} not found.");
        blog.Status    = "unpublished";
        blog.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(blog);
    }

    // ── AI Generation ─────────────────────────────────────────────────────────

    public async Task<BlogDto> GenerateBlogWithAiAsync(Guid merchantId, GenerateBlogRequest req)
    {
        // Find or create a blog agent for this merchant
        var agentDef = await db.AgentDefinitions
            .FirstOrDefaultAsync(a => a.MerchantId == merchantId && a.AgentType == "blog" && a.IsEnabled);

        if (agentDef is null)
        {
            agentDef = new AgentDefinition
            {
                MerchantId    = merchantId,
                AgentName     = "Blog Writer Agent",
                AgentType     = "blog",
                Description   = "Auto-created blog agent",
                IsEnabled     = true,
                ApprovalMode  = "approval",
                MaxRetries    = 2,
                ConfigurationJson = JsonSerializer.Serialize(new
                {
                    topic           = req.Topic,
                    keywords        = req.Keywords,
                    target_audience = req.TargetAudience,
                    tone            = req.Tone
                })
            };
            db.AgentDefinitions.Add(agentDef);
            await db.SaveChangesAsync();
        }
        else
        {
            agentDef.ConfigurationJson = JsonSerializer.Serialize(new
            {
                topic           = req.Topic,
                keywords        = req.Keywords,
                target_audience = req.TargetAudience,
                tone            = req.Tone
            });
            await db.SaveChangesAsync();
        }

        var output = await orchestrator.ExecuteAgentAsync(agentDef.Id, merchantId, "manual");

        BlogDto draftBlog;
        if (output.Success && output.OutputJson is not null)
        {
            try
            {
                using var doc = JsonDocument.Parse(output.OutputJson);
                var r = doc.RootElement;
                var title = r.TryGetProperty("title",            out var t) ? t.GetString() ?? req.Topic : req.Topic;
                var cont  = r.TryGetProperty("content",          out var c) ? c.GetString() ?? "" : output.Content ?? "";
                var meta  = r.TryGetProperty("meta_description", out var m) ? m.GetString() : null;
                var kw    = r.TryGetProperty("keywords",         out var k) ? k.GetString() : req.Keywords;
                var tags  = r.TryGetProperty("tags",             out var tg) ? tg.GetString() : null;
                var cat   = r.TryGetProperty("category",         out var ca) ? ca.GetString() : "General";
                var seo   = r.TryGetProperty("seo_score",        out var ss) ? ss.GetString() : null;

                var blog = new Blog
                {
                    MerchantId      = merchantId,
                    Title           = title,
                    Slug            = GenerateSlug(title),
                    Content         = cont,
                    MetaDescription = meta,
                    Keywords        = kw,
                    Tags            = tags,
                    Category        = cat,
                    Status          = "draft",
                    CreatedByAgent  = "blog-agent",
                    SeoScore        = seo,
                };
                db.Blogs.Add(blog);
                await db.SaveChangesAsync();
                draftBlog = ToDto(blog);
            }
            catch
            {
                draftBlog = await CreateFallbackBlogAsync(merchantId, req.Topic, output.Content ?? "");
            }
        }
        else
        {
            draftBlog = await CreateFallbackBlogAsync(merchantId, req.Topic, output.Error ?? "Generation failed");
        }

        return draftBlog;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<BlogDto> CreateFallbackBlogAsync(Guid merchantId, string topic, string content)
    {
        var blog = new Blog
        {
            MerchantId     = merchantId,
            Title          = topic,
            Slug           = GenerateSlug(topic),
            Content        = content,
            Status         = "draft",
            CreatedByAgent = "blog-agent",
        };
        db.Blogs.Add(blog);
        await db.SaveChangesAsync();
        return ToDto(blog);
    }

    private static string GenerateSlug(string title) =>
        System.Text.RegularExpressions.Regex.Replace(title.ToLowerInvariant().Trim(), @"[^a-z0-9]+", "-").Trim('-');

    private static BlogDto ToDto(Blog b) =>
        new(b.Id, b.MerchantId, b.Title, b.Slug, b.Content, b.MetaDescription,
            b.Keywords, b.Tags, b.Category, b.CoverImageUrl, b.Status,
            b.PublishedAt, b.CreatedByAgent, b.ViewCount, b.SeoScore, b.CreatedAt, b.UpdatedAt);

    private static BlogSummaryDto ToSummaryDto(Blog b) =>
        new(b.Id, b.Title, b.Slug, b.Category, b.Tags, b.CoverImageUrl,
            b.Status, b.PublishedAt, b.CreatedByAgent, b.ViewCount, b.MetaDescription, b.CreatedAt);

    // ── Public (cross-merchant, published only) ───────────────────────────────

    public async Task<List<BlogSummaryDto>> GetPublicBlogsAsync(string? category = null, int page = 1, int pageSize = 12)
    {
        var q = db.Blogs.Where(b => b.Status == "published");
        if (!string.IsNullOrEmpty(category)) q = q.Where(b => b.Category == category);
        var blogs = await q
            .OrderByDescending(b => b.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return blogs.Select(ToSummaryDto).ToList();
    }

    public async Task<BlogDto?> GetPublicBlogBySlugAsync(string slug)
    {
        var b = await db.Blogs.FirstOrDefaultAsync(x => x.Slug == slug && x.Status == "published");
        return b is null ? null : ToDto(b);
    }

    public async Task<List<BlogSummaryDto>> GetTrendingBlogsAsync(int count = 6)
    {
        var blogs = await db.Blogs
            .Where(b => b.Status == "published")
            .OrderByDescending(b => b.ViewCount)
            .ThenByDescending(b => b.PublishedAt)
            .Take(count)
            .ToListAsync();
        return blogs.Select(ToSummaryDto).ToList();
    }

    public async Task<List<BlogSummaryDto>> GetRelatedBlogsAsync(string slug, int count = 4)
    {
        var source = await db.Blogs.FirstOrDefaultAsync(b => b.Slug == slug && b.Status == "published");
        if (source is null) return [];
        var q = db.Blogs.Where(b => b.Status == "published" && b.Id != source.Id);
        if (!string.IsNullOrEmpty(source.Category))
            q = q.Where(b => b.Category == source.Category);
        var blogs = await q.OrderByDescending(b => b.PublishedAt).Take(count).ToListAsync();
        return blogs.Select(ToSummaryDto).ToList();
    }

    public async Task<List<BlogCategoryDto>> GetCategoriesAsync()
    {
        var groups = await db.Blogs
            .Where(b => b.Status == "published" && b.Category != null)
            .GroupBy(b => b.Category!)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToListAsync();
        return groups.Select(g => new BlogCategoryDto(
            g.Name,
            GenerateSlug(g.Name),
            g.Count)).ToList();
    }

    public async Task IncrementViewCountAsync(string slug)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(b => b.Slug == slug);
        if (blog is null) return;
        blog.ViewCount++;
        await db.SaveChangesAsync();
    }
}
