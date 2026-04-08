using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace DocumentSigning.Api.Filters;

/// <summary>
/// Validates the X-Api-Key header and attaches the resolved Merchant to HttpContext.Items.
/// Apply with [ServiceFilter(typeof(MerchantApiKeyFilter))] on controllers/actions.
/// </summary>
public class MerchantApiKeyFilter : IAsyncActionFilter
{
    private readonly IMerchantRepository _merchantRepo;

    public MerchantApiKeyFilter(IMerchantRepository merchantRepo)
        => _merchantRepo = merchantRepo;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var key)
            || string.IsNullOrWhiteSpace(key))
        {
            context.Result = new UnauthorizedObjectResult("X-Api-Key header is required.");
            return;
        }

        var merchant = await _merchantRepo.GetByApiKeyAsync(key!, context.HttpContext.RequestAborted);
        if (merchant is null || !merchant.IsActive)
        {
            context.Result = new UnauthorizedObjectResult("Invalid or inactive API key.");
            return;
        }

        if (merchant.SubscriptionEnd.HasValue && merchant.SubscriptionEnd.Value < DateTime.UtcNow)
        {
            context.Result = new ObjectResult("Merchant subscription has expired.")
                { StatusCode = StatusCodes.Status403Forbidden };
            return;
        }

        // Quota check (0 = unlimited)
        if (merchant.RequestLimit > 0 && merchant.RequestUsed >= merchant.RequestLimit)
        {
            context.Result = new ObjectResult("Request quota exceeded for this merchant.")
                { StatusCode = StatusCodes.Status429TooManyRequests };
            return;
        }

        context.HttpContext.Items["Merchant"] = merchant;
        await next();
    }
}
