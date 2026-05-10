using System.Net.Http.Json;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Email Marketing Agent — generates personalised outreach, follow-up,
/// lead-nurture, and re-engagement email copy.
/// Sub-agent types: email_marketing, email_outreach, email_followup, email_nurture, email_reactivation
/// </summary>
public sealed class EmailMarketingAgent(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<EmailMarketingAgent> log) : ISpecializedAgent
{
    public string AgentType => "email_marketing";

    private static readonly JsonSerializerOptions _json =
        new() { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("EmailMarketingAgent executing for merchant {MerchantId}", input.MerchantId);

        var cfg             = ParseConfig(input.ContextJson);
        var emailType       = cfg.GetValueOrDefault("email_type", "outreach");
        var recipientName   = cfg.GetValueOrDefault("recipient_name",    "Valued Customer");
        var recipientSentiment = cfg.GetValueOrDefault("sentiment",      "neutral");
        var objectionType   = cfg.GetValueOrDefault("objection_type",    "");
        var merchantName    = cfg.GetValueOrDefault("merchant_name",     "DocSignerHub");
        var productName     = cfg.GetValueOrDefault("product_name",      "DocSignerHub");
        var priorMessages   = cfg.GetValueOrDefault("prior_messages",    "");

        var systemPrompt = BuildSystemPrompt(emailType, merchantName, productName, recipientSentiment, objectionType);
        var userPrompt   = BuildUserPrompt(recipientName, priorMessages, emailType);

        try
        {
            var apiKey = config["DeepSeek:ApiKey"] ?? string.Empty;
            var model  = config["DeepSeek:Model"]  ?? "deepseek-chat";

            if (string.IsNullOrWhiteSpace(apiKey))
                return new AgentExecutionOutput(false, null, null, null, "DeepSeek API key not configured.");

            var http = httpFactory.CreateClient("deepseek");
            var body = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user",   content = userPrompt   }
                },
                temperature = 0.7,
                max_tokens  = 800,
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
            var subject = result.RootElement.TryGetProperty("subject", out var s) ? s.GetString() : "(No subject)";
            var body2   = result.RootElement.TryGetProperty("body",    out var b) ? b.GetString() : raw;
            var cta     = result.RootElement.TryGetProperty("cta",     out var c) ? c.GetString() : null;

            var output = new { email_type = emailType, subject, body = body2, cta, generated_at = DateTime.UtcNow };

            return new AgentExecutionOutput(
                Success:    true,
                Content:    $"Subject: {subject}\n\n{body2}",
                OutputJson: JsonSerializer.Serialize(output),
                Validation: null,
                Error:      null
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "EmailMarketingAgent failed");
            return new AgentExecutionOutput(false, null, null, null, ex.Message);
        }
    }

    private static string BuildSystemPrompt(string emailType, string merchantName,
        string productName, string sentiment, string objection)
    {
        var jsonFormat = "{\"subject\": \"...\", \"body\": \"...\", \"cta\": \"...\"}";
        return emailType switch
        {
            "followup" => $"You are an expert B2B email copywriter for {merchantName}.\n"
                + $"Write a warm, non-pushy follow-up email for {productName} (AI document signing SaaS).\n"
                + $"The recipient's prior sentiment was: {sentiment}.\n"
                + (string.IsNullOrEmpty(objection) ? "" : $"Their objection was: {objection}. Address it gently.\n")
                + $"Return ONLY JSON: {jsonFormat}",
            "reactivation" => $"You are an expert re-engagement email specialist for {merchantName}.\n"
                + $"Write a re-engagement email for a lapsed {productName} customer.\n"
                + "Be empathetic, mention new features, and include a soft CTA.\n"
                + $"Return ONLY JSON: {jsonFormat}",
            "nurture" => $"You are an expert lead nurture email specialist for {merchantName}.\n"
                + $"Write an educational, value-first nurture email for {productName} prospects.\n"
                + "Focus on solving pain points (slow contract workflows, paper-based signing).\n"
                + $"Return ONLY JSON: {jsonFormat}",
            _ => $"You are an expert B2B cold outreach specialist for {merchantName}.\n"
                + $"Write a personalised, concise outreach email for {productName} (AI document signing SaaS).\n"
                + "Highlight: 90% faster signing, AI workflows, blockchain audit trails.\n"
                + $"Return ONLY JSON: {jsonFormat}"
        };
    }

    private static string BuildUserPrompt(string recipientName, string priorMessages, string emailType)
    {
        var prior = string.IsNullOrEmpty(priorMessages) ? "" : $"\nPrior communication context: {priorMessages}";
        return $"Write a {emailType} email to: {recipientName}.{prior}";
    }

    private static Dictionary<string, string> ParseConfig(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? []; }
        catch { return []; }
    }
}
