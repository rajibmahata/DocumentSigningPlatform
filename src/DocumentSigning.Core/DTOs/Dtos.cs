using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.DTOs;

// ── Generic paging ────────────────────────────────────────────────────────────

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

// ── Audit log ─────────────────────────────────────────────────────────────────

public record AuditLogResponse(
    Guid     Id,
    string   Action,
    string   EntityType,
    Guid?    EntityId,
    Guid?    UserId,
    Guid?    MerchantId,
    string   Status,
    string   Description,
    string   IpAddress,
    string   UserAgent,
    string?  Metadata,
    DateTime Timestamp);

public record AuditLogQueryParams(
    string?   Action     = null,
    string?   EntityType = null,
    Guid?     EntityId   = null,
    Guid?     UserId     = null,
    Guid?     MerchantId = null,
    string?   Status     = null,
    DateTime? From       = null,
    DateTime? To         = null,
    int       Page       = 1,
    int       PageSize   = 50);

// ── Analytics ─────────────────────────────────────────────────────────────────

public record DailyCount(string Date, int Count);

public record AnalyticsSummaryResponse(
    int TotalUsers,
    int TotalEnvelopesSent,
    int TotalEnvelopesSigned,
    int TotalEnvelopesCancelled,
    int TotalDocumentsSigned,
    // Ticket breakdown
    int TotalTickets,
    int OpenTickets,
    int InProgressTickets,
    int ResolvedTickets,
    int ClosedTickets);

public record AnalyticsTrendResponse(
    List<DailyCount> UserRegistrations,
    List<DailyCount> EnvelopesSent,
    List<DailyCount> DocumentsSigned,
    List<DailyCount> TicketsCreated);

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
    string Status,
    string? RejectionReason = null);

public record SignerSignedSummary(
    string Name,
    string Role,
    string Email,
    string Status,
    string? SignedDocumentBase64,
    string? SignedDocumentType,
    string? RejectionReason = null,
    DateTime? ExpiresAt = null,
    DateTime? SignedAt = null,
    string? Message = null,
    int Order = 0);

public record EnvelopeSignedResponse(
    Guid EnvelopeId,
    string Title,
    string Status,
    DateTime SentDate,
    List<DocumentSummary> Documents,
    List<SignerSignedSummary> Signers);

public record ResendInvitationRequest(string SignerEmail);

public record InitiateEnvelopeResponse(
    Guid EnvelopeId,
    string Title,
    string Status,
    DateTime SentDate,
    List<DocumentSummary> Documents,
    List<SignerSummary> Signers);

// ── Merchant ──────────────────────────────────────────────────────────────────

public record CreateMerchantRequest(
    Guid UserId,
    string Name,
    string? Description,
    int RequestLimit = 100);

public record MerchantResponse(
    Guid Id,
    Guid UserId,
    string Name,
    string? Description,
    string ApiKey,
    bool IsActive,
    int RequestLimit,
    int RequestUsed,
    DateTime SubscriptionStart,
    DateTime? SubscriptionEnd,
    DateTime CreatedAt);

// ── Portal / signing flow ─────────────────────────────────────────────────────

public record PlatformStatsResponse(
    int DocumentsSent,
    int DocumentsSigned);

public record DocumentPreviewResponse(
    string DocumentBase64,
    string ContentType,
    string ClaimantName,
    string DocumentFileName,
    DateTime ExpiresAt);

public record SubmitSignatureRequest(
    string SignatureBase64);

public record RejectSignatureRequest(
    string? Reason = null);

// ── Signer "my envelopes" ─────────────────────────────────────────────────────

public record MyEnvelopeDocumentSummary(
    string DocumentTitle,
    string DocumentFileName);

public record MyEnvelopeResponse(
    Guid   EnvelopeId,
    string Title,
    string Status,
    DateTime CreatedAt,
    string CreatedByName,        // Merchant / firm name
    string SignerRole,
    string SigningToken,
    DateTime ExpiresAt,
    List<MyEnvelopeDocumentSummary> Documents);

// ── Outbox payloads ───────────────────────────────────────────────────────────

public record SendEmailPayload(
    string To,
    string ToName,
    string SigningLink,
    DateTime ExpiresAt,
    string EmailType,
    string EnvelopeTitle = "",
    string SenderName    = "");

public record StampPdfPayload(
    Guid DocumentId,
    Guid SigningRequestId,
    Guid ClaimId,
    string SignatureBase64,
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

public record VerificationEmailPayload(
    string To,
    string ToName,
    string VerificationLink);

public record PasswordResetEmailPayload(
    string To,
    string ToName,
    string ResetLink);

public record MerchantSignedDocPayload(
    string To,
    string ToName,
    string SignerName,
    string EnvelopeTitle,
    Guid SignedDocumentId);

public record AccountPendingApprovalPayload(
    string To,
    string ToName);

// ── Auth ──────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    string Name,
    string Email,
    string Password,
    string? Country,
    AccessRole? AccessRole = null);

public record LoginRequest(
    string Email,
    string Password);

public record LoginResponse(
    string Token,
    bool IsEmailVerified);

public record ForgotPasswordRequest(
    string Email);

public record ResetPasswordRequest(
    string Token,
    string NewPassword);

// ── User management ───────────────────────────────────────────────────────────

public record UserResponse(
    Guid Id,
    string Name,
    string Email,
    string? Country,
    bool IsEmailVerified,
    bool IsActive,
    DocumentSigning.Core.Enums.AccessRole AccessRole,
    DateTime CreatedAt);

public record UpdateUserRequest(
    string? Name,
    DocumentSigning.Core.Enums.AccessRole? AccessRole);

public record UpdateMerchantRequest(
    string? Name,
    string? Description,
    bool IsActive,
    int RequestLimit,
    DateTime? SubscriptionEnd);

// ── Tickets ───────────────────────────────────────────────────────────────────

public record CreateTicketRequest(
    string Title,
    string Description,
    string Type,           // Bug | Feedback | FeatureRequest
    string? AttachmentBase64      = null,
    string? AttachmentContentType = null);

public record AddTicketMessageRequest(
    string Message);

public record UpdateTicketStatusRequest(
    string Status,
    string? Priority);

public record TicketMessageResponse(
    Guid     Id,
    string   SenderType,
    string   Message,
    DateTime CreatedAt);

public record TicketResponse(
    Guid     Id,
    Guid     UserId,
    string   UserName,
    string   UserEmail,
    Guid?    MerchantId,
    string   Title,
    string   Description,
    string   Type,
    string   Status,
    string?  Priority,
    string?  AttachmentBase64,
    string?  AttachmentContentType,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<TicketMessageResponse> Messages);

public record TicketSummary(
    Guid     Id,
    string   UserName,
    string   UserEmail,
    string   Title,
    string   Type,
    string   Status,
    string?  Priority,
    int      MessageCount,
    bool     HasAttachment,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

// ── Webhooks ──────────────────────────────────────────────────────────────────

public record CreateWebhookRequest(
    Guid         MerchantId,
    string       Url,
    List<string> Events);

public record WebhookResponse(
    Guid         Id,
    Guid         MerchantId,
    string       Url,
    string       Secret,
    bool         IsActive,
    List<string> Events,
    DateTime     CreatedAt);

public record WebhookDeliveryResponse(
    Guid      Id,
    Guid      WebhookId,
    string    EventName,
    string    Status,
    int       RetryCount,
    string?   Response,
    DateTime? LastAttempt,
    DateTime  NextAttempt,
    DateTime  CreatedAt);

// ── Signer Contacts ───────────────────────────────────────────────────────────

public record SignerContactResponse(
    Guid     Id,
    Guid     UserId,
    string   Name,
    string   Email,
    string   Role,
    string?  Phone,
    string?  Company,
    bool     IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateSignerContactRequest(
    string   Name,
    string   Email,
    string   Role    = "signer",
    string?  Phone   = null,
    string?  Company = null);

public record UpdateSignerContactRequest(
    string   Name,
    string   Email,
    string   Role,
    string?  Phone,
    string?  Company,
    bool     IsActive);

public record SignerContactImportResult(
    int Imported,
    int Skipped,
    int Failed,
    List<string> Errors);
