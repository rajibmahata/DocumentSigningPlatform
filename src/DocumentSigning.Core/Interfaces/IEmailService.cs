namespace DocumentSigning.Core.Interfaces;

public interface IEmailService
{
    Task SendSigningInvitationAsync(
        string toEmail,
        string toName,
        string signingLink,
        DateTime expiresAt,
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
}
