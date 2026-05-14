using System.Net.Http.Json;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Blog Agent — handles SEO research, blog writing, validation, and publishing.
/// Sub-agent types: blog, blog_writer, seo_research, blog_validator, blog_publisher
/// </summary>
public sealed class BlogAgent(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<BlogAgent> log) : ISpecializedAgent
{
    public string AgentType => "blog";

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("BlogAgent executing for merchant {MerchantId}", input.MerchantId);

        var cfg      = ParseConfig(input.ContextJson);
        var topic    = cfg.GetValueOrDefault("topic",           "How AI is transforming document signing");
        var keywords = cfg.GetValueOrDefault("keywords",        "e-signature, AI documents, workflow automation");
        var audience = cfg.GetValueOrDefault("target_audience", "business professionals and HR teams");
        var tone     = cfg.GetValueOrDefault("tone",            "informative and professional");

        try
        {
            var apiKey = config["DeepSeek:ApiKey"] ?? string.Empty;
            var model  = config["DeepSeek:Model"]  ?? "deepseek-chat";

            if (string.IsNullOrWhiteSpace(apiKey))
                return new AgentExecutionOutput(false, null, null, null, "DeepSeek API key not configured.");

            var systemPrompt = $$"""
You are an expert SEO blog writer for DocSignerHub, an AI-powered document signing SaaS platform.

Write a complete, SEO-optimised blog post with the following structure:
- Engaging H1 title
- Meta description (150-160 characters)
- Introduction (hook + problem statement)
- 4-5 main sections with H2 headings
- Actionable insights in each section
- Conclusion with clear CTA
- 5 SEO tags/keywords

Target audience: {{audience}}
Tone: {{tone}}
Primary keywords: {{keywords}}

Return ONLY a valid JSON object:
{
  "title": "...",
  "slug": "url-safe-slug",
  "meta_description": "...",
  "content": "full markdown content",
  "keywords": "comma,separated,keywords",
  "tags": "tag1,tag2,tag3",
  "category": "category name",
  "seo_score": "A/B/C letter grade",
  "word_count": 800
}
""";

            var http = httpFactory.CreateClient("deepseek");
            var body = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user",   content = $"Write a blog post about: {topic}" }
                },
                temperature = 0.7,
                max_tokens  = 2000,
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

            using var result = JsonDocument.Parse(raw);
            var titleEl   = result.RootElement.TryGetProperty("title",   out var t) ? t.GetString() : topic;
            var contentEl = result.RootElement.TryGetProperty("content", out var c) ? c.GetString() : raw;

            return new AgentExecutionOutput(
                Success:    true,
                Content:    contentEl,
                OutputJson: raw,
                Validation: null,
                Error:      null
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "BlogAgent failed");
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
