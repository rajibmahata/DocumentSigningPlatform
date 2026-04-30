using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Stripe payment intent creation and webhook handling.
/// Requires X-Api-Key for intent creation; webhook endpoint is public (verified by Stripe signature).
/// </summary>
[ApiController]
[Route("api/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _payments;

    public PaymentController(IPaymentService payments) => _payments = payments;

    /// <summary>Creates a Stripe payment intent for an envelope that requires payment before completion.</summary>
    [HttpPost("intent")]
    [RequiresMerchantApiKey]
    [ServiceFilter(typeof(MerchantApiKeyFilter))]
    [ProducesResponseType(typeof(CreatePaymentIntentResult), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateIntent(
        [FromBody] CreatePaymentIntentRequest request,
        CancellationToken ct)
    {
        if (request.AmountCents <= 0) return BadRequest("AmountCents must be positive.");
        if (string.IsNullOrWhiteSpace(request.Currency)) return BadRequest("Currency is required.");

        var merchant = HttpContext.Items["Merchant"] as Core.Entities.Merchant;
        if (merchant is null) return Unauthorized();

        var result = await _payments.CreateIntentAsync(
            request.EnvelopeId, merchant.Id, request.AmountCents, request.Currency, ct);

        return CreatedAtAction(nameof(GetPayment), new { envelopeId = request.EnvelopeId }, result);
    }

    /// <summary>
    /// Stripe webhook endpoint. Stripe sends signed POST events here.
    /// The raw request body must be preserved for signature verification.
    /// </summary>
    [HttpPost("stripe-webhook")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> StripeWebhook(CancellationToken ct)
    {
        string json;
        using (var reader = new System.IO.StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(ct);

        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault() ?? string.Empty;
        await _payments.HandleStripeWebhookAsync(json, signature, ct);
        return Ok();
    }

    /// <summary>Returns the payment record for an envelope.</summary>
    [HttpGet("{envelopeId:guid}")]
    [RequiresMerchantApiKey]
    [ServiceFilter(typeof(MerchantApiKeyFilter))]
    [ProducesResponseType(typeof(EnvelopePaymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPayment(Guid envelopeId, CancellationToken ct)
    {
        var payment = await _payments.GetPaymentAsync(envelopeId, ct);
        return payment is null ? NotFound() : Ok(payment);
    }
}
