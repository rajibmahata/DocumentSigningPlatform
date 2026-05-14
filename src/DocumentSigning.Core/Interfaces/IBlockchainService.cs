using DocumentSigning.Core.DTOs;

namespace DocumentSigning.Core.Interfaces;

public interface IBlockchainService
{
    /// <summary>
    /// Enqueues a blockchain notarization job for a completed envelope.
    /// Hash is computed from all signed document bytes.
    /// </summary>
    Task EnqueueNotarizationAsync(Guid envelopeId, CancellationToken ct = default);

    /// <summary>Returns the blockchain record for an envelope.</summary>
    Task<BlockchainRecordDto?> GetRecordAsync(Guid envelopeId, CancellationToken ct = default);

    /// <summary>Submits the hash to the blockchain (called from background job).</summary>
    Task ProcessNotarizationAsync(Guid envelopeId, CancellationToken ct = default);
}
