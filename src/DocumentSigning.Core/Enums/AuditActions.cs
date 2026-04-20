namespace DocumentSigning.Core.Enums;

/// <summary>
/// String constants for all auditable actions across the platform.
/// Using string constants (not an enum) keeps forward-compatibility with
/// custom actions from integrations without requiring a migration.
/// </summary>
public static class AuditActions
{
    // ── Envelope ──────────────────────────────────────────────────────────────
    public const string EnvelopeCreated   = "Envelope.Created";
    public const string EnvelopeSent      = "Envelope.Sent";
    public const string EnvelopeViewed    = "Envelope.Viewed";
    public const string EnvelopeSigned    = "Envelope.Signed";
    public const string EnvelopeCompleted = "Envelope.Completed";
    public const string EnvelopeCancelled = "Envelope.Cancelled";
    public const string EnvelopeRejected  = "Envelope.Rejected";
    public const string EnvelopeFailed    = "Envelope.Failed";
    public const string EnvelopeExpired   = "Envelope.Expired";

    // ── Document ──────────────────────────────────────────────────────────────
    public const string DocumentUploaded      = "Document.Uploaded";
    public const string DocumentStamped       = "Document.Stamped";
    public const string DocumentDownloaded    = "Document.Downloaded";
    public const string SignatureSubmitted    = "Document.SignatureSubmitted";

    // ── User ──────────────────────────────────────────────────────────────────
    public const string UserRegistered    = "User.Registered";
    public const string UserLoggedIn      = "User.LoggedIn";
    public const string UserLoginFailed   = "User.LoginFailed";
    public const string EmailVerified     = "User.EmailVerified";
    public const string PasswordResetRequested = "User.PasswordResetRequested";
    public const string PasswordReset     = "User.PasswordReset";
    public const string UserUpdated       = "User.Updated";
    public const string UserActivated     = "User.Activated";
    public const string UserDeactivated   = "User.Deactivated";
    public const string UserLoginBlocked  = "User.LoginBlocked";

    // ── Merchant ──────────────────────────────────────────────────────────────
    public const string MerchantCreated      = "Merchant.Created";
    public const string MerchantUpdated      = "Merchant.Updated";
    public const string MerchantApiKeyRegen  = "Merchant.ApiKeyRegenerated";
    public const string MerchantLimitUpdated = "Merchant.LimitUpdated";

    // ── Tickets ───────────────────────────────────────────────────────────────
    public const string TicketCreated  = "Ticket.Created";
    public const string TicketUpdated  = "Ticket.Updated";
    public const string TicketReplied  = "Ticket.Replied";
    public const string TicketClosed   = "Ticket.Closed";
    public const string TicketResolved = "Ticket.Resolved";

    // ── Portal ────────────────────────────────────────────────────────────────
    public const string PortalOpened  = "Portal.Opened";

    // ── Invitation ────────────────────────────────────────────────────────────
    public const string InvitationResent = "Invitation.Resent";
}
