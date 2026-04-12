using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DocumentSigning.Api.Swagger;

/// <summary>
/// Adds a pre-filled request body example for POST /api/merchants.
/// </summary>
public class CreateMerchantExampleFilter : IOperationFilter
{
    private static readonly OpenApiObject Example = new()
    {
        ["userId"]       = new OpenApiString("00000000-0000-0000-0000-000000000001"),
        ["name"]         = new OpenApiString("Demo Workspace"),
        ["description"]  = new OpenApiString("My main signing workspace"),
        ["requestLimit"] = new OpenApiInteger(100)
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var descriptor = context.ApiDescription;
        if (!string.Equals(descriptor.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
            return;

        if (descriptor.RelativePath?.Equals("api/merchants", StringComparison.OrdinalIgnoreCase) != true)
            return;

        if (operation.RequestBody?.Content == null)
            return;

        foreach (var mediaType in operation.RequestBody.Content.Values)
        {
            mediaType.Examples["Demo merchant"] = new OpenApiExample
            {
                Summary = "Demo merchant with 100-request limit",
                Value   = Example
            };
        }
    }
}
