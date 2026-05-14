using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Calls DeepSeek Chat Completions API (OpenAI-compatible) to generate
/// social media marketing content for DocSignerHub.
/// Config section: DeepSeek:ApiKey  (required)
///                 DeepSeek:Model   (default: deepseek-chat)
///                 DeepSeek:BaseUrl (default: https://api.deepseek.com)
/// </summary>
public sealed class DeepSeekService : IDeepSeekService
{
    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    private readonly HttpClient            _http;
    private readonly string                _model;
    private readonly ILogger<DeepSeekService> _log;

    public DeepSeekService(IHttpClientFactory factory, IConfiguration config, ILogger<DeepSeekService> log)
    {
        _log   = log;
        _model = config["DeepSeek:Model"] ?? "deepseek-chat";
        // Authorization header is already set by the named "deepseek" client in Program.cs
        _http  = factory.CreateClient("deepseek");
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public async Task<GeneratePostResult> GeneratePostAsync(GeneratePostRequest req, CancellationToken ct = default)
    {
        var tone        = req.Tone ?? "professional";
        var platformHint = req.Platform == "linkedin" ? "LinkedIn Company Page" : "Facebook Business Page";
        var systemPrompt = BuildSystemPrompt();
        var userPrompt   = $$"""
            Write a {{tone}} {{platformHint}} post for DocSignerHub (a SaaS e-signature & workflow automation platform).
            Content category: {{req.ContentCategory}}.
            {{(req.CampaignContext is not null ? $"Campaign context: {req.CampaignContext}." : "")}}
            {{(req.IncludeHashtags ? "Include 5-8 relevant hashtags at the end." : "Do not include hashtags.")}}

            Return JSON only, in this exact structure:
            {
              "content": "...",
              "hashtags": "...",
              "suggested_ctas": ["...", "..."],
              "engagement_score": 72
            }
            """;

        var raw = await CallAsync(systemPrompt, userPrompt, ct);
        return ParseGeneratePostResult(raw);
    }

    public async Task<string> SuggestReplyAsync(string incomingMessage, string platform, CancellationToken ct = default)
    {
        var prompt = $"""
            You are the community manager for DocSignerHub (SaaS e-signature platform).
            Someone wrote the following on our {platform} page:
            ---
            {incomingMessage}
            ---
            Write a friendly, helpful, brand-safe reply in 1-3 sentences. Return only the reply text.
            """;
        return await CallAsync(BuildSystemPrompt(), prompt, ct);
    }

    public async Task<string> GenerateBlogSnippetAsync(string topic, CancellationToken ct = default)
    {
        var prompt = $"""
            Write a 150-word blog introduction paragraph for DocSignerHub about: {topic}.
            Tone: authoritative yet approachable. Include a compelling hook.
            """;
        return await CallAsync(BuildSystemPrompt(), prompt, ct);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private static string BuildSystemPrompt() =>
        "You are an expert SaaS digital marketing copywriter for DocSignerHub — a leading " +
        "e-signature and workflow automation platform. You write compelling, high-engagement " +
        "content that drives product awareness, feature adoption, and user trust. " +
        "Your writing is clear, credible, and tailored for B2B decision-makers.";

    private async Task<string> CallAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var body = new
        {
            model    = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user",   content = userPrompt   },
            },
            temperature = 0.7,
            max_tokens  = 1024,
        };

        using var resp = await _http.PostAsJsonAsync(
            "/v1/chat/completions", body, _json, ct);

        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync(ct);
            _log.LogError("DeepSeek API error {Status}: {Body}", resp.StatusCode, err);
            throw new InvalidOperationException($"DeepSeek API returned {resp.StatusCode}");
        }

        using var doc = await JsonDocument.ParseAsync(
            await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

        return doc.RootElement
                  .GetProperty("choices")[0]
                  .GetProperty("message")
                  .GetProperty("content")
                  .GetString() ?? string.Empty;
    }

    private static GeneratePostResult ParseGeneratePostResult(string raw)
    {
        // Strip markdown code fences if present
        var cleaned = raw.Trim();
        if (cleaned.StartsWith("```")) cleaned = cleaned[cleaned.IndexOf('\n')..].TrimStart();
        if (cleaned.EndsWith("```"))  cleaned = cleaned[..cleaned.LastIndexOf("```")].TrimEnd();

        try
        {
            using var doc = JsonDocument.Parse(cleaned);
            var root   = doc.RootElement;
            var content = root.TryGetProperty("content",    out var c) ? c.GetString() ?? "" : cleaned;
            var tags    = root.TryGetProperty("hashtags",   out var h) ? h.GetString() ?? "" : "";
            var score   = root.TryGetProperty("engagement_score", out var s) ? s.GetInt32() : 65;
            var ctas    = root.TryGetProperty("suggested_ctas",   out var ca) && ca.ValueKind == JsonValueKind.Array
                          ? ca.EnumerateArray().Select(x => x.GetString() ?? "").ToArray()
                          : ["Learn more", "Start free trial"];
            return new GeneratePostResult(content, tags, ctas, score);
        }
        catch
        {
            // Fallback: return raw text as content
            return new GeneratePostResult(cleaned, "", ["Learn more"], 60);
        }
    }
}
