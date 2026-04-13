using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly AppDbContext _db;

    public EmailVerificationTokenRepository(AppDbContext db) => _db = db;

    public Task<EmailVerificationToken?> GetByTokenAsync(string token, CancellationToken ct = default)
        => _db.EmailVerificationTokens.FirstOrDefaultAsync(t => t.Token == token, ct);

    public async Task CreateAsync(EmailVerificationToken record, CancellationToken ct = default)
        => await _db.EmailVerificationTokens.AddAsync(record, ct);

    public Task UpdateAsync(EmailVerificationToken record, CancellationToken ct = default)
    {
        _db.EmailVerificationTokens.Update(record);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
