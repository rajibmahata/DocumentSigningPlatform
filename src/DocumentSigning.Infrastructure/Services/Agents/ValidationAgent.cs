using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Validation Agent — wraps the ValidationPipeline as a first-class ISpecializedAgent,
/// allowing it to be triggered independently (e.g. for human review workflows).
/// </summary>
public sealed class ValidationAgent(
    IValidationPipeline pipeline,
    ILogger<ValidationAgent> log) : ISpecializedAgent
{
    public string AgentType => "validation";

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation("ValidationAgent executing for merchant {MerchantId}", input.MerchantId);

        // Try prompt first; fall back to "content" key in context (orchestrator always sets Prompt=null)
        var contentToValidate = input.Prompt;
        if (string.IsNullOrWhiteSpace(contentToValidate) && !string.IsNullOrWhiteSpace(input.ContextJson))
        {
            try
            {
                var ctx = JsonSerializer.Deserialize<Dictionary<string, string>>(input.ContextJson);
                ctx?.TryGetValue("content", out contentToValidate);
                if (string.IsNullOrWhiteSpace(contentToValidate))
                    ctx?.TryGetValue("target_content", out contentToValidate);
                if (string.IsNullOrWhiteSpace(contentToValidate))
                    ctx?.TryGetValue("last_output", out contentToValidate);
            }
            catch { /* ignore malformed context */ }
        }

        if (string.IsNullOrWhiteSpace(contentToValidate))
            return new AgentExecutionOutput(false, null, null, null, "No content provided to validate.");

        // Determine the content type from context or fall back to "content"
        string contentType = "content";
        if (!string.IsNullOrWhiteSpace(input.ContextJson))
        {
            try
            {
                var ctx = JsonSerializer.Deserialize<Dictionary<string, string>>(input.ContextJson);
                if (ctx?.TryGetValue("content_type", out var ct2) == true && !string.IsNullOrWhiteSpace(ct2))
                    contentType = ct2!;
                else if (ctx?.TryGetValue("platform", out var plat) == true && !string.IsNullOrWhiteSpace(plat))
                    contentType = plat!;
            }
            catch { /* ignore */ }
        }

        try
        {
            var result = await pipeline.ValidateAsync(
                contentToValidate, contentType, brandVoice: null, ct);

            return new AgentExecutionOutput(
                Success:    result.Passed,
                Content:    result.Feedback,
                OutputJson: JsonSerializer.Serialize(result),
                Validation: result,
                Error:      result.Passed ? null : result.Feedback
            );
        }
        catch (Exception ex)
        {
            log.LogError(ex, "ValidationAgent failed");
            return new AgentExecutionOutput(false, null, null, null, ex.Message);
        }
    }
}
