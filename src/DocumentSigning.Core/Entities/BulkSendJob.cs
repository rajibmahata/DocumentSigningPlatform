namespace DocumentSigning.Core.Entities;

/// <summary>Bulk send job tracking a single CSV-row envelope dispatch.</summary>
public class BulkSendJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>Links all rows in one CSV upload.</summary>
    public Guid BatchId { get; set; }
    public Guid MerchantId { get; set; }
    /// <summary>Recipient name from CSV row.</summary>
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string? RecipientCompany { get; set; }
    /// <summary>JSON of merged substitution variables for the row.</summary>
    public string? MergeDataJson { get; set; }
    /// <summary>Pending | Processing | Sent | Failed</summary>
    public string Status { get; set; } = "Pending";
    public Guid? CreatedEnvelopeId { get; set; }
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    // Navigation
    public Merchant Merchant { get; set; } = null!;
}
