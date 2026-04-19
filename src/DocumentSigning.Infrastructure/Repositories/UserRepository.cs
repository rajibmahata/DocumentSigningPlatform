using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default)
        => await _db.Users.OrderBy(u => u.Name).ToListAsync(ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => _db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task CreateAsync(User user, CancellationToken ct = default)
        => await _db.Users.AddAsync(user, ct);

    public Task UpdateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Update(user);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    public async Task<int> CountAllAsync(CancellationToken ct = default)
        => await _db.Users.CountAsync(ct);

    public async Task<List<(DateOnly Date, int Count)>> CountByDayAsync(int days, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));
        var rows = await _db.Users
            .Where(u => u.CreatedAt >= since)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);
        return rows.Select(r => (DateOnly.FromDateTime(r.Date), r.Count)).ToList();
    }

    public async Task<IReadOnlyList<User>> GetPendingAdminsAsync(CancellationToken ct = default)
        => await _db.Users
            .Where(u => u.AccessRole == Core.Enums.AccessRole.Admin && !u.IsActive)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync(ct);
}
