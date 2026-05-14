namespace DocumentSigning.Core.Entities;

/// <summary>White-label branding and domain settings per merchant.</summary>
public class MerchantBranding
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    /// <summary>Custom CNAME domain, e.g. "sign.acmecorp.com"</summary>
    public string? CustomDomain { get; set; }
    /// <summary>Public URL to merchant logo image.</summary>
    public string? LogoUrl { get; set; }
    /// <summary>Hex color, e.g. "#1A73E8"</summary>
    public string? PrimaryColor { get; set; }
    /// <summary>Sender name override for outgoing emails.</summary>
    public string? EmailFromName { get; set; }
    /// <summary>Optional footer text in signing portal.</summary>
    public string? PortalFooterText { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Merchant Merchant { get; set; } = null!;
}
