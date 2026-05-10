using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Marketing Automation API — social accounts, posts, campaigns,
/// engagement inbox, AI content generation, and analytics.
/// All endpoints require a JWT bearer token.
/// </summary>
[ApiController]
[Route("api/marketing")]
[Authorize]
[Produces("application/json")]
public class MarketingController : ControllerBase
{
    private readonly IMarketingService   _marketing;
    private readonly IDeepSeekService    _deepSeek;
    private readonly IMerchantRepository _merchantRepo;

    public MarketingController(IMarketingService marketing, IDeepSeekService deepSeek, IMerchantRepository merchantRepo)
    {
        _marketing    = marketing;
        _deepSeek     = deepSeek;
        _merchantRepo = merchantRepo;
    }

    private Guid UserId => Guid.Parse(
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("No user identity claim."));

    private string UserIdStr => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";

    private async Task<Guid> GetMerchantIdAsync(CancellationToken ct = default)
    {
        var merchants = await _merchantRepo.GetByUserIdAsync(UserId, ct);
        return merchants.FirstOrDefault()?.Id
            ?? throw new UnauthorizedAccessException("No merchant account found for this user.");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SOCIAL ACCOUNTS
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>List connected social accounts for the current merchant.</summary>
    [HttpGet("social-accounts")]
    public async Task<IActionResult> GetSocialAccounts(CancellationToken ct)
        => Ok(await _marketing.GetSocialAccountsAsync(await GetMerchantIdAsync(ct), ct));

    /// <summary>Connect or update a social account (LinkedIn / Facebook).</summary>
    [HttpPost("social-accounts")]
    public async Task<IActionResult> ConnectSocialAccount([FromBody] ConnectSocialRequest req, CancellationToken ct)
        => Ok(await _marketing.ConnectSocialAccountAsync(await GetMerchantIdAsync(ct), req, ct));

    /// <summary>Disconnect / remove a social account.</summary>
    [HttpDelete("social-accounts/{id:guid}")]
    public async Task<IActionResult> DisconnectSocialAccount(Guid id, CancellationToken ct)
    {
        await _marketing.DisconnectSocialAccountAsync(id, await GetMerchantIdAsync(ct), ct);
        return NoContent();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POSTS
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>List posts with optional status and platform filters.</summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts(
        [FromQuery] string? status, [FromQuery] string? platform, CancellationToken ct)
        => Ok(await _marketing.GetPostsAsync(await GetMerchantIdAsync(ct), status, platform, ct));

    /// <summary>Create a new post (draft or scheduled).</summary>
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest req, CancellationToken ct)
        => Ok(await _marketing.CreatePostAsync(await GetMerchantIdAsync(ct), $"admin:{UserIdStr}", req, ct));

    /// <summary>Update a post status: draft | scheduled | published | failed.</summary>
    [HttpPatch("posts/{id:guid}/status")]
    public async Task<IActionResult> UpdatePostStatus(Guid id, [FromBody] string status, CancellationToken ct)
        => Ok(await _marketing.UpdatePostStatusAsync(id, await GetMerchantIdAsync(ct), status, ct));

    /// <summary>Delete a post.</summary>
    [HttpDelete("posts/{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id, CancellationToken ct)
    {
        await _marketing.DeletePostAsync(id, await GetMerchantIdAsync(ct), ct);
        return NoContent();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // AI CONTENT STUDIO
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>Generate a social media post using DeepSeek AI.</summary>
    [HttpPost("ai/generate-post")]
    public async Task<IActionResult> GeneratePost([FromBody] GeneratePostRequest req, CancellationToken ct)
    {
        var result = await _deepSeek.GeneratePostAsync(req, ct);
        return Ok(result);
    }

    /// <summary>Generate an AI-suggested reply for an inbound message.</summary>
    [HttpPost("ai/suggest-reply")]
    public async Task<IActionResult> SuggestReply(
        [FromBody] SuggestReplyRequestBody req, CancellationToken ct)
    {
        var reply = await _deepSeek.SuggestReplyAsync(req.Message, req.Platform, ct);
        return Ok(new { reply });
    }

    /// <summary>Generate a blog intro snippet on a given topic.</summary>
    [HttpPost("ai/blog-snippet")]
    public async Task<IActionResult> BlogSnippet([FromBody] BlogSnippetRequestBody req, CancellationToken ct)
    {
        var text = await _deepSeek.GenerateBlogSnippetAsync(req.Topic, ct);
        return Ok(new { content = text });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CAMPAIGNS
    // ──────────────────────────────────────────────────────────────────────────

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns(CancellationToken ct)
        => Ok(await _marketing.GetCampaignsAsync(await GetMerchantIdAsync(ct), ct));

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignRequest req, CancellationToken ct)
        => Ok(await _marketing.CreateCampaignAsync(await GetMerchantIdAsync(ct), req, ct));

    [HttpPatch("campaigns/{id:guid}/status")]
    public async Task<IActionResult> UpdateCampaignStatus(Guid id, [FromBody] string status, CancellationToken ct)
        => Ok(await _marketing.UpdateCampaignStatusAsync(id, await GetMerchantIdAsync(ct), status, ct));

    // ──────────────────────────────────────────────────────────────────────────
    // ENGAGEMENT
    // ──────────────────────────────────────────────────────────────────────────

    [HttpGet("engagements")]
    public async Task<IActionResult> GetEngagements([FromQuery] string? status, CancellationToken ct)
        => Ok(await _marketing.GetEngagementsAsync(await GetMerchantIdAsync(ct), status, ct));

    [HttpPost("engagements/{id:guid}/reply")]
    public async Task<IActionResult> Reply(Guid id, [FromBody] ReplyEngagementRequest req, CancellationToken ct)
        => Ok(await _marketing.ReplyAsync(id, await GetMerchantIdAsync(ct), req.Response, ct));

    [HttpPatch("engagements/{id:guid}/status")]
    public async Task<IActionResult> UpdateEngagementStatus(Guid id, [FromBody] string status, CancellationToken ct)
        => Ok(await _marketing.UpdateEngagementStatusAsync(id, await GetMerchantIdAsync(ct), status, ct));

    // ──────────────────────────────────────────────────────────────────────────
    // ANALYTICS
    // ──────────────────────────────────────────────────────────────────────────

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken ct)
        => Ok(await _marketing.GetAnalyticsAsync(await GetMerchantIdAsync(ct), ct));
}

// ── Inline request bodies ────────────────────────────────────────────────────

public record SuggestReplyRequestBody(string Message, string Platform);
public record BlogSnippetRequestBody(string Topic);
