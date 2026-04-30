using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IBlockchainRepository
{
    Task<BlockchainRecord?> GetByEnvelopeIdAsync(Guid envelopeId, CancellationToken ct = default);
    Task AddAsync(BlockchainRecord record, CancellationToken ct = default);
    Task UpdateAsync(BlockchainRecord record, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
