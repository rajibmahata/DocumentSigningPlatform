namespace DocumentSigning.Core.Interfaces;

public interface IEmailService
{
    Task SendSigningInvitationAsync(
        string toEmail,
        string toName,
        string signingLink,
        DateTime expiresAt,
        string envelopeTitle = "",
        string senderName    = "",
        CancellationToken ct = default);

    Task SendConfirmationToClaimantAsync(
        string toEmail,
        string toName,
        byte[] signedDocBytes,
        string contentType,
        CancellationToken ct = default);

    Task SendFirmNotificationAsync(
        string firmEmail,
        Guid claimId,
        string claimantName,
        CancellationToken ct = default);

    Task SendAdminAlertAsync(
        string message,
        CancellationToken ct = default);

    Task SendEmailVerificationAsync(
        string toEmail,
        string toName,
        string verificationLink,
        CancellationToken ct = default);

    Task SendPasswordResetAsync(
        string toEmail,
        string toName,
        string resetLink,
        CancellationToken ct = default);

    Task SendMerchantSignedDocAsync(
        string toEmail,
        string toName,
        string signerName,
        string envelopeTitle,
        byte[] signedDocBytes,
        string contentType,
        CancellationToken ct = default);
}
