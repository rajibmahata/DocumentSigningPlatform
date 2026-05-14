using System.Net.Http.Json;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Campaign Agent — plans and executes multi-channel marketing campaigns.
/// Sub-agent types: campaign, campaign_planner, campaign_executor
/// </summary>
public sealed class CampaignAgent(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<CampaignAgent> log) : ISpecializedAgent
{
    public string AgentType => "campaign";

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("CampaignAgent executing for merchant {MerchantId}", input.MerchantId);

        var cfg          = ParseConfig(input.ContextJson);
        var campaignGoal = cfg.GetValueOrDefault("campaign_goal", "generate leads for DocSignerHub free trial");
        var audience     = cfg.GetValueOrDefault("target_audience", "small business owners and HR managers");
        var budget       = cfg.GetValueOrDefault("budget", "$500");
        var duration     = cfg.GetValueOrDefault("duration_days", "14");
        var channels     = cfg.GetValueOrDefault("channels", "LinkedIn, Email, Facebook");

        try
        {
            var apiKey = config["DeepSeek:ApiKey"] ?? string.Empty;
            var model  = config["DeepSeek:Model"]  ?? "deepseek-chat";

            if (string.IsNullOrWhiteSpace(apiKey))
                return new AgentExecutionOutput(false, null, null, null, "DeepSeek API key not configured.");

            var systemPrompt = $$"""
You are an expert B2B digital marketing campaign strategist for DocSignerHub (AI e-signature SaaS).

Create a detailed multi-channel marketing campaign plan.

Return ONLY valid JSON:
{
  "campaign_name": "...",
  "campaign_overview": "...",
  "target_audience": "...",
  "key_messages": ["...", "...", "..."],
  "channels": [
    {
      "channel": "LinkedIn",
      "tactics": ["...", "..."],
      "content_ideas": ["...", "..."],
      "posting_frequency": "..."
    }
  ],
  "weekly_schedule": [
    { "week": 1, "focus": "...", "actions": ["..."] }
  ],
  "kpis": ["...", "..."],
  "budget_allocation": { "LinkedIn": "40%", "Email": "30%", "Facebook": "30%" },
  "expected_results": "..."
}
""";

            var http = httpFactory.CreateClient("deepseek");
            var body = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user",   content =
                        $"Goal: {campaignGoal}\nAudience: {audience}\nBudget: {budget}\nDuration: {duration} days\nChannels: {channels}" }
                },
                temperature = 0.7,
                max_tokens  = 1500,
                response_format = new { type = "json_object" }
            };

            var resp = await http.PostAsJsonAsync("/v1/chat/completions", body, _json, ct);
            resp.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(
                await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

            var raw = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            return new AgentExecutionOutput(
                Success:    true,
                Content:    raw,
                OutputJson: raw,
                Validation: null,
                Error:      null
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "CampaignAgent failed");
            return new AgentExecutionOutput(false, null, null, null, ex.Message);
        }
    }

    private static Dictionary<string, string> ParseConfig(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? []; }
        catch { return []; }
    }
}
