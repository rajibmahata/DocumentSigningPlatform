namespace DocumentSigning.Core.Entities;

/// <summary>Stripe payment intent linked to an envelope. Envelope completes only after payment.</summary>
public class EnvelopePayment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnvelopeId { get; set; }
    public Guid MerchantId { get; set; }
    /// <summary>Stripe payment intent ID</summary>
    public string PaymentIntentId { get; set; } = string.Empty;
    /// <summary>Amount in smallest currency unit (e.g. cents)</summary>
    public long AmountCents { get; set; }
    public string Currency { get; set; } = "usd";
    /// <summary>Pending | Succeeded | Failed | Cancelled</summary>
    public string Status { get; set; } = "Pending";
    /// <summary>Client secret returned to frontend for Stripe.js</summary>
    public string ClientSecret { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    // Navigation
    public SigningEnvelope Envelope { get; set; } = null!;
}
