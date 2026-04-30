namespace DocumentSigning.Core.DTOs;

// ── Feature Flags ─────────────────────────────────────────────────────────────

public record FeatureFlagDto(string FeatureKey, bool IsEnabled, DateTime? UpdatedAt);

public record SetFeatureFlagRequest(string FeatureKey, bool IsEnabled);

// ── AI Insight ────────────────────────────────────────────────────────────────

public record DocumentInsightDto(
    Guid Id,
    Guid DocumentId,
    string Summary,
    IReadOnlyList<string> Risks,
    string Status,
    DateTime CreatedAt,
    DateTime? CompletedAt);

// ── OCR Auto-Fields ───────────────────────────────────────────────────────────

public record DocumentFieldDto(
    Guid Id,
    Guid DocumentId,
    string FieldType,
    int PageNumber,
    float X,
    float Y,
    float Width,
    float Height,
    float Confidence);

// ── Bulk Send ─────────────────────────────────────────────────────────────────

/// <summary>
/// POST /api/envelopes/bulk
/// templateDocumentBase64 is the base-64 document that contains merge tags like {{Name}}, {{Company}}.
/// </summary>
public record BulkSendRequest(
    Guid MerchantId,
    string EnvelopeTitleTemplate,
    string TemplateDocumentBase64,
    string TemplateDocumentFileName,
    string TemplateDocumentContentType,
    string SignerRole,
    string SignerMessage,
    /// <summary>CSV content: columns Name,Email,Company (+ any merge-tag columns)</summary>
    string CsvContent,
    int? TokenTtlDays = null,
    string? RedirectUrl = null);

public record BulkSendBatchResult(
    Guid BatchId,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    IReadOnlyList<BulkSendRowError> RowErrors);

public record BulkSendRowError(int Row, string Email, string Reason);

public record BulkSendBatchStatus(
    Guid BatchId,
    int Total,
    int Pending,
    int Processing,
    int Sent,
    int Failed);

// ── Payment ───────────────────────────────────────────────────────────────────

public record CreatePaymentIntentRequest(
    Guid EnvelopeId,
    long AmountCents,
    string Currency = "usd");

public record CreatePaymentIntentResult(
    Guid PaymentId,
    string ClientSecret,
    string Status);

public record EnvelopePaymentDto(
    Guid Id,
    Guid EnvelopeId,
    string PaymentIntentId,
    long AmountCents,
    string Currency,
    string Status,
    DateTime CreatedAt,
    DateTime? PaidAt);

// ── Identity Verification ─────────────────────────────────────────────────────

public record StartVerificationRequest(
    Guid SigningRequestId,
    /// <summary>Passport | License | NationalId</summary>
    string DocumentType,
    /// <summary>Base64 encoded image of the ID document.</summary>
    string IdImageBase64);

public record StartVerificationResult(Guid VerificationId, string Status);

public record IdentityVerificationDto(
    Guid Id,
    Guid SigningRequestId,
    string SignerEmail,
    string DocumentType,
    string Status,
    int? ConfidenceScore,
    string? RejectionReason,
    DateTime CreatedAt,
    DateTime ExpiresAt);

public record ReviewVerificationRequest(bool Approved, string? RejectionReason = null);

// ── Branding / White-Label ────────────────────────────────────────────────────

public record MerchantBrandingDto(
    Guid MerchantId,
    string? CustomDomain,
    string? LogoUrl,
    string? PrimaryColor,
    string? EmailFromName,
    string? PortalFooterText,
    DateTime? UpdatedAt);

public record UpsertBrandingRequest(
    string? CustomDomain,
    string? LogoUrl,
    string? PrimaryColor,
    string? EmailFromName,
    string? PortalFooterText);

// ── Blockchain ────────────────────────────────────────────────────────────────

public record BlockchainRecordDto(
    Guid Id,
    Guid EnvelopeId,
    string DocumentHash,
    string Network,
    string? TransactionHash,
    string Status,
    DateTime CreatedAt,
    DateTime? ConfirmedAt);

// ── In-Person Signing ─────────────────────────────────────────────────────────

public record StartInPersonSessionRequest(
    /// <summary>The signing token for the signer (from invitation email).</summary>
    string SigningToken);

public record InPersonSessionResponse(
    string SessionId,
    string SigningToken,
    DateTime ExpiresAt);
