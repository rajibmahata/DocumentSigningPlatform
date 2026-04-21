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

    public async Task<SigningEnvelope?> GetBySignerEmailAsync(string email, CancellationToken ct = default)
        => await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Where(e => e.Signers.Any(s => s.Email == email))
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<SigningEnvelope>> GetAllBySignerEmailAsync(string email, CancellationToken ct = default)
        => await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Include(e => e.Documents)
            .Include(e => e.Merchant)
            .Where(e => e.Signers.Any(s => s.Email == email))
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

    public async Task<int> CountAllAsync(CancellationToken ct = default)
        => await _db.SigningEnvelopes.CountAsync(ct);

    public async Task<int> CountByStatusAsync(Core.Enums.EnvelopeStatus status, CancellationToken ct = default)
        => await _db.SigningEnvelopes.CountAsync(e => e.Status == status, ct);

    public async Task<List<(DateOnly Date, int Count)>> CountByDayAsync(int days, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));
        var rows = await _db.SigningEnvelopes
            .Where(e => e.CreatedAt >= since)
            .GroupBy(e => e.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);
        return rows.Select(r => (DateOnly.FromDateTime(r.Date), r.Count)).ToList();
    }

    public async Task<List<SigningEnvelope>> GetExpiredActiveEnvelopesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        return await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Include(e => e.Documents)
            .Include(e => e.Merchant).ThenInclude(m => m!.User)
            .Where(e =>
                (e.Status == DocumentSigning.Core.Enums.EnvelopeStatus.Sent ||
                 e.Status == DocumentSigning.Core.Enums.EnvelopeStatus.Processing ||
                 e.Status == DocumentSigning.Core.Enums.EnvelopeStatus.Signed) &&
                e.Documents.Any(d =>
                    _db.SigningRequests.Any(sr =>
                        sr.DocumentId == d.Id &&
                        sr.ExpiresAt < now &&
                        (sr.Status == DocumentSigning.Core.Enums.SigningStatus.Pending ||
                         sr.Status == DocumentSigning.Core.Enums.SigningStatus.Processing))))
            .ToListAsync(ct);
    }
}
