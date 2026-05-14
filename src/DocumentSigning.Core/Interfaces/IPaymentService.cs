using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IPaymentService
{
    /// <summary>
    /// Creates a Stripe PaymentIntent for an envelope and persists an EnvelopePayment record.
    /// Returns the client secret for Stripe.js.
    /// </summary>
    Task<CreatePaymentIntentResult> CreateIntentAsync(
        Guid envelopeId,
        Guid merchantId,
        long amountCents,
        string currency,
        CancellationToken ct = default);

    /// <summary>
    /// Handles a Stripe webhook event (payment_intent.succeeded, etc.).
    /// Marks the payment succeeded and, if all signers done, completes the envelope.
    /// </summary>
    Task HandleStripeWebhookAsync(string json, string stripeSignature, CancellationToken ct = default);

    /// <summary>Returns the current payment state for an envelope.</summary>
    Task<EnvelopePaymentDto?> GetPaymentAsync(Guid envelopeId, CancellationToken ct = default);
}
