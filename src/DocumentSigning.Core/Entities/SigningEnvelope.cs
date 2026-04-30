using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// A signing envelope groups one or more documents and signers for a single merchant request.
/// </summary>
public class SigningEnvelope
{
    public Guid   Id         { get; set; }
    public Guid   MerchantId { get; set; }
    public string Title      { get; set; } = string.Empty;
    public EnvelopeStatus Status { get; set; } = EnvelopeStatus.Sent;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Per-envelope token TTL override (days). NULL = use server default from appsettings.</summary>
    public int? TokenTtlDays { get; set; }

    /// <summary>
    /// Optional URL to redirect the signer browser after completion.
    /// Supports merge tag {envelopeId}.
    /// </summary>
    public string? RedirectUrl { get; set; }

    /// <summary>
    /// When true, the envelope is only marked Completed after a successful payment.
    /// See EnvelopePayment table.
    /// </summary>
    public bool RequirePayment { get; set; } = false;

    // Navigations
    public Merchant?      Merchant { get; set; }
    public List<Signer>   Signers  { get; set; } = new();
    public List<Document> Documents { get; set; } = new();
}
