using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Social Media Agent — generates LinkedIn and Facebook posts with hashtags,
/// engagement-optimised CTAs, and best-practice formatting.
/// Sub-agent types: linkedin, facebook, engagement_reply, social_media
/// </summary>
public sealed class SocialMediaAgent(
    IDeepSeekService deepSeek,
    ILogger<SocialMediaAgent> log) : ISpecializedAgent
{
    public string AgentType => "social_media";

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("SocialMediaAgent executing for merchant {MerchantId}", input.MerchantId);

        var config  = ParseConfig(input.ContextJson);
        var platform = config.GetValueOrDefault("platform", "linkedin");
        var topic    = config.GetValueOrDefault("topic",    "document automation and e-signature workflows");
        var tone     = config.GetValueOrDefault("tone",     "professional");

        try
        {
            var result = await deepSeek.GeneratePostAsync(new GeneratePostRequest(
                Platform:        platform,
                ContentCategory: config.GetValueOrDefault("content_category", "product_feature"),
                Tone:            tone,
                CampaignContext: $"Merchant: {config.GetValueOrDefault("merchant_name", "DocSignerHub")}. Topic: {topic}."
            ));

            var output = new
            {
                platform,
                content   = result.Content,
                hashtags  = result.Hashtags,
                ctas      = result.SuggestedCtas,
                score     = result.EngagementScore,
                generated_at = DateTime.UtcNow
            };

            return new AgentExecutionOutput(
                Success:    true,
                Content:    result.Content,
                OutputJson: JsonSerializer.Serialize(output),
                Validation: null,
                Error:      null
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "SocialMediaAgent failed");
            return new AgentExecutionOutput(false, null, null, null, ex.Message);
        }
    }

    private static Dictionary<string, string> ParseConfig(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? [];
        }
        catch { return []; }
    }
}
