using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class SignerRepository : ISignerRepository
{
    private readonly AppDbContext _db;
    public SignerRepository(AppDbContext db) => _db = db;

    public async Task<Signer?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Signers.FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
