using System.Security.Cryptography;
using System.Text.Json;
using DocumentSigning.Api.Filters;
using DocumentSigning.Api.Swagger;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DocumentSigning.Api.Controllers;

/// <summary>
/// Multi-signer envelope-based signing flow.
/// Requires X-Api-Key header (merchant authentication).
/// </summary>
[ApiController]
[Route("api/envelopes")]
[RequiresMerchantApiKey]
[ServiceFilter(typeof(MerchantApiKeyFilter))]
public class EnvelopeController : ControllerBase
{
    private readonly IMerchantRepository _merchantRepo;
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly IClaimRepository _claimRepo;
    private readonly ISigningRequestRepository _signingRequestRepo;
    private readonly ISignedDocumentRepository _signedDocRepo;
    private readonly IOutboxQueueRepository _outboxRepo;
    private readonly IAuditService _audit;
    private readonly IAuditLogRepository _auditLogRepo;
    private readonly ITokenService _tokenService;
    private readonly IDocumentRepository _documentRepo;
    private readonly IConfiguration _config;
    private readonly IWebhookService _webhookService;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepo;
    private readonly ISignerContactService _signerContactService;

    public EnvelopeController(
        IMerchantRepository merchantRepo,
        ISigningEnvelopeRepository envelopeRepo,
        IClaimRepository claimRepo,
        ISigningRequestRepository signingRequestRepo,
        ISignedDocumentRepository signedDocRepo,
        IOutboxQueueRepository outboxRepo,
        IAuditService audit,
        IAuditLogRepository auditLogRepo,
        ITokenService tokenService,
        IDocumentRepository documentRepo,
        IConfiguration config,
        IWebhookService webhookService,
        IEmailService emailService,
        IUserRepository userRepo,
        ISignerContactService signerContactService)
    {
        _merchantRepo = merchantRepo;
        _envelopeRepo = envelopeRepo;
        _claimRepo = claimRepo;
        _signingRequestRepo = signingRequestRepo;
        _signedDocRepo = signedDocRepo;
        _outboxRepo = outboxRepo;
        _audit = audit;
        _auditLogRepo = auditLogRepo;
        _tokenService = tokenService;
        _documentRepo = documentRepo;
        _config = config;
        _webhookService = webhookService;
        _emailService = emailService;
        _userRepo = userRepo;
        _signerContactService = signerContactService;
    }

    /// <summary>
    /// Initiates a signing envelope for one or more signers and documents.
    /// </summary>
    /// <remarks>
    /// The envelope lifecycle:
    /// <list type="bullet">
    ///   <item><description><b>Processing</b> — envelope accepted; emails being prepared</description></item>
    ///   <item><description><b>Sent</b> — invitation emails dispatched to all signers</description></item>
    ///   <item><description><b>Signed</b> — at least one signer has signed (multi-signer in progress)</description></item>
    ///   <item><description><b>Completed</b> — all signers have completed</description></item>
    ///   <item><description><b>Failed</b> — system error during send or stamping</description></item>
    ///   <item><description><b>Cancelled</b> — sender cancelled the envelope</description></item>
    ///   <item><description><b>Expired</b> — signing window elapsed without completion</description></item>
    ///   <item><description><b>Rejected</b> — a signer explicitly rejected the document</description></item>
    /// </list>
    /// </remarks>
    [HttpPost]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("signing")]
    [ProducesResponseType(typeof(InitiateEnvelopeResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Create(
        [FromBody] InitiateEnvelopeRequest request,
        CancellationToken ct)
    {
        // Merchant resolved by filter
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        // ── Validate request ────────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");
        if (request.Documents is null || request.Documents.Count == 0)
            return BadRequest("At least one document is required.");
        if (request.Signers is null || request.Signers.Count == 0)
            return BadRequest("At least one signer is required.");

        // ── Validate & decode documents ─────────────────────────────────────
        var allowedTypes = new[]
        {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
        };

        var docEntities = new List<Document>();
        foreach (var d in request.Documents)
        {
            if (string.IsNullOrWhiteSpace(d.DocumentBase64))
                return BadRequest($"Document '{d.DocumentFileName}' has no content.");

            byte[] bytes;
            try { bytes = Convert.FromBase64String(d.DocumentBase64); }
            catch { return BadRequest($"Document '{d.DocumentFileName}' has invalid base64 content."); }

            // Resolve content type: explicit field wins, then fall back to file extension
            var rawType = d.DocumentContentType?.Trim().ToLowerInvariant()
                          ?? Path.GetExtension(d.DocumentFileName).TrimStart('.').ToLowerInvariant();

            var contentType = rawType switch
            {
                "pdf"  or "application/pdf"                                                                                  => "application/pdf",
                "docx" or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"                          => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "doc"  or "application/msword"                                                                               => "application/msword",
                _      => string.Empty
            };

            if (!allowedTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
                return BadRequest($"Unsupported content type '{rawType}' for '{d.DocumentFileName}'. Accepted: pdf, doc, docx.");

            docEntities.Add(new Document
            {
                Id                = Guid.NewGuid(),
                ClaimId           = Guid.Empty, // envelope-level; ClaimId not relevant here
                DocumentTitle     = d.DocumentTitle,
                DocumentFileName  = d.DocumentFileName,
                ContentBytes      = bytes,
                ContentType       = contentType,
                Hash              = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(),
                CreatedAt         = DateTime.UtcNow
            });
        }

        // ── Build envelope ──────────────────────────────────────────────────
        var envelope = new SigningEnvelope
        {
            Id         = Guid.NewGuid(),
            MerchantId = merchant.Id,
            Title      = request.Title.Trim(),
            Status     = EnvelopeStatus.Processing,
            CreatedAt  = DateTime.UtcNow,
            Documents  = docEntities,
            Signers    = request.Signers
                .OrderBy(s => s.Order)
                .Select(s => new Signer
                {
                    Id         = Guid.NewGuid(),
                    Name       = s.Name,
                    Email      = s.Email,
                    Role       = s.Role,
                    Order      = s.Order,
                    Message    = s.Message,
                    Status     = SigningStatus.Pending,
                    CreatedAt  = DateTime.UtcNow
                }).ToList()
        };

        // Set back-ref on documents
        foreach (var doc in envelope.Documents)
            doc.EnvelopeId = envelope.Id;

        await _envelopeRepo.AddAsync(envelope, ct);
        await _envelopeRepo.SaveChangesAsync(ct);

        // ── Auto-create / upsert signer contacts for the merchant's owner ───
        foreach (var signer in envelope.Signers)
        {
            await _signerContactService.UpsertFromSignerAsync(
                merchant.UserId, signer.Name, signer.Email, signer.Role ?? "signer", ct);
        }

        // ── Create SigningRequest + send invitation for each signer ─────────
        var baseUrl = _config["App:FrontendUrl"] ?? _config["App:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        var expiry  = DateTime.UtcNow.AddDays(7);

        // Use first document for the signing token (multi-document support can be extended)
        var primaryDoc = docEntities.First();

        foreach (var signer in envelope.Signers)
        {
            // Each signer needs their own claim (identity record)
            var claimId = Guid.NewGuid();
            var claim = new DocumentSigning.Core.Entities.Claim
            {
                Id            = claimId,
                ClaimantName  = signer.Name,
                ClaimantEmail = signer.Email,
                Status        = ClaimStatus.Active,
                CreatedAt     = DateTime.UtcNow
            };
            await _claimRepo.AddAsync(claim, ct);

            var token = _tokenService.GenerateToken(claimId, primaryDoc.Id, out _);

            var signingRequest = new SigningRequest
            {
                Id         = Guid.NewGuid(),
                Token      = token,
                ClaimId    = claimId,
                DocumentId = primaryDoc.Id,
                Status     = SigningStatus.Pending,
                ExpiresAt  = expiry,
                CreatedAt  = DateTime.UtcNow
            };
            await _signingRequestRepo.AddAsync(signingRequest, ct);

            var signingLink = $"{baseUrl}/sign/{token}";
            var emailPayload = JsonSerializer.Serialize(new SendEmailPayload(
                signer.Email,
                signer.Name,
                signingLink,
                expiry,
                "Invitation",
                envelope.Title,
                merchant.Name));

            await _outboxRepo.AddAsync(new OutboxQueue
            {
                Id        = Guid.NewGuid(),
                JobType   = JobTypes.SendEmail,
                Payload   = emailPayload,
                Status    = JobStatus.Pending,
                CreatedAt = DateTime.UtcNow
            }, ct);

            _audit.Log(new AuditEntry(
                Action:      AuditActions.EnvelopeSent,
                EntityType:  AuditEntities.Envelope,
                EntityId:    envelope.Id,
                MerchantId:  merchant.Id,
                Description: $"Envelope '{envelope.Title}' sent to {signer.Email}",
                IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                UserAgent:   Request.Headers.UserAgent.ToString(),
                SigningRequestId: signingRequest.Id,
                ClaimId:     claimId));
        }

        await _signingRequestRepo.SaveChangesAsync(ct);
        await _outboxRepo.SaveChangesAsync(ct);

        // ── Transition envelope to Sent — invitations have been queued ──────
        envelope.Status = EnvelopeStatus.Sent;
        await _envelopeRepo.UpdateAsync(envelope, ct);
        await _envelopeRepo.SaveChangesAsync(ct);

        // ── Webhook: envelope.sent ───────────────────────────────────────────
        await _webhookService.TriggerAsync(
            WebhookEvents.EnvelopeSent,
            merchant.Id,
            new { envelopeId = envelope.Id, title = envelope.Title, status = "Sent", signerCount = envelope.Signers.Count },
            ct);

        // ── Increment merchant usage ─────────────────────────────────────────
        merchant.RequestUsed++;
        await _merchantRepo.UpdateAsync(merchant, ct);
        await _merchantRepo.SaveChangesAsync(ct);

        // ── Build response ───────────────────────────────────────────────────
        var response = new InitiateEnvelopeResponse(
            envelope.Id,
            envelope.Title,
            envelope.Status.ToString(),
            envelope.CreatedAt,
            envelope.Documents.Select(d => new DocumentSummary(
                d.Id,
                d.DocumentTitle)).ToList(),
            envelope.Signers.Select(s => new SignerSummary(s.Name, s.Role, s.Email, s.Status.ToString(), s.RejectionReason)).ToList()
        );

        return CreatedAtAction(nameof(GetById), new { id = envelope.Id }, response);
    }

    /// <summary>Returns a signing envelope by ID (merchant-scoped). Documents include signed content when available.</summary>
    /// <remarks>
    /// Status values: <c>Processing</c> | <c>Sent</c> | <c>Signed</c> | <c>Completed</c> | <c>Failed</c> | <c>Cancelled</c> | <c>Expired</c> | <c>Rejected</c>
    /// </remarks>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InitiateEnvelopeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        return Ok(MapToResponse(envelope));
    }

    /// <summary>Returns all envelopes for the authenticated merchant.</summary>
    /// <remarks>
    /// Status values: <c>Processing</c> | <c>Sent</c> | <c>Signed</c> | <c>Completed</c> | <c>Failed</c> | <c>Cancelled</c> | <c>Expired</c> | <c>Rejected</c>
    /// </remarks>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<InitiateEnvelopeResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelopes = await _envelopeRepo.GetByMerchantAsync(merchant.Id, ct);
        return Ok(envelopes.Select(MapToResponse));
    }

    private static InitiateEnvelopeResponse MapToResponse(SigningEnvelope e)
    {
        // Terminal / non-derivable statuses — respect the stored DB value
        static bool IsTerminal(EnvelopeStatus s) =>
            s == EnvelopeStatus.Cancelled ||
            s == EnvelopeStatus.Failed    ||
            s == EnvelopeStatus.Expired   ||
            s == EnvelopeStatus.Rejected;

        // Derive effective status from signer states to handle any stale DB records
        var effectiveStatus = e.Status;
        if (!IsTerminal(effectiveStatus) && e.Signers.Count > 0)
        {
            bool allSigned = e.Signers.All(s => s.Status == SigningStatus.Signed);
            bool anySigned = e.Signers.Any(s => s.Status == SigningStatus.Signed);

            if (allSigned)
                effectiveStatus = EnvelopeStatus.Completed;
            else if (anySigned)
                effectiveStatus = EnvelopeStatus.Signed;
        }

        return new(
            e.Id,
            e.Title,
            effectiveStatus.ToString(),
            e.CreatedAt,
            e.Documents.Select(d => new DocumentSummary(d.Id, d.DocumentTitle)).ToList(),
            e.Signers.Select(s => new SignerSummary(s.Name, s.Role, s.Email, s.Status.ToString(), s.RejectionReason)).ToList()
        );
    }

    /// <summary>Cancels an envelope, preventing any further signing.</summary>
    /// <remarks>
    /// Only envelopes in <c>Processing</c>, <c>Sent</c>, or <c>Signed</c> state can be cancelled.
    /// Terminal statuses (<c>Completed</c>, <c>Failed</c>, <c>Expired</c>, <c>Rejected</c>, <c>Cancelled</c>) cannot be changed.
    ///
    /// **Response codes**
    /// - `204 No Content` — envelope cancelled successfully.
    /// - `400 Bad Request` — envelope is already in a terminal state.
    /// - `401 Unauthorized` — missing or invalid merchant API key.
    /// - `404 Not Found` — envelope not found or belongs to a different merchant.
    /// </remarks>
    /// <param name="id">The envelope GUID to cancel.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpPut("{id:guid}/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        var cancellableStates = new[] { EnvelopeStatus.Processing, EnvelopeStatus.Sent, EnvelopeStatus.Signed };
        if (!cancellableStates.Contains(envelope.Status))
            return BadRequest($"Cannot cancel an envelope with status '{envelope.Status}'.");

        envelope.Status = EnvelopeStatus.Cancelled;
        await _envelopeRepo.UpdateAsync(envelope, ct);
        await _envelopeRepo.SaveChangesAsync(ct);

        // ── Webhook: envelope.cancelled ──────────────────────────────────────
        await _webhookService.TriggerAsync(
            WebhookEvents.EnvelopeCancelled,
            merchant.Id,
            new { envelopeId = envelope.Id, title = envelope.Title, status = "Cancelled" },
            ct);

        _audit.Log(new AuditEntry(
            Action:      AuditActions.EnvelopeCancelled,
            EntityType:  AuditEntities.Envelope,
            EntityId:    envelope.Id,
            MerchantId:  merchant.Id,
            Description: $"Envelope '{envelope.Title}' cancelled by merchant.",
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString()));

        // ── Notification emails ──────────────────────────────────────────────
        var pendingSigners = envelope.Signers
            .Where(s => s.Status == SigningStatus.Pending)
            .ToList();

        // Email each pending signer
        foreach (var signer in pendingSigners)
        {
            _ = _emailService.SendEnvelopeCancelledToSignerAsync(
                    signer.Email, signer.Name, envelope.Title, merchant.Name, ct)
                .ContinueWith(t => _audit.Log(new AuditEntry(
                    Action: "EmailFailed", EntityType: AuditEntities.Envelope,
                    EntityId: envelope.Id, MerchantId: merchant.Id,
                    Description: $"Failed to send cancellation email to signer {signer.Email}: {t.Exception?.Message}")),
                    System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
        }

        // Email merchant confirmation
        var merchantUser = await _userRepo.GetByIdAsync(merchant.UserId, ct);
        if (merchantUser is not null)
        {
            _ = _emailService.SendEnvelopeCancelledToMerchantAsync(
                    merchantUser.Email, merchantUser.Name, envelope.Title,
                    pendingSigners.Select(s => s.Name), ct)
                .ContinueWith(t => _audit.Log(new AuditEntry(
                    Action: "EmailFailed", EntityType: AuditEntities.Envelope,
                    EntityId: envelope.Id, MerchantId: merchant.Id,
                    Description: $"Failed to send cancellation confirmation to merchant: {t.Exception?.Message}")),
                    System.Threading.Tasks.TaskContinuationOptions.OnlyOnFaulted);
        }

        return NoContent();
    }

    /// <summary>Returns the envelope with each signer's signed document in base64 (null if not yet signed).</summary>
    [HttpGet("{id:guid}/signed-documents")]
    [ProducesResponseType(typeof(EnvelopeSignedResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSignedDocuments(Guid id, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        var signers = new List<SignerSignedSummary>();
        var primaryDocId = envelope.Documents.FirstOrDefault()?.Id ?? Guid.Empty;
        foreach (var s in envelope.Signers)
        {
            var signedDoc   = await _signedDocRepo.GetByEnvelopeAndEmailAsync(envelope.Id, s.Email, ct);
            var signingReq  = primaryDocId != Guid.Empty
                ? await _signingRequestRepo.GetLatestByEmailAndDocumentAsync(s.Email, primaryDocId, ct)
                : null;
            signers.Add(new SignerSignedSummary(
                s.Name,
                s.Role,
                s.Email,
                s.Status.ToString(),
                signedDoc is not null ? Convert.ToBase64String(signedDoc.ContentBytes) : null,
                signedDoc is not null ? ResolveDocumentType(signedDoc.ContentType) : null,
                s.RejectionReason,
                signingReq?.ExpiresAt,
                signingReq?.SignedAt,
                s.Message,
                s.Order));
        }

        var response = new EnvelopeSignedResponse(
            envelope.Id,
            envelope.Title,
            envelope.Status.ToString(),
            envelope.CreatedAt,
            envelope.Documents.Select(d => new DocumentSummary(d.Id, d.DocumentTitle)).ToList(),
            signers);

        return Ok(response);
    }

    /// <summary>Resends the signing invitation email to a specific pending signer.</summary>
    /// <remarks>
    /// Regenerates a fresh signing token (with a new expiry window) and queues a new
    /// invitation email for the signer identified by <c>signerEmail</c>.  
    /// Only signers with status <c>Pending</c> can receive a resend.  
    /// Each resend is recorded as an <c>Invitation.Resent</c> audit-log entry and will
    /// appear in the envelope's activity timeline (<c>GET /api/envelopes/{id}/activity</c>).
    /// </remarks>
    /// <param name="id">Envelope GUID (URL path).</param>
    /// <param name="request">Body containing the signer's email address.</param>
    /// <response code="204">Invitation queued successfully — new email will be sent.</response>
    /// <response code="400">Signer is not in <c>Pending</c> status (already signed, rejected, or expired).</response>
    /// <response code="404">Envelope not found / not owned by this merchant, or signer email not on this envelope.</response>
    [HttpPost("{id:guid}/resend")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResendInvitation(
        Guid id,
        [FromBody] ResendInvitationRequest request,
        CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        var signer = envelope.Signers
            .FirstOrDefault(s => s.Email.Equals(request.SignerEmail, StringComparison.OrdinalIgnoreCase));
        if (signer is null)
            return NotFound("Signer not found in this envelope.");

        if (signer.Status != SigningStatus.Pending)
            return BadRequest($"Cannot resend invitation to a signer with status '{signer.Status}'. Only Pending signers can receive a resend.");

        // ── Create fresh Claim + SigningRequest ──────────────────────────────
        var primaryDoc = envelope.Documents.FirstOrDefault();
        if (primaryDoc is null) return BadRequest("Envelope has no documents.");

        var frontendUrl = _config["App:FrontendUrl"] ?? _config["App:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        var expiry = DateTime.UtcNow.AddDays(7);

        var claimId = Guid.NewGuid();
        await _claimRepo.AddAsync(new Core.Entities.Claim
        {
            Id            = claimId,
            ClaimantName  = signer.Name,
            ClaimantEmail = signer.Email,
            Status        = Core.Enums.ClaimStatus.Active,
            CreatedAt     = DateTime.UtcNow
        }, ct);
        await _claimRepo.SaveChangesAsync(ct);

        var token = _tokenService.GenerateToken(claimId, primaryDoc.Id, out _);
        await _signingRequestRepo.AddAsync(new SigningRequest
        {
            Id         = Guid.NewGuid(),
            Token      = token,
            ClaimId    = claimId,
            DocumentId = primaryDoc.Id,
            Status     = SigningStatus.Pending,
            ExpiresAt  = expiry,
            CreatedAt  = DateTime.UtcNow
        }, ct);
        await _signingRequestRepo.SaveChangesAsync(ct);

        var signingLink = $"{frontendUrl}/sign/{token}";
        var emailPayload = JsonSerializer.Serialize(new SendEmailPayload(
            signer.Email,
            signer.Name,
            signingLink,
            expiry,
            "Invitation",
            envelope.Title,
            merchant.Name));

        await _outboxRepo.AddAsync(new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.SendEmail,
            Payload   = emailPayload,
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        }, ct);
        await _outboxRepo.SaveChangesAsync(ct);

        _audit.Log(new AuditEntry(
            Action:      AuditActions.InvitationResent,
            EntityType:  AuditEntities.Envelope,
            EntityId:    envelope.Id,
            MerchantId:  merchant.Id,
            Description: $"Invitation resent to {signer.Email} for envelope '{envelope.Title}'",
            IpAddress:   HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent:   Request.Headers.UserAgent.ToString()));

        return NoContent();
    }

    /// <summary>Returns the audit-log activity timeline for a specific envelope.</summary>
    /// <remarks>
    /// Returns all <c>AuditLog</c> entries where <c>EntityType = "Envelope"</c> and
    /// <c>EntityId = {id}</c>, ordered chronologically (oldest first).  
    /// Covers events such as <c>Envelope.Created</c>, <c>Invitation.Resent</c>,
    /// <c>Envelope.Signed</c>, <c>Envelope.Completed</c>, <c>Envelope.Cancelled</c>, and
    /// <c>Envelope.Rejected</c>.
    /// </remarks>
    /// <param name="id">Envelope GUID (URL path).</param>
    /// <response code="200">Array of activity items ordered by timestamp ascending (may be empty).</response>
    /// <response code="404">Envelope not found or not owned by this merchant.</response>
    [HttpGet("{id:guid}/activity")]
    [ProducesResponseType(typeof(IReadOnlyList<EnvelopeActivityResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActivity(Guid id, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        var logs = await _auditLogRepo.GetByEntityAsync(AuditEntities.Envelope, id, ct);

        var result = logs.Select(l => new EnvelopeActivityResponse(
            l.Action,
            l.Description,
            l.Timestamp)).ToList();

        return Ok(result);
    }

    /// <summary>Downloads the original (unsigned) document bytes for a specific document in an envelope.</summary>
    /// <remarks>
    /// Returns the raw file bytes with the correct <c>Content-Disposition: attachment</c> header.
    /// Useful for merchants who want to re-download the original uploaded document.
    /// </remarks>
    /// <param name="id">Envelope GUID (URL path).</param>
    /// <param name="docId">Document GUID (URL path).</param>
    /// <response code="200">Raw file bytes with Content-Disposition attachment header.</response>
    /// <response code="404">Envelope or document not found, or not owned by this merchant.</response>
    [HttpGet("{id:guid}/documents/{docId:guid}/download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadDocument(Guid id, Guid docId, CancellationToken ct)
    {
        var merchant = HttpContext.Items["Merchant"] as Merchant;
        if (merchant is null) return Unauthorized();

        var envelope = await _envelopeRepo.GetByIdAsync(id, ct);
        if (envelope is null || envelope.MerchantId != merchant.Id)
            return NotFound();

        var doc = await _documentRepo.GetByIdAsync(docId, ct);
        if (doc is null || doc.EnvelopeId != id)
            return NotFound();

        var contentType = string.IsNullOrWhiteSpace(doc.ContentType)
            ? "application/octet-stream"
            : doc.ContentType;

        Response.Headers["Content-Disposition"] =
            $"attachment; filename=\"{doc.DocumentFileName}\"";

        return File(doc.ContentBytes, contentType, doc.DocumentFileName);
    }

    private static string ResolveDocumentType(string contentType) => contentType.ToLowerInvariant() switch    {
        "application/pdf"                                                                 => "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"        => "docx",
        "application/msword"                                                              => "doc",
        _ => contentType
    };
}
