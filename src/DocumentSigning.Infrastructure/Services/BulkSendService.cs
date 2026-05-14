using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Validates a CSV bulk-send request, persists BulkSendJob rows, then
/// enqueues one OutboxQueue job per row.  Background processing creates
/// a real SigningEnvelope per recipient.
/// </summary>
public sealed class BulkSendService : IBulkSendService
{
    private readonly IBulkSendRepository        _bulkRepo;
    private readonly IOutboxQueueRepository     _outbox;
    private readonly ISigningEnvelopeRepository _envelopeRepo;
    private readonly IDocumentRepository        _documentRepo;
    private readonly ISigningRequestRepository  _signingRequestRepo;
    private readonly IClaimRepository           _claimRepo;
    private readonly IMerchantRepository        _merchantRepo;
    private readonly ITokenService              _tokenService;
    private readonly IConfiguration             _config;
    private readonly ILogger<BulkSendService>   _logger;

    public BulkSendService(
        IBulkSendRepository bulkRepo,
        IOutboxQueueRepository outbox,
        ISigningEnvelopeRepository envelopeRepo,
        IDocumentRepository documentRepo,
        ISigningRequestRepository signingRequestRepo,
        IClaimRepository claimRepo,
        IMerchantRepository merchantRepo,
        ITokenService tokenService,
        IConfiguration config,
        ILogger<BulkSendService> logger)
    {
        _bulkRepo          = bulkRepo;
        _outbox            = outbox;
        _envelopeRepo      = envelopeRepo;
        _documentRepo      = documentRepo;
        _signingRequestRepo = signingRequestRepo;
        _claimRepo         = claimRepo;
        _merchantRepo      = merchantRepo;
        _tokenService      = tokenService;
        _config            = config;
        _logger            = logger;
    }

    public async Task<BulkSendBatchResult> EnqueueBatchAsync(
        Guid merchantId,
        BulkSendRequest request,
        CancellationToken ct = default)
    {
        // Parse CSV
        var (rows, parseErrors) = ParseCsv(request.CsvContent);

        var batchId   = Guid.NewGuid();
        var validRows = 0;
        var rowErrors = new List<BulkSendRowError>(parseErrors);
        var jobs      = new List<BulkSendJob>();

        foreach (var (row, idx) in rows.Select((r, i) => (r, i + 2))) // 1-based, header = row 1
        {
            if (!row.TryGetValue("Email", out var email) || string.IsNullOrWhiteSpace(email))
            {
                rowErrors.Add(new BulkSendRowError(idx, string.Empty, "Missing Email"));
                continue;
            }

            if (!row.TryGetValue("Name", out var name) || string.IsNullOrWhiteSpace(name))
            {
                rowErrors.Add(new BulkSendRowError(idx, email, "Missing Name"));
                continue;
            }

            row.TryGetValue("Company", out var company);

            var mergeData = row
                .Where(kv => kv.Key != "Email" && kv.Key != "Name" && kv.Key != "Company")
                .ToDictionary(kv => kv.Key, kv => kv.Value);

            jobs.Add(new BulkSendJob
            {
                Id               = Guid.NewGuid(),
                BatchId          = batchId,
                MerchantId       = merchantId,
                RecipientName    = name.Trim(),
                RecipientEmail   = email.Trim().ToLowerInvariant(),
                RecipientCompany = company?.Trim(),
                // Store template document + request config alongside merge-data
                MergeDataJson    = JsonSerializer.Serialize(new BulkJobMergeContext(
                    request.TemplateDocumentBase64,
                    request.TemplateDocumentFileName,
                    request.TemplateDocumentContentType,
                    ApplyMergeTags(request.EnvelopeTitleTemplate, name, company, mergeData),
                    request.SignerRole,
                    request.SignerMessage,
                    request.TokenTtlDays,
                    request.RedirectUrl,
                    mergeData)),
                Status    = "Pending",
                CreatedAt = DateTime.UtcNow,
            });

            validRows++;
        }

        if (jobs.Count > 0)
        {
            await _bulkRepo.AddRangeAsync(jobs, ct);
            await _bulkRepo.SaveChangesAsync(ct);

            // Enqueue one outbox entry per job
            foreach (var job in jobs)
            {
                var payload = JsonSerializer.Serialize(new BulkSendJobPayload(job.Id));
                await _outbox.AddAsync(new OutboxQueue
                {
                    Id        = Guid.NewGuid(),
                    JobType   = JobTypes.BulkSendRow,
                    Payload   = payload,
                    Status    = JobStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                }, ct);
            }
            await _outbox.SaveChangesAsync(ct);
        }

        return new BulkSendBatchResult(batchId, rows.Count + parseErrors.Count, validRows, parseErrors.Count + (rows.Count - validRows), rowErrors);
    }

    public async Task<BulkSendBatchStatus> GetBatchStatusAsync(Guid batchId, CancellationToken ct = default)
    {
        var all = await _bulkRepo.GetByBatchAsync(batchId, ct);
        return new BulkSendBatchStatus(
            batchId,
            Total:      all.Count,
            Pending:    all.Count(j => j.Status == "Pending"),
            Processing: all.Count(j => j.Status == "Processing"),
            Sent:       all.Count(j => j.Status == "Sent"),
            Failed:     all.Count(j => j.Status == "Failed"));
    }

    public async Task ProcessJobAsync(Guid jobId, CancellationToken ct = default)
    {
        var job = await _bulkRepo.GetByIdAsync(jobId, ct);
        if (job is null)
        {
            _logger.LogWarning("BulkSend: job {JobId} not found.", jobId);
            return;
        }

        try
        {
            var ctx = JsonSerializer.Deserialize<BulkJobMergeContext>(job.MergeDataJson ?? "{}")
                ?? throw new InvalidOperationException("Missing merge context.");

            var merchant = await _merchantRepo.GetByIdAsync(job.MerchantId, ct)
                ?? throw new InvalidOperationException($"Merchant {job.MerchantId} not found.");

            byte[] docBytes;
            try { docBytes = Convert.FromBase64String(ctx.TemplateDocumentBase64); }
            catch { throw new InvalidOperationException("Invalid template document base64."); }

            // Apply merge-tags to document bytes (text-level replacement for UTF-8 docs)
            var allMerge = new Dictionary<string, string>(ctx.MergeData)
            {
                ["Name"]    = job.RecipientName,
                ["Email"]   = job.RecipientEmail,
                ["Company"] = job.RecipientCompany ?? "",
            };
            docBytes = ApplyMergeTagsToBytes(docBytes, allMerge);

            var docHash = Convert.ToHexString(SHA256.HashData(docBytes)).ToLowerInvariant();
            var docId   = Guid.NewGuid();

            var document = new Document
            {
                Id               = docId,
                ClaimId          = Guid.Empty,
                DocumentTitle    = ctx.EnvelopeTitle,
                DocumentFileName = ctx.TemplateDocumentFileName,
                ContentBytes     = docBytes,
                ContentType      = ctx.TemplateDocumentContentType,
                Hash             = docHash,
                CreatedAt        = DateTime.UtcNow,
            };
            await _documentRepo.AddAsync(document, ct);

            var defaultTtl = _config.GetValue<int>("App:EnvelopeExpiryDays", 7);
            var ttl        = ctx.TokenTtlDays ?? defaultTtl;
            var expiresAt  = DateTime.UtcNow.AddDays(ttl);
            var signerId   = Guid.NewGuid();

            var envelope = new SigningEnvelope
            {
                Id           = Guid.NewGuid(),
                MerchantId   = job.MerchantId,
                Title        = ctx.EnvelopeTitle,
                Status       = EnvelopeStatus.Processing,
                TokenTtlDays = ctx.TokenTtlDays,
                RedirectUrl  = ctx.RedirectUrl,
                CreatedAt    = DateTime.UtcNow,
                Documents    = [document],
                Signers      =
                [
                    new Signer
                    {
                        Id        = signerId,
                        Name      = job.RecipientName,
                        Email     = job.RecipientEmail,
                        Role      = ctx.SignerRole,
                        Order     = 1,
                        Message   = ctx.SignerMessage,
                        Status    = SigningStatus.Pending,
                        CreatedAt = DateTime.UtcNow,
                    }
                ],
            };

            await _envelopeRepo.AddAsync(envelope, ct);

            // Fix document's EnvelopeId
            document.EnvelopeId = envelope.Id;

            // Create a Claim for this recipient (mirrors the pattern in EnvelopeController)
            var claimId = Guid.NewGuid();
            await _claimRepo.AddAsync(new Claim
            {
                Id            = claimId,
                ClaimantName  = job.RecipientName,
                ClaimantEmail = job.RecipientEmail,
                Status        = ClaimStatus.Active,
                CreatedAt     = DateTime.UtcNow,
            }, ct);

            var token = _tokenService.GenerateToken(claimId, docId, out _);
            var signingRequest = new SigningRequest
            {
                Id         = Guid.NewGuid(),
                ClaimId    = claimId,
                DocumentId = docId,
                Token      = token,
                ExpiresAt  = expiresAt,
                Status     = SigningStatus.Pending,
                CreatedAt  = DateTime.UtcNow,
            };
            await _signingRequestRepo.AddAsync(signingRequest, ct);
            await _signingRequestRepo.SaveChangesAsync(ct);

            envelope.Status = EnvelopeStatus.Sent;
            await _envelopeRepo.UpdateAsync(envelope, ct);
            await _envelopeRepo.SaveChangesAsync(ct);

            // Enqueue invitation email
            var signingLink = $"{_config["App:BaseUrl"]}/sign/{token}";
            var sendEmailPayload = JsonSerializer.Serialize(new SendEmailPayload(
                To:            job.RecipientEmail,
                ToName:        job.RecipientName,
                SigningLink:   signingLink,
                ExpiresAt:     expiresAt,
                EmailType:     "SigningInvitation",
                EnvelopeTitle: ctx.EnvelopeTitle,
                SenderName:    merchant.Name));

            await _outbox.AddAsync(new OutboxQueue
            {
                Id        = Guid.NewGuid(),
                JobType   = JobTypes.SendEmail,
                Payload   = sendEmailPayload,
                Status    = JobStatus.Pending,
                CreatedAt = DateTime.UtcNow,
            }, ct);
            await _outbox.SaveChangesAsync(ct);

            job.Status           = "Sent";
            job.CreatedEnvelopeId = envelope.Id;
            job.ProcessedAt      = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BulkSend: job {JobId} failed.", jobId);
            job.Status       = "Failed";
            job.ErrorMessage = ex.Message;
            job.ProcessedAt  = DateTime.UtcNow;
        }

        await _bulkRepo.UpdateAsync(job, ct);
        await _bulkRepo.SaveChangesAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static (List<Dictionary<string, string>> Rows, List<BulkSendRowError> Errors) ParseCsv(string csvContent)
    {
        var rows   = new List<Dictionary<string, string>>();
        var errors = new List<BulkSendRowError>();

        if (string.IsNullOrWhiteSpace(csvContent))
            return (rows, errors);

        var lines = csvContent.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2)
        {
            errors.Add(new BulkSendRowError(1, string.Empty, "CSV must have a header row and at least one data row."));
            return (rows, errors);
        }

        var headers = SplitCsvLine(lines[0]);
        for (var i = 1; i < lines.Length; i++)
        {
            var values = SplitCsvLine(lines[i]);
            if (values.Length != headers.Length)
            {
                errors.Add(new BulkSendRowError(i + 1, string.Empty, $"Column count mismatch on row {i + 1}."));
                continue;
            }

            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var j = 0; j < headers.Length; j++)
                row[headers[j].Trim()] = values[j].Trim().Trim('"');

            rows.Add(row);
        }

        return (rows, errors);
    }

    private static string[] SplitCsvLine(string line) =>
        line.Split(',');

    private static string ApplyMergeTags(
        string template,
        string name,
        string? company,
        Dictionary<string, string> extra)
    {
        var result = template
            .Replace("{{Name}}", name, StringComparison.OrdinalIgnoreCase)
            .Replace("{{Company}}", company ?? string.Empty, StringComparison.OrdinalIgnoreCase);

        foreach (var (key, value) in extra)
            result = result.Replace($"{{{{{key}}}}}", value, StringComparison.OrdinalIgnoreCase);

        return result;
    }

    private static byte[] ApplyMergeTagsToBytes(byte[] docBytes, Dictionary<string, string> mergeData)
    {
        try
        {
            var text = Encoding.UTF8.GetString(docBytes);
            foreach (var (key, value) in mergeData)
                text = text.Replace($"{{{{{key}}}}}", value, StringComparison.OrdinalIgnoreCase);
            return Encoding.UTF8.GetBytes(text);
        }
        catch
        {
            return docBytes; // Non-text document — return as-is
        }
    }
}

// Internal context stored in MergeDataJson column
file sealed record BulkJobMergeContext(
    string TemplateDocumentBase64,
    string TemplateDocumentFileName,
    string TemplateDocumentContentType,
    string EnvelopeTitle,
    string SignerRole,
    string SignerMessage,
    int? TokenTtlDays,
    string? RedirectUrl,
    Dictionary<string, string> MergeData);
