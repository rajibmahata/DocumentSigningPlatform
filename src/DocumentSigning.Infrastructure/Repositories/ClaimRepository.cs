using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class ClaimRepository : IClaimRepository
{
    private readonly AppDbContext _db;
    public ClaimRepository(AppDbContext db) => _db = db;

    public async Task<Claim?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Claims.FindAsync(new object[] { id }, ct);

    public async Task AddAsync(Claim claim, CancellationToken ct = default)
        => await _db.Claims.AddAsync(claim, ct);

    public Task UpdateAsync(Claim claim, CancellationToken ct = default)
    {
        _db.Claims.Update(claim);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
