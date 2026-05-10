namespace DocumentSigning.Core.Entities;

/// <summary>Connected LinkedIn / Facebook page credential for a merchant.</summary>
public class SocialAccount
{
    public Guid     Id                  { get; set; } = Guid.NewGuid();
    public Guid     MerchantId          { get; set; }
    public Merchant? Merchant            { get; set; }

    /// <summary>linkedin | facebook</summary>
    public string   Platform            { get; set; } = string.Empty;
    public string   AccountName         { get; set; } = string.Empty;
    public string   PageId              { get; set; } = string.Empty;
    public string   AccessToken         { get; set; } = string.Empty;
    public string?  RefreshToken        { get; set; }
    public DateTime? TokenExpiry        { get; set; }
    public bool     IsActive            { get; set; } = true;
    public DateTime CreatedAt           { get; set; } = DateTime.UtcNow;
}
