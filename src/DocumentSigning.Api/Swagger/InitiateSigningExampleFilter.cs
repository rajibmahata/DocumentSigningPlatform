using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DocumentSigning.Api.Swagger;

/// <summary>
/// Adds a pre-filled request body example for POST /api/signing/initiate.
/// </summary>
public class InitiateSigningExampleFilter : IOperationFilter
{
    // Real DOCX sample (a minimal Word document)
    private const string SampleDocxBase64 =
        "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";

    private static readonly OpenApiObject Example = new()
    {
        ["claimId"]             = new OpenApiString("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        ["claimantEmail"]       = new OpenApiString("rajibmahata143@gmail.com"),
        ["claimantName"]        = new OpenApiString("Rajib Mahata"),
        ["documentBase64"]      = new OpenApiString(SampleDocxBase64),
        ["documentContentType"] = new OpenApiString(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        // Only apply to POST /api/signing/initiate
        var descriptor = context.ApiDescription;
        if (!string.Equals(descriptor.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
            return;

        if (descriptor.RelativePath?.Equals(
                "api/signing/initiate", StringComparison.OrdinalIgnoreCase) != true)
            return;

        if (operation.RequestBody?.Content == null)
            return;

        foreach (var mediaType in operation.RequestBody.Content.Values)
        {
            mediaType.Examples["DOCX — Rajib Mahata"] = new OpenApiExample
            {
                Summary = "Real DOCX document — Rajib Mahata",
                Description = "A valid .docx file (binary base64) with claimant Rajib Mahata. " +
                              "DocumentContentType must be the full MIME type for DOCX files.",
                Value = Example
            };

            mediaType.Examples["PDF — placeholder"] = new OpenApiExample
            {
                Summary = "PDF document — placeholder",
                Description = "Replace documentBase64 with your actual base64-encoded PDF bytes.",
                Value = new OpenApiObject
                {
                    ["claimId"]             = new OpenApiString("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
                    ["claimantEmail"]       = new OpenApiString("rajibmahata143@gmail.com"),
                    ["claimantName"]        = new OpenApiString("Rajib Mahata"),
                    ["documentBase64"]      = new OpenApiString("<base64-encoded PDF bytes>"),
                    ["documentContentType"] = new OpenApiString("application/pdf")
                }
            };
        }
    }
}
