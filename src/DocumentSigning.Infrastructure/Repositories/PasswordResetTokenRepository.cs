using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly AppDbContext _db;

    public PasswordResetTokenRepository(AppDbContext db) => _db = db;

    public Task<PasswordResetToken?> GetByTokenAsync(string token, CancellationToken ct = default)
        => _db.PasswordResetTokens.FirstOrDefaultAsync(t => t.Token == token, ct);

    public async Task CreateAsync(PasswordResetToken record, CancellationToken ct = default)
        => await _db.PasswordResetTokens.AddAsync(record, ct);

    public Task UpdateAsync(PasswordResetToken record, CancellationToken ct = default)
    {
        _db.PasswordResetTokens.Update(record);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
