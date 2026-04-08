using DocumentSigning.Core.Interfaces;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace DocumentSigning.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendSigningInvitationAsync(
        string toEmail, string toName, string signingLink, DateTime expiresAt,
        CancellationToken ct = default)
    {
        var subject = "Action Required: Please sign your document";
        var body = $"""
            Dear {toName},

            You have been requested to electronically sign a document.

            Please click the link below to review and sign:
            {signingLink}

            This link will expire on {expiresAt:f} UTC.

            If you did not expect this email, please disregard it.

            Regards,
            Document Signing Platform
            """;

        await SendAsync(toEmail, toName, subject, body, ct: ct);
    }

    public async Task SendConfirmationToClaimantAsync(
        string toEmail, string toName, byte[] signedDocBytes, string contentType,
        CancellationToken ct = default)
    {
        var subject = "Your signed document";
        var body = $"Dear {toName},\n\nPlease find your signed document attached.\n\nRegards,\nDocument Signing Platform";
        var extension = contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf"
            : contentType.Contains("msword", StringComparison.OrdinalIgnoreCase) ? "doc"
            : "docx";
        var attachment = new AttachmentDefinition($"signed-document.{extension}", signedDocBytes, contentType);

        await SendAsync(toEmail, toName, subject, body, attachment, ct);
    }

    public async Task SendFirmNotificationAsync(
        string firmEmail, Guid claimId, string claimantName,
        CancellationToken ct = default)
    {
        var subject = $"Document signed — Claim {claimId}";
        var body = $"Claim {claimId} has been signed by {claimantName}.";
        await SendAsync(firmEmail, "Firm", subject, body, ct: ct);
    }

    public async Task SendAdminAlertAsync(string message, CancellationToken ct = default)
    {
        var adminEmail = _config["Email:AdminAddress"] ?? "admin@localhost";
        await SendAsync(adminEmail, "Admin", "Platform Alert", message, ct: ct);
    }

    // ─── Internal helper ─────────────────────────────────────────────────────────

    private async Task SendAsync(
        string toEmail, string toName, string subject, string body,
        AttachmentDefinition? attachment = null,
        CancellationToken ct = default)
    {
        var fromName = _config["Email:FromName"] ?? "Document Signing Platform";
        var fromAddr = _config["Email:FromAddress"]
            ?? throw new InvalidOperationException("Email:FromAddress is not configured.");
        var host = _config["Email:SmtpHost"]
            ?? throw new InvalidOperationException("Email:SmtpHost is not configured.");
        var port = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var user = _config["Email:SmtpUser"];
        var pass = _config["Email:SmtpPass"];

        // Determine correct socket options:
        // port 465 → implicit SSL; port 587 → STARTTLS; anything else → auto-detect
        var socketOptions = port switch
        {
            465 => MailKit.Security.SecureSocketOptions.SslOnConnect,
            587 => MailKit.Security.SecureSocketOptions.StartTls,
            _   => MailKit.Security.SecureSocketOptions.Auto
        };

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddr));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;

        var builder = new BodyBuilder { TextBody = body };

        if (attachment is not null)
        {
            builder.Attachments.Add(attachment.FileName, attachment.Data,
                ContentType.Parse(attachment.ContentType));
        }

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, socketOptions, ct);

        if (!string.IsNullOrEmpty(user))
            await client.AuthenticateAsync(user, pass, ct);

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(quit: true, ct);

        _logger.LogInformation("Email sent to {To} — Subject: {Subject}", toEmail, subject);
    }

    private record AttachmentDefinition(string FileName, byte[] Data, string ContentType);
}
