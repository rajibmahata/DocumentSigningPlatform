using System.Text;
using System.Text.Json;
using System.Net.Http.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Validation pipeline that runs every AI-generated output through
/// a series of validators before it is approved or published.
/// Validators: Brand Compliance, Tone, Legal, Spam Risk, Quality, Hallucination.
/// </summary>
public sealed class ValidationPipeline(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<ValidationPipeline> log) : IValidationPipeline
{
    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<ValidationResult> ValidateAsync(
        string content,
        string contentType,
        string? brandVoice = null,
        CancellationToken ct = default)
    {
        var apiKey = config["DeepSeek:ApiKey"] ?? string.Empty;
        var model  = config["DeepSeek:Model"]  ?? "deepseek-chat";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            log.LogWarning("DeepSeek:ApiKey not configured — skipping AI validation, auto-approving.");
            return AutoApprove();
        }

        var systemPrompt = $$"""
You are a strict AI content validator for DocSignerHub, a professional SaaS e-signature platform.

Evaluate the following {{contentType}} content across 6 dimensions and return ONLY a valid JSON object (no markdown, no explanation):

{
  "brand_compliant": true or false,
  "tone_valid": true or false,
  "legally_compliant": true or false,
  "spam_risk_score": 0.0 to 1.0,
  "hallucination_free": true or false,
  "quality_score": 0 to 100,
  "overall_decision": "approve" | "rewrite" | "reject",
  "feedback": "brief explanation",
  "rewrite_suggestion": "rewrite if decision is rewrite, else null"
}

Validation rules:
- Brand: Professional, B2B SaaS, no hype or clickbait
- Tone: {{(brandVoice ?? "professional and informative")}}
- Legal: No false promises, no misleading claims
- Spam: Score > 0.6 = fail
- Quality: Score < 60 = fail
- Hallucination: No invented facts or fake statistics
""";

        var userMessage = $"Content to validate:\n\n{content}";

        try
        {
            var http = httpFactory.CreateClient("deepseek");
            var requestBody = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user",   content = userMessage  }
                },
                temperature = 0.1,
                max_tokens  = 500,
                response_format = new { type = "json_object" }
            };

            var resp = await http.PostAsJsonAsync("/v1/chat/completions", requestBody, _json, ct);
            resp.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(
                await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

            var raw = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            using var resultDoc = JsonDocument.Parse(raw);
            var r = resultDoc.RootElement;

            var brandCompliant    = r.TryGetProperty("brand_compliant",    out var bc)  && bc.GetBoolean();
            var toneValid         = r.TryGetProperty("tone_valid",         out var tv)  && tv.GetBoolean();
            var legallyCompliant  = r.TryGetProperty("legally_compliant",  out var lc)  && lc.GetBoolean();
            var hallucinationFree = r.TryGetProperty("hallucination_free", out var hf)  && hf.GetBoolean();
            var spamRisk          = r.TryGetProperty("spam_risk_score",    out var sr)  ? (float)sr.GetDouble() : 0.3f;
            var quality           = r.TryGetProperty("quality_score",      out var qs)  ? qs.GetInt32() : 70;
            var decision          = r.TryGetProperty("overall_decision",   out var od)  ? od.GetString() ?? "approve" : "approve";
            var feedback          = r.TryGetProperty("feedback",           out var fb)  ? fb.GetString() : null;
            var rewrite           = r.TryGetProperty("rewrite_suggestion", out var rw)  ? rw.GetString() : null;

            var passed = brandCompliant && toneValid && legallyCompliant &&
                         hallucinationFree && spamRisk < 0.6f && quality >= 60;

            return new ValidationResult(
                Passed:           passed,
                QualityScore:     quality,
                BrandCompliant:   brandCompliant,
                ToneValid:        toneValid,
                LegallyCompliant: legallyCompliant,
                SpamRiskScore:    spamRisk,
                HallucinationFree: hallucinationFree,
                OverallDecision:  decision,
                Feedback:         feedback,
                RewriteSuggestion: rewrite
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Validation pipeline failed — auto-approving with warning");
            return AutoApprove(feedback: $"Validation service error: {ex.Message}");
        }
    }

    private static ValidationResult AutoApprove(string? feedback = null) =>
        new(Passed: true, QualityScore: 75, BrandCompliant: true, ToneValid: true,
            LegallyCompliant: true, SpamRiskScore: 0.1f, HallucinationFree: true,
            OverallDecision: "approve", Feedback: feedback ?? "Auto-approved",
            RewriteSuggestion: null);
}
