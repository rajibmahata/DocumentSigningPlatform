using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

public sealed class MarketingService : IMarketingService
{
    private readonly AppDbContext              _db;
    private readonly ILogger<MarketingService> _log;

    public MarketingService(AppDbContext db, ILogger<MarketingService> log)
    {
        _db  = db;
        _log = log;
    }

    // ── Social Accounts ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<SocialAccountDto>> GetSocialAccountsAsync(Guid merchantId, CancellationToken ct = default)
    {
        var rows = await _db.SocialAccounts
            .Where(x => x.MerchantId == merchantId)
            .OrderBy(x => x.Platform)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<SocialAccountDto> ConnectSocialAccountAsync(Guid merchantId, ConnectSocialRequest req, CancellationToken ct = default)
    {
        // Upsert by merchant+platform
        var existing = await _db.SocialAccounts
            .FirstOrDefaultAsync(x => x.MerchantId == merchantId && x.Platform == req.Platform, ct);

        if (existing is null)
        {
            existing = new SocialAccount { Id = Guid.NewGuid(), MerchantId = merchantId };
            _db.SocialAccounts.Add(existing);
        }

        existing.Platform     = req.Platform;
        existing.AccountName  = req.AccountName;
        existing.PageId       = req.PageId;
        existing.AccessToken  = req.AccessToken;
        existing.RefreshToken = req.RefreshToken;
        existing.TokenExpiry  = req.TokenExpiry;
        existing.IsActive     = true;

        await _db.SaveChangesAsync(ct);
        return ToDto(existing);
    }

    public async Task DisconnectSocialAccountAsync(Guid accountId, Guid merchantId, CancellationToken ct = default)
    {
        var row = await _db.SocialAccounts
            .FirstOrDefaultAsync(x => x.Id == accountId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Social account not found.");
        _db.SocialAccounts.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MarketingPostDto>> GetPostsAsync(
        Guid merchantId, string? status = null, string? platform = null, CancellationToken ct = default)
    {
        var q = _db.MarketingPosts.Where(x => x.MerchantId == merchantId);
        if (status   is not null) q = q.Where(x => x.Status   == status);
        if (platform is not null) q = q.Where(x => x.Platform == platform);
        var rows = await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<MarketingPostDto> CreatePostAsync(Guid merchantId, string createdBy, CreatePostRequest req, CancellationToken ct = default)
    {
        var post = new MarketingPost
        {
            Id              = Guid.NewGuid(),
            MerchantId      = merchantId,
            Platform        = req.Platform,
            Content         = req.Content,
            ContentCategory = req.ContentCategory,
            Hashtags        = req.Hashtags,
            ImageUrl        = req.ImageUrl,
            CampaignId      = req.CampaignId,
            ScheduledAt     = req.ScheduledAt,
            Status          = req.ScheduledAt.HasValue ? "scheduled" : "draft",
            CreatedBy       = createdBy,
            CreatedAt       = DateTime.UtcNow,
        };
        _db.MarketingPosts.Add(post);
        await _db.SaveChangesAsync(ct);
        return ToDto(post);
    }

    public async Task<MarketingPostDto> UpdatePostStatusAsync(Guid postId, Guid merchantId, string status, CancellationToken ct = default)
    {
        var post = await _db.MarketingPosts
            .FirstOrDefaultAsync(x => x.Id == postId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Post not found.");
        post.Status      = status;
        if (status == "published") post.PublishedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDto(post);
    }

    public async Task DeletePostAsync(Guid postId, Guid merchantId, CancellationToken ct = default)
    {
        var post = await _db.MarketingPosts
            .FirstOrDefaultAsync(x => x.Id == postId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Post not found.");
        _db.MarketingPosts.Remove(post);
        await _db.SaveChangesAsync(ct);
    }

    // ── Campaigns ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<MarketingCampaignDto>> GetCampaignsAsync(Guid merchantId, CancellationToken ct = default)
    {
        var rows = await _db.MarketingCampaigns
            .Where(x => x.MerchantId == merchantId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<MarketingCampaignDto> CreateCampaignAsync(Guid merchantId, CreateCampaignRequest req, CancellationToken ct = default)
    {
        var campaign = new MarketingCampaign
        {
            Id           = Guid.NewGuid(),
            MerchantId   = merchantId,
            Name         = req.Name,
            Description  = req.Description,
            CampaignType = req.CampaignType,
            Status       = "draft",
            CreatedAt    = DateTime.UtcNow,
        };
        _db.MarketingCampaigns.Add(campaign);
        await _db.SaveChangesAsync(ct);
        return ToDto(campaign);
    }

    public async Task<MarketingCampaignDto> UpdateCampaignStatusAsync(Guid campaignId, Guid merchantId, string status, CancellationToken ct = default)
    {
        var c = await _db.MarketingCampaigns
            .FirstOrDefaultAsync(x => x.Id == campaignId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Campaign not found.");
        c.Status    = status;
        if (status == "active"    && c.StartedAt is null) c.StartedAt = DateTime.UtcNow;
        if (status == "completed")                         c.EndedAt   = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDto(c);
    }

    // ── Engagement ────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<EngagementActivityDto>> GetEngagementsAsync(
        Guid merchantId, string? status = null, CancellationToken ct = default)
    {
        var q = _db.EngagementActivities.Where(x => x.MerchantId == merchantId);
        if (status is not null) q = q.Where(x => x.Status == status);
        var rows = await q.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<EngagementActivityDto> ReplyAsync(Guid activityId, Guid merchantId, string response, CancellationToken ct = default)
    {
        var act = await _db.EngagementActivities
            .FirstOrDefaultAsync(x => x.Id == activityId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Engagement activity not found.");
        act.Response = response;
        act.Status   = "replied";
        await _db.SaveChangesAsync(ct);
        return ToDto(act);
    }

    public async Task<EngagementActivityDto> UpdateEngagementStatusAsync(Guid activityId, Guid merchantId, string status, CancellationToken ct = default)
    {
        var act = await _db.EngagementActivities
            .FirstOrDefaultAsync(x => x.Id == activityId && x.MerchantId == merchantId, ct)
            ?? throw new KeyNotFoundException("Engagement activity not found.");
        act.Status = status;
        await _db.SaveChangesAsync(ct);
        return ToDto(act);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    public async Task<MarketingAnalyticsDto> GetAnalyticsAsync(Guid merchantId, CancellationToken ct = default)
    {
        var posts       = await _db.MarketingPosts.Where(x => x.MerchantId == merchantId).ToListAsync(ct);
        var engagements = await _db.EngagementActivities.Where(x => x.MerchantId == merchantId).ToListAsync(ct);
        var campaigns   = await _db.MarketingCampaigns.Where(x => x.MerchantId == merchantId).ToListAsync(ct);

        var platformStats = posts
            .GroupBy(x => x.Platform)
            .Select(g => new PlatformStatDto(
                g.Key,
                g.Count(),
                engagements.Count(e => e.Platform == g.Key)))
            .ToList();

        var topPosts = posts
            .Where(x => x.Status == "published")
            .OrderByDescending(x => x.EngagementScore)
            .Take(5)
            .Select(ToDto)
            .ToList();

        return new MarketingAnalyticsDto
        {
            TotalPosts          = posts.Count,
            PublishedPosts      = posts.Count(x => x.Status == "published"),
            ScheduledPosts      = posts.Count(x => x.Status == "scheduled"),
            DraftPosts          = posts.Count(x => x.Status == "draft"),
            TotalEngagements    = engagements.Count,
            PendingReplies      = engagements.Count(x => x.Status == "new"),
            ActiveCampaigns     = campaigns.Count(x => x.Status == "active"),
            AvgEngagementScore  = posts.Count > 0 ? Math.Round(posts.Average(x => (double)x.EngagementScore), 1) : 0,
            PlatformStats       = platformStats,
            TopPosts            = topPosts,
        };
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private static SocialAccountDto ToDto(SocialAccount x) => new()
    {
        Id          = x.Id,
        Platform    = x.Platform,
        AccountName = x.AccountName,
        PageId      = x.PageId,
        IsActive    = x.IsActive,
        TokenExpiry = x.TokenExpiry,
        CreatedAt   = x.CreatedAt,
    };

    private static MarketingPostDto ToDto(MarketingPost x) => new()
    {
        Id              = x.Id,
        Platform        = x.Platform,
        Content         = x.Content,
        ImageUrl        = x.ImageUrl,
        Status          = x.Status,
        ScheduledAt     = x.ScheduledAt,
        PublishedAt     = x.PublishedAt,
        EngagementScore = x.EngagementScore,
        ContentCategory = x.ContentCategory,
        Hashtags        = x.Hashtags,
        CampaignId      = x.CampaignId,
        CreatedBy       = x.CreatedBy,
        CreatedAt       = x.CreatedAt,
    };

    private static MarketingCampaignDto ToDto(MarketingCampaign x) => new()
    {
        Id           = x.Id,
        Name         = x.Name,
        Description  = x.Description,
        CampaignType = x.CampaignType,
        Status       = x.Status,
        StartedAt    = x.StartedAt,
        EndedAt      = x.EndedAt,
        CreatedAt    = x.CreatedAt,
    };

    private static EngagementActivityDto ToDto(EngagementActivity x) => new()
    {
        Id           = x.Id,
        Platform     = x.Platform,
        ActivityType = x.ActivityType,
        UserName     = x.UserName,
        Message      = x.Message,
        Response     = x.Response,
        Status       = x.Status,
        PostId       = x.PostId,
        CreatedAt    = x.CreatedAt,
    };
}
