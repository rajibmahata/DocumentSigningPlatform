using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IMarketingService
{
    // Social accounts
    Task<IReadOnlyList<SocialAccountDto>> GetSocialAccountsAsync(Guid merchantId, CancellationToken ct = default);
    Task<SocialAccountDto>                ConnectSocialAccountAsync(Guid merchantId, ConnectSocialRequest req, CancellationToken ct = default);
    Task                                  DisconnectSocialAccountAsync(Guid accountId, Guid merchantId, CancellationToken ct = default);

    // Posts
    Task<IReadOnlyList<MarketingPostDto>> GetPostsAsync(Guid merchantId, string? status = null, string? platform = null, CancellationToken ct = default);
    Task<MarketingPostDto>                CreatePostAsync(Guid merchantId, string createdBy, CreatePostRequest req, CancellationToken ct = default);
    Task<MarketingPostDto>                UpdatePostStatusAsync(Guid postId, Guid merchantId, string status, CancellationToken ct = default);
    Task                                  DeletePostAsync(Guid postId, Guid merchantId, CancellationToken ct = default);

    // Campaigns
    Task<IReadOnlyList<MarketingCampaignDto>> GetCampaignsAsync(Guid merchantId, CancellationToken ct = default);
    Task<MarketingCampaignDto>                CreateCampaignAsync(Guid merchantId, CreateCampaignRequest req, CancellationToken ct = default);
    Task<MarketingCampaignDto>                UpdateCampaignStatusAsync(Guid campaignId, Guid merchantId, string status, CancellationToken ct = default);

    // Engagement
    Task<IReadOnlyList<EngagementActivityDto>> GetEngagementsAsync(Guid merchantId, string? status = null, CancellationToken ct = default);
    Task<EngagementActivityDto>                ReplyAsync(Guid activityId, Guid merchantId, string response, CancellationToken ct = default);
    Task<EngagementActivityDto>                UpdateEngagementStatusAsync(Guid activityId, Guid merchantId, string status, CancellationToken ct = default);

    // Analytics
    Task<MarketingAnalyticsDto>               GetAnalyticsAsync(Guid merchantId, CancellationToken ct = default);
}

public interface IDeepSeekService
{
    Task<GeneratePostResult> GeneratePostAsync(GeneratePostRequest req, CancellationToken ct = default);
    Task<string>              SuggestReplyAsync(string incomingMessage, string platform, CancellationToken ct = default);
    Task<string>              GenerateBlogSnippetAsync(string topic, CancellationToken ct = default);
}
