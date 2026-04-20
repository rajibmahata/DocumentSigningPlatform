using System.Security.Cryptography;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.BackgroundJobs;

/// <summary>
/// Handles StampDoc jobs: retrieves document, applies signature stamp,
/// persists signed document, enqueues confirmation + firm notification emails.
/// </summary>
public class StampDocJobHandler
{
    private readonly IDocumentRepository _docRepo;
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly ISignedDocumentRepository _signedDocRepo;
    private readonly IClaimRepository _claimRepo;
    private readonly IAuditLogRepository _auditRepo;
    private readonly IOutboxQueueRepository _outboxRepo;
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly IMerchantRepository _merchantRepo;
    private readonly IUserRepository _userRepo;
    private readonly IDocumentStamper _stamper;
    private readonly IConfiguration _config;
    private readonly ILogger<StampDocJobHandler> _logger;
    private readonly IWebhookService _webhookService;

    public StampDocJobHandler(
        IDocumentRepository docRepo,
        ISigningRequestRepository signingRequestRepo,
        ISignedDocumentRepository signedDocRepo,
        IClaimRepository claimRepo,
        IAuditLogRepository auditRepo,
        IOutboxQueueRepository outboxRepo,
        ISigningEnvelopeRepository envelopeRepo,
        IMerchantRepository merchantRepo,
        IUserRepository userRepo,
        IDocumentStamper stamper,
        IConfiguration config,
        ILogger<StampDocJobHandler> logger,
        IWebhookService webhookService)
    {
        _docRepo = docRepo;
        _signingRequestRepo = signingRequestRepo;
        _signedDocRepo = signedDocRepo;
        _claimRepo = claimRepo;
        _auditRepo = auditRepo;
        _outboxRepo = outboxRepo;
        _envelopeRepo = envelopeRepo;
        _merchantRepo = merchantRepo;
        _userRepo = userRepo;
        _stamper = stamper;
        _config = config;
        _logger = logger;
        _webhookService = webhookService;
    }

    public async Task HandleAsync(OutboxQueue job, CancellationToken ct = default)
    {
        var payload = JsonSerializer.Deserialize<StampPdfPayload>(job.Payload)
            ?? throw new InvalidOperationException("Null StampDoc payload.");

        var doc = await _docRepo.GetByIdAsync(payload.DocumentId, ct)
            ?? throw new InvalidOperationException($"Document {payload.DocumentId} not found.");
        var claim = await _claimRepo.GetByIdAsync(payload.ClaimId, ct)
            ?? throw new InvalidOperationException($"Claim {payload.ClaimId} not found.");
        var signingRequest = await _signingRequestRepo.GetByIdAsync(payload.SigningRequestId, ct)
            ?? throw new InvalidOperationException($"SigningRequest {payload.SigningRequestId} not found.");

        var signaturePng = Convert.FromBase64String(payload.SignatureBase64);
        var signedDate = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss 'UTC'");

        _logger.LogInformation("Stamping document {DocId} for claim {ClaimId}", doc.Id, claim.Id);

        var stampedBytes = await _stamper.StampAsync(
            doc.ContentBytes, doc.ContentType, signaturePng, signedDate, ct);

        // Compute SHA-256 hash of the stamped document
        var documentHash = Convert.ToHexString(SHA256.HashData(stampedBytes)).ToLowerInvariant();

        // Persist signed document
        var signedDoc = new SignedDocument
        {
            Id = Guid.NewGuid(),
            SigningRequestId = payload.SigningRequestId,
            ClaimId = payload.ClaimId,
            ContentBytes = stampedBytes,
            ContentType = doc.ContentType,
            Hash = documentHash,
            CreatedAt = DateTime.UtcNow
        };
        await _signedDocRepo.AddAsync(signedDoc, ct);
        await _signedDocRepo.SaveChangesAsync(ct);

        // Update signing request → Signed
        signingRequest.Status = SigningStatus.Signed;
        signingRequest.SignedAt = DateTime.UtcNow;
        await _signingRequestRepo.UpdateAsync(signingRequest, ct);
        await _signingRequestRepo.SaveChangesAsync(ct);

        // Update claim → Signed + reference to signed doc
        claim.Status = ClaimStatus.Signed;
        claim.SignedDocRef = signedDoc.Id;
        await _claimRepo.UpdateAsync(claim, ct);
        await _claimRepo.SaveChangesAsync(ct);

        // Update matching Signer status on the specific envelope this document belongs to.
        // Use doc.EnvelopeId for precision — GetBySignerEmailAsync is unreliable when
        // the same signer email appears in multiple envelopes.
        SigningEnvelope? envelope = null;
        if (doc.EnvelopeId.HasValue)
            envelope = await _envelopeRepo.GetByIdAsync(doc.EnvelopeId.Value, ct);

        if (envelope is not null)
        {
            var signer = envelope.Signers.FirstOrDefault(s => s.Email == claim.ClaimantEmail);
            if (signer is not null)
            {
                signer.Status = SigningStatus.Signed;

                // Promote envelope status based on how many signers remain
                bool allSigned = envelope.Signers.All(s => s.Status == SigningStatus.Signed);
                envelope.Status = allSigned ? EnvelopeStatus.Completed : EnvelopeStatus.Signed;

                await _envelopeRepo.UpdateAsync(envelope, ct);
                await _envelopeRepo.SaveChangesAsync(ct);

                // ── Webhook: envelope.signed / envelope.completed ────────────
                var webhookEvent = allSigned
                    ? WebhookEvents.EnvelopeCompleted
                    : WebhookEvents.EnvelopeSigned;

                await _webhookService.TriggerAsync(
                    webhookEvent,
                    envelope.MerchantId,
                    new
                    {
                        envelopeId  = envelope.Id,
                        status      = envelope.Status.ToString(),
                        signerEmail = claim.ClaimantEmail,
                    },
                    ct);
            }
        }

        // Audit entry
        await _auditRepo.AppendAsync(new AuditLog
        {
            Id = Guid.NewGuid(),
            SigningRequestId = payload.SigningRequestId,
            ClaimId = payload.ClaimId,
            Action = "DocumentStamped",
            IpAddress = "background",
            UserAgent = "OutboxWorker",
            Timestamp = DateTime.UtcNow
        }, ct);
        await _auditRepo.SaveChangesAsync(ct);

        // Enqueue confirmation email to claimant
        var confirmationPayload = JsonSerializer.Serialize(new ConfirmationEmailPayload(
            claim.ClaimantEmail, claim.ClaimantName, signedDoc.Id));
        await _outboxRepo.AddAsync(new OutboxQueue
        {
            Id = Guid.NewGuid(),
            JobType = JobTypes.SendConfirmation,
            Payload = confirmationPayload,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        }, ct);

        // Enqueue signed-document notification to the merchant owner
        if (envelope is not null)
        {
            var merchant = await _merchantRepo.GetByIdAsync(envelope.MerchantId, ct);
            if (merchant is not null)
            {
                var merchantUser = await _userRepo.GetByIdAsync(merchant.UserId, ct);
                if (merchantUser is not null)
                {
                    var merchantPayload = JsonSerializer.Serialize(new MerchantSignedDocPayload(
                        merchantUser.Email,
                        merchantUser.Name,
                        claim.ClaimantName,
                        envelope.Title,
                        signedDoc.Id));
                    await _outboxRepo.AddAsync(new OutboxQueue
                    {
                        Id        = Guid.NewGuid(),
                        JobType   = JobTypes.SendMerchantSignedDoc,
                        Payload   = merchantPayload,
                        Status    = JobStatus.Pending,
                        CreatedAt = DateTime.UtcNow
                    }, ct);
                }
            }
        }

        // Enqueue firm notification — read from config
        var firmEmail = _config["Email:FirmAddress"]
            ?? throw new InvalidOperationException("Email:FirmAddress is not configured.");
        var firmPayload = JsonSerializer.Serialize(new FirmNotificationPayload(
            firmEmail, claim.Id, claim.ClaimantName));
        await _outboxRepo.AddAsync(new OutboxQueue
        {
            Id = Guid.NewGuid(),
            JobType = JobTypes.SendFirmNotification,
            Payload = firmPayload,
            Status = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        }, ct);

        await _outboxRepo.SaveChangesAsync(ct);

        _logger.LogInformation("Stamping complete for SigningRequest {Id}", payload.SigningRequestId);
    }
}
