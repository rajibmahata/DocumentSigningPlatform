namespace DocumentSigning.Core.DTOs;

// ── Envelope / multi-signer initiate ─────────────────────────────────────────

public record DocumentInput(
    string DocumentTitle,
    string DocumentFileName,
    string DocumentBase64,             // base64-encoded file bytes
    string? DocumentContentType);      // pdf | doc | docx (optional; inferred from filename if omitted)

public record SignerInput(
    string Name,
    string Email,
    string Role,
    int Order,
    string Message);

public record InitiateEnvelopeRequest(
    string Title,
    Guid MerchantId,
    List<DocumentInput> Documents,
    List<SignerInput> Signers);

public record DocumentSummary(
    Guid DocumentId,
    string DocumentTitle);

public record SignerSummary(
    string Name,
    string Role,
    string Email,
    string Status);

public record SignerSignedSummary(
    string Name,
    string Role,
    string Email,
    string Status,
    string? SignedDocumentBase64,
    string? SignedDocumentType);

public record EnvelopeSignedResponse(
    Guid EnvelopeId,
    string Title,
    string Status,
    DateTime SentDate,
    List<DocumentSummary> Documents,
    List<SignerSignedSummary> Signers);

public record InitiateEnvelopeResponse(
    Guid EnvelopeId,
    string Title,
    string Status,
    DateTime SentDate,
    List<DocumentSummary> Documents,
    List<SignerSummary> Signers);

// ── Merchant ──────────────────────────────────────────────────────────────────

public record CreateMerchantRequest(
    string Name,
    string Email,
    int RequestLimit);

public record MerchantResponse(
    Guid Id,
    string Name,
    string Email,
    string ApiKey,
    bool IsActive,
    int RequestLimit,
    int RequestUsed,
    DateTime SubscriptionStart,
    DateTime? SubscriptionEnd,
    DateTime CreatedAt);

// ── Portal / signing flow ─────────────────────────────────────────────────────

public record DocumentPreviewResponse(
    string DocumentBase64,
    string ContentType,
    string ClaimantName,
    DateTime ExpiresAt);

public record SubmitSignatureRequest(
    string SignatureBase64,
    string SignedDate);

// ── Outbox payloads ───────────────────────────────────────────────────────────

public record SendEmailPayload(
    string To,
    string ToName,
    string SigningLink,
    DateTime ExpiresAt,
    string EmailType);

public record StampPdfPayload(
    Guid DocumentId,
    Guid SigningRequestId,
    Guid ClaimId,
    string SignatureBase64,
    string SignedDate,
    Guid? EnvelopeId = null,
    Guid? SignerId   = null);

public record ConfirmationEmailPayload(
    string To,
    string ToName,
    Guid SignedDocumentId);

public record FirmNotificationPayload(
    string FirmEmail,
    Guid ClaimId,
    string ClaimantName);
