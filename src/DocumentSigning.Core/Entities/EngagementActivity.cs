namespace DocumentSigning.Core.Entities;

/// <summary>Inbound comment / message + AI-generated reply for the engagement inbox.</summary>
public class EngagementActivity
{
    public Guid      Id             { get; set; } = Guid.NewGuid();
    public Guid      MerchantId     { get; set; }
    public Merchant? Merchant        { get; set; }

    /// <summary>linkedin | facebook</summary>
    public string    Platform       { get; set; } = string.Empty;

    /// <summary>comment | message | reaction | mention</summary>
    public string    ActivityType   { get; set; } = "comment";

    public string?   UserName       { get; set; }
    public string    Message        { get; set; } = string.Empty;

    /// <summary>AI-generated or admin-written reply.</summary>
    public string?   Response       { get; set; }

    /// <summary>new | replied | resolved | escalated</summary>
    public string    Status         { get; set; } = "new";

    public string?   PostId         { get; set; }
    public DateTime  CreatedAt      { get; set; } = DateTime.UtcNow;
}
