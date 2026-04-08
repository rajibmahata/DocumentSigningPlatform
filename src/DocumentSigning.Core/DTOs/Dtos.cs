namespace DocumentSigning.Core.DTOs;

public record InitiateSigningRequest(
    string ClaimantEmail,
    string ClaimantName,
    string DocumentBase64,
    string DocumentContentType);

public record InitiateSigningResponse(
    Guid ClaimId,
    Guid SigningRequestId,
    DateTime ExpiresAt);

public record DocumentPreviewResponse(
    string DocumentBase64,
    string ContentType,
    string ClaimantName,
    DateTime ExpiresAt);

public record SubmitSignatureRequest(
    string SignatureBase64,
    string SignedDate);

public record SigningStatusResponse(
    Guid SigningRequestId,
    string Status,
    DateTime? SignedAt);

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
    string SignedDate);

public record ConfirmationEmailPayload(
    string To,
    string ToName,
    Guid SignedDocumentId);

public record FirmNotificationPayload(
    string FirmEmail,
    Guid ClaimId,
    string ClaimantName);
