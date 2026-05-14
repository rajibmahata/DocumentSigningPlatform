namespace DocumentSigning.Core.Entities;

/// <summary>Identity verification request for a signer.</summary>
public class IdentityVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SigningRequestId { get; set; }
    public Guid MerchantId { get; set; }
    /// <summary>Email of the signer being verified.</summary>
    public string SignerEmail { get; set; } = string.Empty;
    /// <summary>Passport | License | NationalId</summary>
    public string DocumentType { get; set; } = string.Empty;
    /// <summary>Pending | Approved | Rejected | Expired</summary>
    public string Status { get; set; } = "Pending";
    /// <summary>Storage URL of uploaded ID image (never expose raw bytes in API responses).</summary>
    public string? IdImageUrl { get; set; }
    /// <summary>Confidence score 0–100 from verification service</summary>
    public int? ConfidenceScore { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

    // Navigation
    public SigningRequest SigningRequest { get; set; } = null!;
}
