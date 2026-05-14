using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Stripe payment intent lifecycle.
/// Requires configuration: Stripe:SecretKey and Stripe:WebhookSecret.
/// Add NuGet package Stripe.net to enable live Stripe calls.
/// </summary>
public sealed class PaymentService : IPaymentService
{
    private readonly IEnvelopePaymentRepository   _paymentRepo;
    private readonly ISigningEnvelopeRepository   _envelopeRepo;
    private readonly IConfiguration               _config;
    private readonly ILogger<PaymentService>      _logger;

    public PaymentService(
        IEnvelopePaymentRepository paymentRepo,
        ISigningEnvelopeRepository envelopeRepo,
        IConfiguration config,
        ILogger<PaymentService> logger)
    {
        _paymentRepo  = paymentRepo;
        _envelopeRepo = envelopeRepo;
        _config       = config;
        _logger       = logger;
    }

    public async Task<CreatePaymentIntentResult> CreateIntentAsync(
        Guid envelopeId, Guid merchantId, long amountCents, string currency, CancellationToken ct = default)
    {
        // Check for existing intent
        var existing = await _paymentRepo.GetByEnvelopeIdAsync(envelopeId, ct);
        if (existing is not null)
            return new CreatePaymentIntentResult(existing.Id, existing.ClientSecret, existing.Status);

        var stripeKey = _config["Stripe:SecretKey"];

        string paymentIntentId;
        string clientSecret;

        if (string.IsNullOrWhiteSpace(stripeKey))
        {
            // Stub for dev/test — generate deterministic placeholders
            paymentIntentId = $"pi_stub_{Guid.NewGuid():N}";
            clientSecret    = $"pi_stub_{Guid.NewGuid():N}_secret_{Guid.NewGuid():N}";
            _logger.LogWarning("Stripe:SecretKey not configured. Returning stub payment intent.");
        }
        else
        {
            (paymentIntentId, clientSecret) = await CreateStripeIntentAsync(
                stripeKey, amountCents, currency, envelopeId, ct);
        }

        var payment = new EnvelopePayment
        {
            Id              = Guid.NewGuid(),
            EnvelopeId      = envelopeId,
            MerchantId      = merchantId,
            PaymentIntentId = paymentIntentId,
            AmountCents     = amountCents,
            Currency        = currency.ToLowerInvariant(),
            Status          = "Pending",
            ClientSecret    = clientSecret,
            CreatedAt       = DateTime.UtcNow,
        };

        await _paymentRepo.AddAsync(payment, ct);
        await _paymentRepo.SaveChangesAsync(ct);

        return new CreatePaymentIntentResult(payment.Id, clientSecret, "Pending");
    }

    public async Task HandleStripeWebhookAsync(string json, string stripeSignature, CancellationToken ct = default)
    {
        var webhookSecret = _config["Stripe:WebhookSecret"];

        // Parse event type without Stripe SDK for portability
        string? eventType    = null;
        string? intentId     = null;
        string? intentStatus = null;

        try
        {
            using var doc  = JsonDocument.Parse(json);
            var root        = doc.RootElement;
            eventType       = root.GetProperty("type").GetString();
            var dataObject  = root.GetProperty("data").GetProperty("object");
            intentId        = dataObject.GetProperty("id").GetString();
            intentStatus    = dataObject.TryGetProperty("status", out var s) ? s.GetString() : null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Stripe webhook payload.");
            return;
        }

        if (intentId is null) return;

        var payment = await _paymentRepo.GetByPaymentIntentIdAsync(intentId, ct);
        if (payment is null)
        {
            _logger.LogWarning("Stripe webhook for unknown payment intent {IntentId}", intentId);
            return;
        }

        payment.Status = eventType switch
        {
            "payment_intent.succeeded"           => "Succeeded",
            "payment_intent.payment_failed"      => "Failed",
            "payment_intent.canceled"            => "Cancelled",
            _                                    => payment.Status,
        };

        if (payment.Status == "Succeeded") payment.PaidAt = DateTime.UtcNow;

        await _paymentRepo.UpdateAsync(payment, ct);
        await _paymentRepo.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Stripe webhook {EventType} processed for envelope {EnvelopeId}. New status: {Status}",
            eventType, payment.EnvelopeId, payment.Status);
    }

    public async Task<EnvelopePaymentDto?> GetPaymentAsync(Guid envelopeId, CancellationToken ct = default)
    {
        var p = await _paymentRepo.GetByEnvelopeIdAsync(envelopeId, ct);
        return p is null ? null : new EnvelopePaymentDto(
            p.Id, p.EnvelopeId, p.PaymentIntentId, p.AmountCents, p.Currency, p.Status, p.CreatedAt, p.PaidAt);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static async Task<(string IntentId, string ClientSecret)> CreateStripeIntentAsync(
        string secretKey, long amountCents, string currency, Guid envelopeId, CancellationToken ct)
    {
        // Use raw HTTP to avoid mandatory Stripe.net SDK dependency.
        // Replace with StripeClient if Stripe.net is added.
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", secretKey);

        var form = new FormUrlEncodedContent(
        [
            new KeyValuePair<string, string>("amount",   amountCents.ToString()),
            new KeyValuePair<string, string>("currency", currency.ToLowerInvariant()),
            new KeyValuePair<string, string>("metadata[envelope_id]", envelopeId.ToString()),
            new KeyValuePair<string, string>("automatic_payment_methods[enabled]", "true"),
        ]);

        var response = await http.PostAsync("https://api.stripe.com/v1/payment_intents", form, ct);
        response.EnsureSuccessStatusCode();

        using var doc      = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root           = doc.RootElement;
        var intentId       = root.GetProperty("id").GetString()!;
        var clientSecret   = root.GetProperty("client_secret").GetString()!;
        return (intentId, clientSecret);
    }
}
