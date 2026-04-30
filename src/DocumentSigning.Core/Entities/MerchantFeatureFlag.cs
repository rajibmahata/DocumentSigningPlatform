namespace DocumentSigning.Core.Entities;

/// <summary>
/// Per-merchant feature flag toggle. Phase-1 foundation.
/// Use feature key constants in FeatureFlags static class.
/// </summary>
public class MerchantFeatureFlag
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    /// <summary>e.g. "ai.summary", "bulk.send", "payment", "ocr", "whiteLabelBranding"</summary>
    public string FeatureKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Merchant Merchant { get; set; } = null!;
}

/// <summary>Well-known feature key constants.</summary>
public static class FeatureKeys
{
    public const string AiSummary       = "ai.summary";
    public const string AiRiskAlerts    = "ai.risk_alerts";
    public const string OcrAutoFields   = "ocr.auto_fields";
    public const string BulkSend        = "bulk.send";
    public const string Payment         = "payment";
    public const string IdVerification  = "id_verification";
    public const string WhiteLabel      = "white_label";
    public const string CustomRedirect  = "custom_redirect";
    public const string InPersonSigning = "in_person_signing";
    public const string Blockchain      = "blockchain";
}
