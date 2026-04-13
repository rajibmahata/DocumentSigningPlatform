using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DocumentSigning.Api.Swagger;

/// <summary>
/// Adds X-Api-Key header parameter to operations that require merchant authentication.
/// </summary>
public class ApiKeyHeaderFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var hasApiKeyAttr = context.MethodInfo
            .GetCustomAttributes(true)
            .OfType<RequiresMerchantApiKeyAttribute>()
            .Any()
            || (context.MethodInfo.DeclaringType?.GetCustomAttributes(true)
                .OfType<RequiresMerchantApiKeyAttribute>().Any() ?? false);

        if (!hasApiKeyAttr) return;

        operation.Parameters ??= new List<OpenApiParameter>();
        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Api-Key",
            In = ParameterLocation.Header,
            Required = true,
            Description = "Merchant API key",
            Schema = new OpenApiSchema { Type = "string" }
        });

        operation.Responses["401"] = new OpenApiResponse { Description = "Missing or invalid API key" };
        operation.Responses["403"] = new OpenApiResponse { Description = "Subscription expired" };
        operation.Responses["429"] = new OpenApiResponse { Description = "Request quota exceeded" };
    }
}

/// <summary>Marks a controller/action as requiring X-Api-Key authentication.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequiresMerchantApiKeyAttribute : Attribute { }
