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
        string envelopeTitle = "", string senderName = "",
        CancellationToken ct = default)
    {
        var docLabel    = string.IsNullOrWhiteSpace(envelopeTitle) ? "a document" : $"\"{envelopeTitle}\"";
        var senderLabel = string.IsNullOrWhiteSpace(senderName)    ? "Someone"    : senderName;

        var subject = string.IsNullOrWhiteSpace(envelopeTitle)
            ? $"{senderLabel} has requested your signature"
            : $"{senderLabel} has requested your signature on \"{envelopeTitle}\"";

        var plainBody = $"""
            Dear {toName},

            {senderLabel} has requested your electronic signature on {docLabel}.

            Sign here: {signingLink}

            This link will expire on {expiresAt:f} UTC.

            If you were not expecting this request, please disregard this email.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Signature Request</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#1a56db 0%,#0e3fa6 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#c7d9ff;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">Signature Requested</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                            <strong style="color:#1a56db;">{senderLabel}</strong> has requested your
                            electronic signature on the following document:
                          </p>

                          <!-- Document card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#f0f5ff;border:1px solid #c7d9ff;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <p style="margin:0;font-size:12px;font-weight:600;color:#6b7280;
                                          text-transform:uppercase;letter-spacing:1px;">Document</p>
                                <p style="margin:4px 0 0;font-size:17px;font-weight:700;
                                          color:#1e3a8a;">{(string.IsNullOrWhiteSpace(envelopeTitle) ? "Document for review" : envelopeTitle)}</p>
                              </td>
                            </tr>
                          </table>

                          <!-- CTA Button -->
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                            <tr>
                              <td align="center">
                                <a href="{signingLink}"
                                   style="display:inline-block;background:linear-gradient(135deg,#1a56db,#0e3fa6);
                                          color:#ffffff;font-size:16px;font-weight:600;
                                          text-decoration:none;padding:16px 48px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  Review &amp; Sign Document
                                </a>
                              </td>
                            </tr>
                          </table>

                          <!-- Expiry notice -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fffbeb;border:1px solid #fde68a;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:14px 20px;">
                                <p style="margin:0;font-size:13px;color:#92400e;">
                                  ⏰ &nbsp;This signing link expires on
                                  <strong>{expiresAt:dddd, MMMM d, yyyy} at {expiresAt:HH:mm} UTC</strong>.
                                </p>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you were not expecting this request, you can safely ignore this email.
                            The document will not be signed unless you click the button above.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                                   padding:24px 48px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#9ca3af;">
                            Sent securely by <strong style="color:#6b7280;">Document Signing Platform</strong>
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, ct: ct);
    }

    public async Task SendConfirmationToClaimantAsync(
        string toEmail, string toName, byte[] signedDocBytes, string contentType,
        CancellationToken ct = default)
    {
        var subject = $"Your signed document is ready, {toName}";

        var now = DateTime.UtcNow;

        var plainBody = $"""
            Dear {toName},

            Thank you for signing! Your signed document is attached to this email.

            Signed on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            Please keep this for your records.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Your Signed Document</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#ddd6fe;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">&#9997;&nbsp; Signing Complete</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            Thank you for completing your electronic signature.
                            Your signed document is attached to this email — please save it for your records.
                          </p>

                          <!-- Signed-on card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#f5f3ff;border:1px solid #ddd6fe;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Signed by</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                color:#4c1d95;">{toName}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #ddd6fe;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Date &amp; Time</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Attachment notice -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#eff6ff;border:1px solid #bfdbfe;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:14px 20px;">
                                <p style="margin:0;font-size:13px;color:#1e40af;">
                                  &#128206;&nbsp; Your signed document is attached. Keep it safe as your official record.
                                </p>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you have any questions, please contact the party who sent you the document.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                                   padding:24px 48px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#9ca3af;">
                            Sent securely by <strong style="color:#6b7280;">Document Signing Platform</strong>
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        var extension = contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf"
            : contentType.Contains("msword", StringComparison.OrdinalIgnoreCase) ? "doc"
            : "docx";
        var attachment = new AttachmentDefinition($"signed-document.{extension}", signedDocBytes, contentType);

        await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, attachment, ct);
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

    public async Task SendEmailVerificationAsync(
        string toEmail, string toName, string verificationLink,
        CancellationToken ct = default)
    {
        var subject = "Verify your email address";
        var body = $"""
            Dear {toName},

            Thank you for registering. Please verify your email address by clicking the link below:
            {verificationLink}

            This link will expire in 24 hours.

            If you did not register, please ignore this email.

            Regards,
            Document Signing Platform
            """;

        await SendAsync(toEmail, toName, subject, body, ct: ct);
    }

    public async Task SendPasswordResetAsync(
        string toEmail, string toName, string resetLink,
        CancellationToken ct = default)
    {
        var subject = "Reset your password";
        var body = $"""
            Dear {toName},

            We received a request to reset your password. Click the link below to set a new password:
            {resetLink}

            This link will expire in 1 hour. If you did not request a password reset, please ignore this email.

            Regards,
            Document Signing Platform
            """;

        await SendAsync(toEmail, toName, subject, body, ct: ct);
    }

    public async Task SendMerchantSignedDocAsync(
        string toEmail, string toName, string signerName, string envelopeTitle,
        byte[] signedDocBytes, string contentType,
        CancellationToken ct = default)
    {
        var subject = $"\"{envelopeTitle}\" has been signed by {signerName}";

        var plainBody = $"""
            Dear {toName},

            Great news! {signerName} has completed their electronic signature on "{envelopeTitle}".

            The signed document is attached to this email for your records.

            Regards,
            Document Signing Platform
            """;

        var now = DateTime.UtcNow;
        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Document Signed</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#a7f3d0;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">&#10003;&nbsp; Document Signed</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                            <strong style="color:#059669;">{signerName}</strong> has completed their
                            electronic signature. The signed document is attached to this email.
                          </p>

                          <!-- Summary card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#f0fdf4;border:1px solid #bbf7d0;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Document</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                color:#065f46;">{envelopeTitle}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #d1fae5;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Signed by</p>
                                      <p style="margin:4px 0 0;font-size:15px;font-weight:600;
                                                color:#047857;">{signerName}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #d1fae5;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Signed on</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Attachment notice -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#eff6ff;border:1px solid #bfdbfe;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:14px 20px;">
                                <p style="margin:0;font-size:13px;color:#1e40af;">
                                  &#128206;&nbsp; The signed document is attached to this email.
                                  Please save it for your records.
                                </p>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            This is an automated notification from Document Signing Platform.
                          </p>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background:#f9fafb;border-top:1px solid #e5e7eb;
                                   padding:24px 48px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#9ca3af;">
                            Sent securely by <strong style="color:#6b7280;">Document Signing Platform</strong>
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        var extension = contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) ? "pdf"
            : contentType.Contains("msword", StringComparison.OrdinalIgnoreCase) ? "doc"
            : "docx";
        var safeTitle = string.Concat(envelopeTitle.Split(Path.GetInvalidFileNameChars()));
        var attachment = new AttachmentDefinition($"signed-{safeTitle}.{extension}", signedDocBytes, contentType);

        await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, attachment, ct);
    }

    // ─── Internal helper ─────────────────────────────────────────────────────────

    private async Task SendHtmlAsync(
        string toEmail, string toName, string subject,
        string textBody, string htmlBody,
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

        var builder = new BodyBuilder { TextBody = textBody, HtmlBody = htmlBody };

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
