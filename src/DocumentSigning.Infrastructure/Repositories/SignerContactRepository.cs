using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class SignerContactRepository : ISignerContactRepository
{
    private readonly AppDbContext _db;

    public SignerContactRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<SignerContact>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _db.SignerContacts
            .Where(c => c.UserId == userId && c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<SignerContact>> SearchAsync(Guid userId, string query, CancellationToken ct = default)
    {
        var q = query.ToLower().Trim();
        return await _db.SignerContacts
            .Where(c => c.UserId == userId && c.IsActive &&
                        (c.Name.ToLower().Contains(q) || c.Email.ToLower().Contains(q)))
            .OrderBy(c => c.Name)
            .Take(20)
            .ToListAsync(ct);
    }

    public async Task<SignerContact?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.SignerContacts.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<SignerContact?> GetByEmailAsync(Guid userId, string email, CancellationToken ct = default)
        => await _db.SignerContacts
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Email.ToLower() == email.ToLower(), ct);

    public async Task AddAsync(SignerContact contact, CancellationToken ct = default)
        => await _db.SignerContacts.AddAsync(contact, ct);

    public Task UpdateAsync(SignerContact contact, CancellationToken ct = default)
    {
        _db.SignerContacts.Update(contact);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(SignerContact contact, CancellationToken ct = default)
    {
        _db.SignerContacts.Remove(contact);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
