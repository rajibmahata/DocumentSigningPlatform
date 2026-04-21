namespace DocumentSigning.Core.DTOs;

// ── Subscription plans ────────────────────────────────────────────────────────

public record SubscriptionPlanDto(
    string Name,
    string DisplayName,
    string Description,
    int    RequestLimit,    // 0 = unlimited
    decimal PriceMonthly,
    bool   IsPopular,
    string[] Features);

public record UpdateMerchantPlanRequest(
    string PlanName,
    DateTime? SubscriptionEnd = null);
