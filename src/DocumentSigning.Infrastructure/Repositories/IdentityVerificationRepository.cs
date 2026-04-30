using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class IdentityVerificationRepository : IIdentityVerificationRepository
{
    private readonly AppDbContext _db;
    public IdentityVerificationRepository(AppDbContext db) => _db = db;

    public async Task<IdentityVerification?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.IdentityVerifications.FindAsync([id], ct);

    public async Task<IdentityVerification?> GetBySigningRequestAsync(Guid signingRequestId, CancellationToken ct = default)
        => await _db.IdentityVerifications
            .Where(v => v.SigningRequestId == signingRequestId)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(IdentityVerification verification, CancellationToken ct = default)
        => await _db.IdentityVerifications.AddAsync(verification, ct);

    public Task UpdateAsync(IdentityVerification verification, CancellationToken ct = default)
    {
        _db.IdentityVerifications.Update(verification);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
