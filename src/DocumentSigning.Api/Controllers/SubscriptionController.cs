using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Subscription plan management.
/// GET /api/plans — public plan listing.
/// POST /api/merchants/{id}/plan — admin plan assignment.
/// </summary>
[ApiController]
public class SubscriptionController : ControllerBase
{
    // ── Plan catalogue ────────────────────────────────────────────────────────

    internal static readonly IReadOnlyList<SubscriptionPlanDto> Plans = new[]
    {
        new SubscriptionPlanDto(
            Name:          "free",
            DisplayName:   "Free",
            Description:   "Get started with document signing at no cost.",
            RequestLimit:  25,
            PriceMonthly:  0m,
            IsPopular:     false,
            Features: new[]
            {
                "Up to 25 signing requests / month",
                "Unlimited documents per envelope",
                "Email notifications",
                "Basic audit log",
            }),

        new SubscriptionPlanDto(
            Name:          "starter",
            DisplayName:   "Starter",
            Description:   "Perfect for small teams and growing businesses.",
            RequestLimit:  100,
            PriceMonthly:  9m,
            IsPopular:     false,
            Features: new[]
            {
                "Up to 100 signing requests / month",
                "Webhook integrations",
                "Signer contacts",
                "Email notifications",
                "Full audit log",
            }),

        new SubscriptionPlanDto(
            Name:          "pro",
            DisplayName:   "Pro",
            Description:   "For teams that need higher volume and advanced features.",
            RequestLimit:  500,
            PriceMonthly:  29m,
            IsPopular:     true,
            Features: new[]
            {
                "Up to 500 signing requests / month",
                "Priority email delivery",
                "Certificate of Completion",
                "Webhook integrations",
                "Signer contacts",
                "Full audit log + analytics",
            }),

        new SubscriptionPlanDto(
            Name:          "enterprise",
            DisplayName:   "Enterprise",
            Description:   "Unlimited usage with dedicated support.",
            RequestLimit:  0,
            PriceMonthly:  99m,
            IsPopular:     false,
            Features: new[]
            {
                "Unlimited signing requests",
                "Dedicated support",
                "Custom branding",
                "Certificate of Completion",
                "Priority webhook delivery",
                "Advanced analytics",
            }),
    };

    // ── GET /api/plans ────────────────────────────────────────────────────────

    /// <summary>Returns all available subscription plans.</summary>
    [HttpGet("api/plans")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<SubscriptionPlanDto>), StatusCodes.Status200OK)]
    public IActionResult GetPlans() => Ok(Plans);

    // ── POST /api/merchants/{id}/plan ─────────────────────────────────────────

    /// <summary>
    /// Assigns a subscription plan to a merchant. Admin only.
    /// Updates <c>RequestLimit</c> and optionally <c>SubscriptionEnd</c>.
    /// </summary>
    [HttpPost("api/merchants/{id:guid}/plan")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignPlan(
        Guid id,
        [FromBody] UpdateMerchantPlanRequest request,
        [FromServices] IMerchantRepository merchantRepo,
        CancellationToken ct)
    {
        var plan = Plans.FirstOrDefault(p =>
            string.Equals(p.Name, request.PlanName, StringComparison.OrdinalIgnoreCase));

        if (plan is null)
            return BadRequest($"Unknown plan '{request.PlanName}'. Valid values: {string.Join(", ", Plans.Select(p => p.Name))}.");

        var merchant = await merchantRepo.GetByIdAsync(id, ct);
        if (merchant is null) return NotFound();

        merchant.RequestLimit    = plan.RequestLimit;
        merchant.SubscriptionEnd = request.SubscriptionEnd ?? DateTime.UtcNow.AddDays(30);

        await merchantRepo.UpdateAsync(merchant, ct);
        await merchantRepo.SaveChangesAsync(ct);

        return Ok(new
        {
            merchantId    = merchant.Id,
            plan          = plan.Name,
            requestLimit  = merchant.RequestLimit,
            subscriptionEnd = merchant.SubscriptionEnd,
        });
    }
}
