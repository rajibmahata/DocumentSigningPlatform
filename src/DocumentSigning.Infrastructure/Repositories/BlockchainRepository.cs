using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class BlockchainRepository : IBlockchainRepository
{
    private readonly AppDbContext _db;
    public BlockchainRepository(AppDbContext db) => _db = db;

    public async Task<BlockchainRecord?> GetByEnvelopeIdAsync(Guid envelopeId, CancellationToken ct = default)
        => await _db.BlockchainRecords.FirstOrDefaultAsync(r => r.EnvelopeId == envelopeId, ct);

    public async Task AddAsync(BlockchainRecord record, CancellationToken ct = default)
        => await _db.BlockchainRecords.AddAsync(record, ct);

    public Task UpdateAsync(BlockchainRecord record, CancellationToken ct = default)
    {
        _db.BlockchainRecords.Update(record);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
