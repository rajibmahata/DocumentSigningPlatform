using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Handles identity verification for signers.
/// Stores ID image URL and runs a basic confidence stub.
/// Production: integrate Azure AI Vision / AU10TIX / Onfido.
/// </summary>
public sealed class IdentityVerificationService : IIdentityVerificationService
{
    private readonly IIdentityVerificationRepository _verificationRepo;
    private readonly ISigningRequestRepository       _signingRequestRepo;
    private readonly ILogger<IdentityVerificationService> _logger;

    public IdentityVerificationService(
        IIdentityVerificationRepository verificationRepo,
        ISigningRequestRepository signingRequestRepo,
        ILogger<IdentityVerificationService> logger)
    {
        _verificationRepo   = verificationRepo;
        _signingRequestRepo = signingRequestRepo;
        _logger             = logger;
    }

    public async Task<StartVerificationResult> StartAsync(
        Guid signingRequestId,
        Guid merchantId,
        string signerEmail,
        string documentType,
        string idImageBase64,
        CancellationToken ct = default)
    {
        var signingRequest = await _signingRequestRepo.GetByIdAsync(signingRequestId, ct);
        if (signingRequest is null)
            throw new InvalidOperationException($"SigningRequest {signingRequestId} not found.");

        // Run confidence stub (replace with real OCR/ML call)
        var confidence = EstimateConfidence(idImageBase64);

        // Store base64 as data URI so it is self-contained (switch to blob storage in production)
        var imageUrl = $"data:image/jpeg;base64,{idImageBase64[..Math.Min(50, idImageBase64.Length)]}...";

        var entity = new IdentityVerification
        {
            Id               = Guid.NewGuid(),
            SigningRequestId = signingRequestId,
            MerchantId       = merchantId,
            SignerEmail      = signerEmail.Trim().ToLowerInvariant(),
            DocumentType     = documentType,
            Status           = confidence >= 70 ? "Approved" : "Pending",
            IdImageUrl       = imageUrl,
            ConfidenceScore  = confidence,
            CreatedAt        = DateTime.UtcNow,
            ExpiresAt        = DateTime.UtcNow.AddHours(24),
        };

        await _verificationRepo.AddAsync(entity, ct);
        await _verificationRepo.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Identity verification {VerificationId} started for signer {Email} with confidence {Confidence}.",
            entity.Id, entity.SignerEmail, confidence);

        return new StartVerificationResult(entity.Id, entity.Status);
    }

    public async Task<IdentityVerificationDto?> GetAsync(Guid signingRequestId, CancellationToken ct = default)
    {
        var e = await _verificationRepo.GetBySigningRequestAsync(signingRequestId, ct);
        return e is null ? null : Map(e);
    }

    public async Task ReviewAsync(Guid verificationId, bool approved, string? rejectionReason, CancellationToken ct = default)
    {
        var e = await _verificationRepo.GetByIdAsync(verificationId, ct);
        if (e is null) throw new InvalidOperationException($"IdentityVerification {verificationId} not found.");

        e.Status           = approved ? "Approved" : "Rejected";
        e.RejectionReason  = approved ? null : rejectionReason;
        e.ReviewedAt       = DateTime.UtcNow;

        await _verificationRepo.UpdateAsync(e, ct);
        await _verificationRepo.SaveChangesAsync(ct);
    }

    // ── Stub confidence estimator ─────────────────────────────────────────────
    // Replace with real ML/AI call (Azure AI Vision, AWS Rekognition, etc.)
    private static int EstimateConfidence(string imageBase64)
    {
        if (string.IsNullOrWhiteSpace(imageBase64)) return 0;
        // Deterministic stub: longer/larger images score higher
        return Math.Min(95, 50 + (imageBase64.Length / 1000));
    }

    private static IdentityVerificationDto Map(IdentityVerification e) =>
        new(e.Id, e.SigningRequestId, e.SignerEmail, e.DocumentType, e.Status,
            e.ConfidenceScore, e.RejectionReason, e.CreatedAt, e.ExpiresAt);
}
