using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class SigningEnvelopeRepository : ISigningEnvelopeRepository
{
    private readonly AppDbContext _db;
    public SigningEnvelopeRepository(AppDbContext db) => _db = db;

    public async Task<SigningEnvelope?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Include(e => e.Documents)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<SigningEnvelope>> GetByMerchantAsync(Guid merchantId, CancellationToken ct = default)
        => await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Include(e => e.Documents)
            .Where(e => e.MerchantId == merchantId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

    public async Task AddAsync(SigningEnvelope envelope, CancellationToken ct = default)
        => await _db.SigningEnvelopes.AddAsync(envelope, ct);

    public Task UpdateAsync(SigningEnvelope envelope, CancellationToken ct = default)
    {
        _db.SigningEnvelopes.Update(envelope);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
