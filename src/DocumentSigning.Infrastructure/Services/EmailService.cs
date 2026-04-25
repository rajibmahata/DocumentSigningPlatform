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
        string envelopeTitle = "", string senderName = "", string confirmUrl = "",
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

            {(string.IsNullOrWhiteSpace(confirmUrl) ? "" : $"Step 1 — Confirm & Agree: {confirmUrl}\n\n")}Step {(string.IsNullOrWhiteSpace(confirmUrl) ? "1" : "2")} — Sign here: {signingLink}

            This link will expire on {expiresAt:f} UTC.

            If you were not expecting this request, please disregard this email.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = BuildSigningInvitationHtml(toName, senderLabel, envelopeTitle, signingLink, confirmUrl, expiresAt);

        if (!string.IsNullOrWhiteSpace(confirmUrl))
        {
            // Build full AMP + HTML + plain multi-MIME email
            await SendAmpEmailAsync(toEmail, toName, subject, plainBody, htmlBody,
                BuildAmpPart(toName, senderLabel, envelopeTitle, signingLink, confirmUrl, expiresAt), ct);
        }
        else
        {
            await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, ct: ct);
        }
    }

    private string BuildSigningInvitationHtml(
        string toName, string senderLabel, string envelopeTitle,
        string signingLink, string confirmUrl, DateTime expiresAt)
    {
        var docTitle  = string.IsNullOrWhiteSpace(envelopeTitle) ? "Document for review" : envelopeTitle;
        var hasConfirm = !string.IsNullOrWhiteSpace(confirmUrl);

        var confirmSection = hasConfirm ? $"""
                          <!-- Step 1: Confirm & Agree -->
                          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;">
                            Step 1 &mdash; Confirm you have read and agree to sign
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                            <tr>
                              <td align="center">
                                <a href="{confirmUrl}"
                                   style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);
                                          color:#ffffff;font-size:15px;font-weight:600;
                                          text-decoration:none;padding:14px 36px;
                                          border-radius:8px;letter-spacing:0.3px;">
                                  &#10003;&nbsp; Confirm &amp; Agree
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#374151;">
                            Step 2 &mdash; Sign the document
                          </p>
            """ : "";

        return $"""
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
                                          color:#1e3a8a;">{docTitle}</p>
                              </td>
                            </tr>
                          </table>

                          {confirmSection}

                          <!-- CTA: Sign Document -->
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
                                  &#9200;&nbsp;This signing link expires on
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
    }

    private static string BuildAmpPart(
        string toName, string senderLabel, string envelopeTitle,
        string signingLink, string confirmUrl, DateTime expiresAt)
    {
        var docTitle = string.IsNullOrWhiteSpace(envelopeTitle) ? "Document for review" : envelopeTitle;

        // Mustache templates must be raw literals — no C# interpolation — so that
        // {{message}} is preserved literally in the output (not interpreted as a C# hole).
        var ampMustacheSuccess = """
            <template type="amp-mustache">
              <div class="success-box" submit-success><p>&#10003; {{message}}</p></div>
            </template>
            """;

        return $$"""
            <!doctype html>
            <html ⚡4email data-css-strict>
            <head>
              <meta charset="utf-8">
              <script async src="https://cdn.ampproject.org/v0.js"></script>
              <script async custom-element="amp-form"
                      src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
              <style amp4email-boilerplate>body{visibility:hidden}</style>
              <style amp-custom>
                body { margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif; }
                .card { background:#fff;border-radius:12px;max-width:600px;margin:32px auto;overflow:hidden;
                        box-shadow:0 4px 24px rgba(0,0,0,0.08); }
                .header { background:linear-gradient(135deg,#1a56db 0%,#0e3fa6 100%);
                          padding:36px 48px;text-align:center; }
                .header h1 { margin:12px 0 0;font-size:26px;font-weight:700;color:#fff; }
                .header p  { margin:0;font-size:13px;color:#c7d9ff;letter-spacing:1.5px;text-transform:uppercase; }
                .body  { padding:40px 48px; }
                .doc-card { background:#f0f5ff;border:1px solid #c7d9ff;border-radius:8px;padding:20px 24px;margin-bottom:28px; }
                .doc-card .label { font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px; }
                .doc-card .title { font-size:17px;font-weight:700;color:#1e3a8a;margin-top:4px; }
                .step-label { font-size:14px;font-weight:700;color:#374151;margin:0 0 12px; }
                .btn-confirm { display:block;background:linear-gradient(135deg,#059669,#047857);
                               color:#fff;font-size:15px;font-weight:600;text-decoration:none;
                               padding:14px 36px;border-radius:8px;text-align:center;
                               border:none;cursor:pointer;width:100%;box-sizing:border-box; }
                .btn-sign { display:block;background:linear-gradient(135deg,#1a56db,#0e3fa6);
                            color:#fff;font-size:16px;font-weight:600;text-decoration:none;
                            padding:16px 48px;border-radius:8px;text-align:center;margin:16px auto 0; }
                .expiry { background:#fffbeb;border:1px solid #fde68a;border-radius:8px;
                          padding:14px 20px;margin:20px 0; }
                .expiry p { margin:0;font-size:13px;color:#92400e; }
                .footer { background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 48px;text-align:center; }
                .footer p { margin:0;font-size:12px;color:#9ca3af; }
                [hidden] { display:none !important; }
                .success-box { background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;
                               padding:16px 20px;margin-bottom:20px;text-align:center; }
                .success-box p { margin:0;font-size:14px;color:#065f46;font-weight:600; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <p>Document Signing Platform</p>
                  <h1>Signature Requested</h1>
                </div>
                <div class="body">
                  <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                  <p style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;">{{toName}}</p>
                  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                    <strong style="color:#1a56db;">{{senderLabel}}</strong> has requested your electronic signature on:
                  </p>
                  <div class="doc-card">
                    <div class="label">Document</div>
                    <div class="title">{{docTitle}}</div>
                  </div>

                  <!-- Step 1: AMP Confirm form -->
                  <amp-form method="POST" action-xhr="{{confirmUrl}}"
                            on="submit-success:confirm-panel.hide,confirmed-panel.show;submit-error:error-panel.show">

                    <div id="confirm-panel">
                      <p class="step-label">Step 1 &mdash; Confirm you have read and agree to sign</p>
                      <button class="btn-confirm" type="submit">&#10003;&nbsp; Confirm &amp; Agree</button>
                      {{ampMustacheSuccess}}
                    </div>

                    <div id="error-panel" hidden>
                      <p style="color:#dc2626;font-size:13px;">Unable to confirm. Please try again or use the link below.</p>
                    </div>

                    <div id="confirmed-panel" hidden>
                      <div class="success-box"><p>&#10003; Confirmed! You may now sign the document.</p></div>
                    </div>

                  </amp-form>

                  <!-- Step 2: Sign -->
                  <p class="step-label" style="margin-top:20px;">Step 2 &mdash; Sign the document</p>
                  <a href="{{signingLink}}" class="btn-sign">Review &amp; Sign Document</a>

                  <div class="expiry">
                    <p>&#9200;&nbsp;This link expires on <strong>{{expiresAt:dddd, MMMM d, yyyy}} at {{expiresAt:HH:mm}} UTC</strong>.</p>
                  </div>
                </div>
                <div class="footer">
                  <p>Sent securely by <strong>Document Signing Platform</strong></p>
                </div>
              </div>
            </body>
            </html>
            """;
    }

    private async Task SendAmpEmailAsync(
        string toEmail, string toName, string subject,
        string textBody, string htmlBody, string ampBody,
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

        // RFC 1341 multipart/alternative: last part = highest priority.
        // AMP clients pick text/x-amp-html; HTML clients pick text/html; others get text/plain.
        var alternative = new Multipart("alternative");

        alternative.Add(new TextPart("plain")
        {
            Text = textBody
        });

        alternative.Add(new TextPart("x-amp-html")
        {
            Text = ampBody,
            ContentType = { Charset = "utf-8" }
        });

        alternative.Add(new TextPart("html")
        {
            Text = htmlBody,
            ContentType = { Charset = "utf-8" }
        });

        message.Body = alternative;

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, socketOptions, ct);

        if (!string.IsNullOrEmpty(user))
            await client.AuthenticateAsync(user, pass, ct);

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(quit: true, ct);

        _logger.LogInformation("AMP email sent to {To} — Subject: {Subject}", toEmail, subject);
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

    // ─── Cancellation emails ──────────────────────────────────────────────────────

    public async Task SendEnvelopeCancelledToSignerAsync(
        string toEmail, string toName, string envelopeTitle, string merchantName,
        CancellationToken ct = default)
    {
        var subject   = $"Signing request cancelled — \"{envelopeTitle}\"";
        var now       = DateTime.UtcNow;
        var plainBody = $"""
            Dear {toName},

            The signing request for "{envelopeTitle}" sent by {merchantName} has been cancelled.
            No action is required on your part.

            Cancelled on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            If you have questions, please contact {merchantName} directly.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Signing Request Cancelled</title>
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
                        <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fef3c7;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">🚫&nbsp; Request Cancelled</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            The signing request for
                            <strong style="color:#d97706;">"{envelopeTitle}"</strong>
                            sent by <strong>{merchantName}</strong> has been <strong>cancelled</strong>.
                            No further action is required from you.
                          </p>

                          <!-- Info card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fffbeb;border:1px solid #fde68a;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Document</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                color:#92400e;">{envelopeTitle}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fde68a;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Cancelled on</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you have any questions, please contact
                            <strong style="color:#6b7280;">{merchantName}</strong> directly.
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

    public async Task SendEnvelopeCancelledToMerchantAsync(
        string toEmail, string toName, string envelopeTitle,
        IEnumerable<string> signerNames,
        CancellationToken ct = default)
    {
        var subject   = $"Envelope cancelled — \"{envelopeTitle}\"";
        var now       = DateTime.UtcNow;
        var names     = signerNames.ToList();
        var signerList = names.Count > 0
            ? string.Join(", ", names)
            : "none";

        var plainBody = $"""
            Dear {toName},

            You have successfully cancelled the envelope "{envelopeTitle}".
            All pending signers have been notified.

            Signers notified: {signerList}
            Cancelled on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            Regards,
            Document Signing Platform
            """;

        var signerRows = names.Count > 0
            ? string.Concat(names.Select(n =>
                $"<tr><td style=\"padding:6px 0;font-size:14px;color:#374151;\">• {n}</td></tr>"))
            : "<tr><td style=\"padding:6px 0;font-size:14px;color:#9ca3af;\">No pending signers</td></tr>";

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Envelope Cancelled</title>
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
                        <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fef3c7;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">🚫&nbsp; Envelope Cancelled</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            You have successfully cancelled the envelope
                            <strong style="color:#d97706;">"{envelopeTitle}"</strong>.
                            All pending signers have been notified by email.
                          </p>

                          <!-- Details card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fffbeb;border:1px solid #fde68a;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Envelope</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;
                                                color:#92400e;">{envelopeTitle}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fde68a;padding-top:12px;padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Cancelled on</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fde68a;padding-top:12px;">
                                      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Signers notified</p>
                                      <table cellpadding="0" cellspacing="0">
                                        {signerRows}
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            This is an automated confirmation from Document Signing Platform.
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

    // ─── Rejection emails ─────────────────────────────────────────────────────────

    public async Task SendEnvelopeRejectedToMerchantAsync(
        string toEmail, string toName, string signerName, string signerEmail,
        string envelopeTitle, string? reason,
        CancellationToken ct = default)
    {
        var subject    = $"Signature rejected — \"{envelopeTitle}\"";
        var now        = DateTime.UtcNow;
        var reasonText = string.IsNullOrWhiteSpace(reason) ? "No reason provided." : reason;

        var plainBody = $"""
            Dear {toName},

            {signerName} ({signerEmail}) has rejected the signing request for "{envelopeTitle}".

            Rejection reason: {reasonText}
            Rejected on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            The envelope status has been updated to Rejected.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Signature Rejected</title>
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
                        <td style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">❌&nbsp; Signature Rejected</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            <strong style="color:#ef4444;">{signerName}</strong> has
                            <strong>rejected</strong> the signing request for
                            <strong style="color:#ef4444;">"{envelopeTitle}"</strong>.
                          </p>

                          <!-- Details card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fef2f2;border:1px solid #fecaca;
                                        border-radius:8px;margin-bottom:24px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Rejected by</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#991b1b;">
                                        {signerName}
                                      </p>
                                      <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">{signerEmail}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fecaca;padding-top:12px;padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Document</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">{envelopeTitle}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fecaca;padding-top:12px;padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Rejected on</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fecaca;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Reason</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;font-style:italic;">
                                        {reasonText}
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            The envelope status has been updated to <strong style="color:#ef4444;">Rejected</strong>.
                            You may create a new envelope if needed.
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

    public async Task SendEnvelopeRejectedToSignerAsync(
        string toEmail, string toName, string envelopeTitle, string? reason,
        CancellationToken ct = default)
    {
        var subject    = $"Your rejection has been recorded — \"{envelopeTitle}\"";
        var now        = DateTime.UtcNow;
        var reasonText = string.IsNullOrWhiteSpace(reason) ? "No reason provided." : reason;

        var plainBody = $"""
            Dear {toName},

            We have recorded your rejection of the signing request for "{envelopeTitle}".

            Reason given: {reasonText}
            Rejected on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            The document sender has been notified.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Rejection Recorded</title>
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
                        <td style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fecaca;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">❌&nbsp; Rejection Recorded</h1>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>

                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            Your rejection of the signing request for
                            <strong style="color:#ef4444;">"{envelopeTitle}"</strong>
                            has been recorded. The document sender has been notified.
                          </p>

                          <!-- Details card -->
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fef2f2;border:1px solid #fecaca;
                                        border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Document</p>
                                      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#991b1b;">
                                        {envelopeTitle}
                                      </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fecaca;padding-top:12px;padding-bottom:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Rejected on</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                        {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                      </p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="border-top:1px solid #fecaca;padding-top:12px;">
                                      <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                                text-transform:uppercase;letter-spacing:1px;">Your reason</p>
                                      <p style="margin:4px 0 0;font-size:14px;color:#374151;font-style:italic;">
                                        {reasonText}
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you have any questions, please contact the party who sent you this request.
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

    // ─── Account activation emails ────────────────────────────────────────────────

    public async Task SendAccountPendingApprovalAsync(
        string toEmail, string toName,
        CancellationToken ct = default)
    {
        var subject   = "Your admin account is pending approval";
        var now       = DateTime.UtcNow;
        var plainBody = $"""
            Dear {toName},

            Thank you for registering as an Admin on Document Signing Platform.

            Your account is currently pending approval by a platform administrator.
            You will receive another email once your account has been activated.

            Registered on: {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Account Pending Approval</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fef3c7;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">⏳&nbsp; Account Pending Approval</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>
                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            Thank you for registering as an <strong>Admin</strong> on Document Signing Platform.
                            Your account is <strong style="color:#d97706;">pending approval</strong> by a platform administrator.
                            You will receive another email once your account has been activated.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;">
                                <p style="margin:0;font-size:11px;font-weight:600;color:#6b7280;
                                          text-transform:uppercase;letter-spacing:1px;">Registered on</p>
                                <p style="margin:4px 0 0;font-size:14px;color:#374151;">
                                  {now:dddd, MMMM d, yyyy} at {now:HH:mm} UTC
                                </p>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you did not register for an Admin account, please ignore this email.
                          </p>
                        </td>
                      </tr>
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

    public async Task SendAccountActivatedAsync(
        string toEmail, string toName,
        CancellationToken ct = default)
    {
        var subject   = "Your account is now active — Welcome!";
        var plainBody = $"""
            Dear {toName},

            Great news! Your admin account on Document Signing Platform has been approved and is now active.
            You can now log in and start using the platform.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Account Activated</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#dcfce7;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;
                                     letter-spacing:-0.3px;">✅&nbsp; Account Activated</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>
                          <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                            Great news! Your admin account on Document Signing Platform has been
                            <strong style="color:#16a34a;">approved and activated</strong>.
                            You can now log in and start using the platform.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:32px;">
                            <tr>
                              <td style="padding:20px 24px;text-align:center;">
                                <p style="margin:0;font-size:15px;font-weight:600;color:#166534;">
                                  🎉 Welcome aboard!
                                </p>
                                <p style="margin:8px 0 0;font-size:13px;color:#4b7c59;">
                                  Your account is fully active. Log in to get started.
                                </p>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            If you have any questions, contact your platform administrator.
                          </p>
                        </td>
                      </tr>
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

    public async Task SendEnvelopeExpiredAsync(
        string toEmail, string toName, string envelopeTitle, int signerCount,
        CancellationToken ct = default)
    {
        var docLabel = string.IsNullOrWhiteSpace(envelopeTitle) ? "a document" : $"\"{envelopeTitle}\"";
        var subject  = $"Signing envelope expired: {(string.IsNullOrWhiteSpace(envelopeTitle) ? "Your envelope" : envelopeTitle)}";

        var plainBody = $"""
            Dear {toName},

            Your signing envelope {docLabel} has expired without all {signerCount} signer(s) completing.

            If you still need signatures on this document, please create a new envelope.

            Regards,
            Document Signing Platform
            """;

        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Envelope Expired</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fca5a5;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;">
                            Envelope Expired
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>
                          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                            Your signing envelope {docLabel} has expired without all
                            <strong>{signerCount}</strong> signer(s) completing the signing process.
                          </p>
                          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                            If you still need signatures on this document, please log in and create a
                            new signing envelope.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 48px 40px;text-align:center;color:#9ca3af;font-size:12px;">
                          &copy; Document Signing Platform
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, null, ct);
    }

    public async Task SendSigningReminderAsync(
        string toEmail, string toName, string signingLink, DateTime expiresAt,
        string envelopeTitle, string senderName,
        CancellationToken ct = default)
    {
        var docLabel    = string.IsNullOrWhiteSpace(envelopeTitle) ? "a document" : $"\"{envelopeTitle}\"";
        var senderLabel = string.IsNullOrWhiteSpace(senderName)    ? "Someone"    : senderName;
        var subject     = $"Reminder: Your signature is still needed on {(string.IsNullOrWhiteSpace(envelopeTitle) ? "a document" : envelopeTitle)}";

        var plainBody = $"""
            Dear {toName},

            This is a friendly reminder that {senderLabel} is waiting for your signature on {docLabel}.

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
              <title>Signing Reminder</title>
            </head>
            <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                           style="background:#ffffff;border-radius:12px;overflow:hidden;
                                  box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background:linear-gradient(135deg,#d97706 0%,#92400e 100%);
                                   padding:36px 48px;text-align:center;">
                          <p style="margin:0;font-size:13px;color:#fde68a;letter-spacing:1.5px;
                                    text-transform:uppercase;">Document Signing Platform</p>
                          <h1 style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;">
                            Signature Reminder
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:48px 48px 32px;">
                          <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">Dear,</p>
                          <p style="margin:0 0 24px;font-size:20px;font-weight:600;color:#111827;">{toName}</p>
                          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                            This is a friendly reminder that
                            <strong style="color:#d97706;">{senderLabel}</strong>
                            is still waiting for your signature on {docLabel}.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                            <tr>
                              <td align="center">
                                <a href="{signingLink}"
                                   style="display:inline-block;padding:16px 40px;
                                          background:#d97706;color:#ffffff;font-size:16px;
                                          font-weight:600;text-decoration:none;border-radius:8px;">
                                  Sign Now
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;">
                            Link expires: {expiresAt:f} UTC
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 48px 40px;text-align:center;color:#9ca3af;font-size:12px;">
                          &copy; Document Signing Platform
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;

        await SendHtmlAsync(toEmail, toName, subject, plainBody, htmlBody, null, ct);
    }
}
