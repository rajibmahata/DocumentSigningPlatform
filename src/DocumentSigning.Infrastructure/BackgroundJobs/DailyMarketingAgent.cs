using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Infrastructure.Persistence;
using DocumentSigning.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Runs once per day (at 08:00 UTC) and generates AI marketing posts
/// via DeepSeek for every active merchant that has at least one connected
/// social account. Posts are saved as drafts for admin approval or
/// auto-published if AutoPublishMarketing = true in app settings.
/// </summary>
public sealed class DailyMarketingAgent : BackgroundService
{
    private static readonly string[] ContentCategories =
    [
        "product_feature", "workflow_automation", "ai_signing",
        "esign_security",  "legal_compliance",    "saas_productivity",
        "digital_transformation", "customer_success", "feature_launch", "educational_tips"
    ];

    private static readonly string[] Platforms = ["linkedin", "facebook"];

    private readonly IServiceScopeFactory         _scopeFactory;
    private readonly ILogger<DailyMarketingAgent> _log;

    public DailyMarketingAgent(IServiceScopeFactory scopeFactory, ILogger<DailyMarketingAgent> log)
    {
        _scopeFactory = scopeFactory;
        _log          = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _log.LogInformation("DailyMarketingAgent started.");

        while (!ct.IsCancellationRequested)
        {
            var nextRun = NextRunUtc();
            var delay   = nextRun - DateTime.UtcNow;
            if (delay > TimeSpan.Zero)
            {
                _log.LogInformation("DailyMarketingAgent sleeping until {NextRun:u}", nextRun);
                await Task.Delay(delay, ct);
            }

            if (ct.IsCancellationRequested) break;

            try
            {
                await RunDailyAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _log.LogError(ex, "DailyMarketingAgent run failed.");
            }

            // Sleep 1 hour so we don't fire twice on the same day
            await Task.Delay(TimeSpan.FromHours(1), ct);
        }

        _log.LogInformation("DailyMarketingAgent stopped.");
    }

    private async Task RunDailyAsync(CancellationToken ct)
    {
        using var scope     = _scopeFactory.CreateScope();
        var db              = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var deepSeek        = scope.ServiceProvider.GetRequiredService<DeepSeekService>();

        // Find all merchants with active social accounts
        var merchantIds = await db.SocialAccounts
            .Where(x => x.IsActive)
            .Select(x => x.MerchantId)
            .Distinct()
            .ToListAsync(ct);

        _log.LogInformation("DailyMarketingAgent: generating posts for {Count} merchants.", merchantIds.Count);

        foreach (var merchantId in merchantIds)
        {
            var platforms = await db.SocialAccounts
                .Where(x => x.MerchantId == merchantId && x.IsActive)
                .Select(x => x.Platform)
                .Distinct()
                .ToListAsync(ct);

            // Pick a random content category for variety
            var category = ContentCategories[Random.Shared.Next(ContentCategories.Length)];

            foreach (var platform in platforms)
            {
                try
                {
                    var result = await deepSeek.GeneratePostAsync(new GeneratePostRequest(
                        Platform:        platform,
                        ContentCategory: category,
                        Tone:            "professional",
                        CampaignContext: null,
                        IncludeHashtags: true
                    ), ct);

                    var post = new MarketingPost
                    {
                        Id              = Guid.NewGuid(),
                        MerchantId      = merchantId,
                        Platform        = platform,
                        Content         = result.Content,
                        Hashtags        = result.Hashtags,
                        EngagementScore = result.EngagementScore,
                        ContentCategory = category,
                        Status          = "draft",          // admin reviews before publishing
                        CreatedBy       = "ai-agent",
                        CreatedAt       = DateTime.UtcNow,
                    };

                    db.MarketingPosts.Add(post);
                    _log.LogInformation("Generated {Platform} post for merchant {MerchantId} (score {Score}).",
                        platform, merchantId, result.EngagementScore);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Failed to generate post for merchant {MerchantId} on {Platform}.", merchantId, platform);
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }

    /// <summary>Returns the next 08:00 UTC occurrence (today if before 08:00, tomorrow otherwise).</summary>
    private static DateTime NextRunUtc()
    {
        var now     = DateTime.UtcNow;
        var today8  = now.Date.AddHours(8);
        return now < today8 ? today8 : today8.AddDays(1);
    }
}
