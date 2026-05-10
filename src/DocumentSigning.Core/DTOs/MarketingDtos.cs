namespace DocumentSigning.Core.DTOs;

// ── DeepSeek / Marketing DTOs ─────────────────────────────────────────────────

public record GeneratePostRequest(
    string Platform,           // linkedin | facebook
    string ContentCategory,    // product_feature | workflow_automation | ...
    string? Tone,              // professional | casual | inspirational
    string? CampaignContext,   // optional extra context
    bool   IncludeHashtags = true
);

public record GeneratePostResult(
    string Content,
    string Hashtags,
    string[] SuggestedCtas,
    int    EngagementScore
);

public record MarketingPostDto
{
    public Guid     Id              { get; init; }
    public string   Platform        { get; init; } = "";
    public string   Content         { get; init; } = "";
    public string?  ImageUrl        { get; init; }
    public string   Status          { get; init; } = "draft";
    public DateTime? ScheduledAt    { get; init; }
    public DateTime? PublishedAt    { get; init; }
    public int      EngagementScore { get; init; }
    public string   ContentCategory { get; init; } = "";
    public string?  Hashtags        { get; init; }
    public string?  CampaignId      { get; init; }
    public string   CreatedBy       { get; init; } = "";
    public DateTime CreatedAt       { get; init; }
}

public record CreatePostRequest(
    string Platform,
    string Content,
    string ContentCategory,
    string? Hashtags,
    string? ImageUrl,
    string? CampaignId,
    DateTime? ScheduledAt
);

public record SocialAccountDto
{
    public Guid     Id           { get; init; }
    public string   Platform     { get; init; } = "";
    public string   AccountName  { get; init; } = "";
    public string   PageId       { get; init; } = "";
    public bool     IsActive     { get; init; }
    public DateTime? TokenExpiry { get; init; }
    public DateTime CreatedAt    { get; init; }
}

public record ConnectSocialRequest(
    string Platform,
    string AccountName,
    string PageId,
    string AccessToken,
    string? RefreshToken,
    DateTime? TokenExpiry
);

public record MarketingCampaignDto
{
    public Guid     Id           { get; init; }
    public string   Name         { get; init; } = "";
    public string?  Description  { get; init; }
    public string   CampaignType { get; init; } = "";
    public string   Status       { get; init; } = "";
    public DateTime? StartedAt   { get; init; }
    public DateTime? EndedAt     { get; init; }
    public DateTime CreatedAt    { get; init; }
}

public record CreateCampaignRequest(string Name, string? Description, string CampaignType);

public record EngagementActivityDto
{
    public Guid     Id           { get; init; }
    public string   Platform     { get; init; } = "";
    public string   ActivityType { get; init; } = "";
    public string?  UserName     { get; init; }
    public string   Message      { get; init; } = "";
    public string?  Response     { get; init; }
    public string   Status       { get; init; } = "";
    public string?  PostId       { get; init; }
    public DateTime CreatedAt    { get; init; }
}

public record ReplyEngagementRequest(string Response);

public record MarketingAnalyticsDto
{
    public int TotalPosts      { get; init; }
    public int PublishedPosts  { get; init; }
    public int ScheduledPosts  { get; init; }
    public int DraftPosts      { get; init; }
    public int TotalEngagements { get; init; }
    public int PendingReplies  { get; init; }
    public int ActiveCampaigns { get; init; }
    public double AvgEngagementScore { get; init; }
    public IReadOnlyList<PlatformStatDto> PlatformStats { get; init; } = [];
    public IReadOnlyList<MarketingPostDto> TopPosts     { get; init; } = [];
}

public record PlatformStatDto(string Platform, int Posts, int Engagements);
