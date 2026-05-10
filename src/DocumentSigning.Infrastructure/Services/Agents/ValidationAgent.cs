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

        if (string.IsNullOrWhiteSpace(input.Prompt))
            return new AgentExecutionOutput(false, null, null, null, "No content provided to validate.");

        try
        {
            var result = await pipeline.ValidateAsync(
                input.Prompt, input.AgentType, brandVoice: null, ct);

            return new AgentExecutionOutput(
                Success:    result.Passed,
                Content:    result.Feedback,
                OutputJson: System.Text.Json.JsonSerializer.Serialize(result),
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
