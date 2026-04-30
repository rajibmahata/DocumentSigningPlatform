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
/// Notarises completed envelopes on a blockchain by submitting the hash of all
/// signed document bytes.  Stub implementation logs the hash.
/// Production: add Nethereum NuGet and call the configured RPC endpoint.
/// </summary>
public sealed class BlockchainService : IBlockchainService
{
    private readonly IBlockchainRepository          _blockchainRepo;
    private readonly ISigningEnvelopeRepository     _envelopeRepo;
    private readonly ISignedDocumentRepository      _signedDocRepo;
    private readonly IOutboxQueueRepository         _outbox;
    private readonly IConfiguration                 _config;
    private readonly ILogger<BlockchainService>     _logger;

    public BlockchainService(
        IBlockchainRepository blockchainRepo,
        ISigningEnvelopeRepository envelopeRepo,
        ISignedDocumentRepository signedDocRepo,
        IOutboxQueueRepository outbox,
        IConfiguration config,
        ILogger<BlockchainService> logger)
    {
        _blockchainRepo = blockchainRepo;
        _envelopeRepo   = envelopeRepo;
        _signedDocRepo  = signedDocRepo;
        _outbox         = outbox;
        _config         = config;
        _logger         = logger;
    }

    public async Task EnqueueNotarizationAsync(Guid envelopeId, CancellationToken ct = default)
    {
        // Idempotent: skip if already queued/confirmed
        var existing = await _blockchainRepo.GetByEnvelopeIdAsync(envelopeId, ct);
        if (existing is { Status: "Confirmed" }) return;

        if (existing is null)
        {
            await _blockchainRepo.AddAsync(new BlockchainRecord
            {
                Id           = Guid.NewGuid(),
                EnvelopeId   = envelopeId,
                DocumentHash = string.Empty,
                Network      = _config["Blockchain:Network"] ?? "polygon",
                Status       = "Pending",
                CreatedAt    = DateTime.UtcNow,
            }, ct);
            await _blockchainRepo.SaveChangesAsync(ct);
        }

        var payload = JsonSerializer.Serialize(new BlockchainNotarizePayload(envelopeId));
        await _outbox.AddAsync(new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.BlockchainNotarize,
            Payload   = payload,
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        }, ct);
        await _outbox.SaveChangesAsync(ct);
    }

    public async Task<BlockchainRecordDto?> GetRecordAsync(Guid envelopeId, CancellationToken ct = default)
    {
        var e = await _blockchainRepo.GetByEnvelopeIdAsync(envelopeId, ct);
        return e is null ? null : Map(e);
    }

    public async Task ProcessNotarizationAsync(Guid envelopeId, CancellationToken ct = default)
    {
        var record = await _blockchainRepo.GetByEnvelopeIdAsync(envelopeId, ct);
        if (record is null)
        {
            _logger.LogWarning("Blockchain: no record found for envelope {EnvelopeId}", envelopeId);
            return;
        }

        try
        {
            // Compute composite hash from all signed documents for this envelope
            var envelope = await _envelopeRepo.GetByIdAsync(envelopeId, ct);
            if (envelope is null) throw new InvalidOperationException($"Envelope {envelopeId} not found.");

            var hash = await ComputeEnvelopeHashAsync(envelope, ct);

            var txHash = await SubmitToBlockchainAsync(hash, ct);

            record.DocumentHash    = hash;
            record.TransactionHash = txHash;
            record.Status          = "Confirmed";
            record.ConfirmedAt     = DateTime.UtcNow;

            _logger.LogInformation(
                "Blockchain: envelope {EnvelopeId} notarised. Hash={Hash} Tx={Tx}",
                envelopeId, hash, txHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Blockchain: notarization failed for envelope {EnvelopeId}", envelopeId);
            record.Status       = "Failed";
            record.ErrorMessage = ex.Message;
        }

        await _blockchainRepo.UpdateAsync(record, ct);
        await _blockchainRepo.SaveChangesAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<string> ComputeEnvelopeHashAsync(SigningEnvelope envelope, CancellationToken ct)
    {
        // Hash all signed document bytes in deterministic order (by SignedDocument.Id)
        var signedDocs = await _signedDocRepo.GetByEnvelopeIdAsync(envelope.Id, ct);

        using var sha = SHA256.Create();
        var combined = new List<byte>();

        foreach (var sd in signedDocs.OrderBy(x => x.Id))
            combined.AddRange(sd.ContentBytes);

        // If no signed documents yet, hash the title + envelope id as a placeholder
        if (combined.Count == 0)
            combined.AddRange(Encoding.UTF8.GetBytes($"{envelope.Id}:{envelope.Title}"));

        var hash = sha.ComputeHash([.. combined]);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private async Task<string> SubmitToBlockchainAsync(string hash, CancellationToken ct)
    {
        var rpcUrl     = _config["Blockchain:RpcUrl"];
        var privateKey = _config["Blockchain:PrivateKey"];

        if (string.IsNullOrWhiteSpace(rpcUrl) || string.IsNullOrWhiteSpace(privateKey))
        {
            // Stub: generate a deterministic fake tx hash for dev/test
            _logger.LogWarning("Blockchain RPC not configured. Returning stub transaction hash.");
            return $"0x{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(hash))).ToLowerInvariant()}";
        }

        // Production: use Nethereum
        // var web3 = new Nethereum.Web3.Web3(new Nethereum.Web3.Accounts.Account(privateKey), rpcUrl);
        // var receipt = await web3.Eth.Transactions.SendTransaction.SendRequestAsync(...);
        // return receipt.TransactionHash;
        throw new NotSupportedException("Live blockchain submission requires Nethereum NuGet package.");
    }

    private static BlockchainRecordDto Map(BlockchainRecord e) =>
        new(e.Id, e.EnvelopeId, e.DocumentHash, e.Network, e.TransactionHash, e.Status, e.CreatedAt, e.ConfirmedAt);
}
