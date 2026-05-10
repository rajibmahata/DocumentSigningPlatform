using System.Net.Http.Json;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Analytics Intelligence Agent — mines performance data and generates AI insights
/// and growth recommendations for the merchant.
/// </summary>
public sealed class AnalyticsIntelligenceAgent(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<AnalyticsIntelligenceAgent> log) : ISpecializedAgent
{
    public string AgentType => "analytics";

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("AnalyticsIntelligenceAgent executing for merchant {MerchantId}", input.MerchantId);

        var cfg          = ParseConfig(input.ContextJson);
        var metricsJson  = cfg.GetValueOrDefault("metrics_snapshot", "{}");
        var periodLabel  = cfg.GetValueOrDefault("period", "last 30 days");

        try
        {
            var apiKey = config["DeepSeek:ApiKey"] ?? string.Empty;
            var model  = config["DeepSeek:Model"]  ?? "deepseek-chat";

            if (string.IsNullOrWhiteSpace(apiKey))
                return new AgentExecutionOutput(false, null, null, null, "DeepSeek API key not configured.");

            var systemPrompt = $$"""
You are an AI marketing analytics intelligence agent for DocSignerHub (AI e-signature SaaS).

Analyse the provided performance metrics snapshot and generate actionable insights.

Return ONLY valid JSON:
{
  "summary": "brief executive summary",
  "top_performing_channels": ["..."],
  "underperforming_areas": ["..."],
  "trend_insights": ["...", "..."],
  "growth_opportunities": ["...", "..."],
  "recommended_actions": [
    { "action": "...", "priority": "high|medium|low", "expected_impact": "..." }
  ],
  "risk_alerts": ["..."],
  "next_period_forecast": "..."
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
                        $"Period: {periodLabel}\nMetrics: {metricsJson}" }
                },
                temperature = 0.4,
                max_tokens  = 1000,
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
            log.LogError(ex, "AnalyticsIntelligenceAgent failed");
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
