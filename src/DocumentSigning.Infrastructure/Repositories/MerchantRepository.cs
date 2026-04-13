using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class MerchantRepository : IMerchantRepository
{
    private readonly AppDbContext _db;
    public MerchantRepository(AppDbContext db) => _db = db;

    public async Task<Merchant?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Merchants.FindAsync(new object[] { id }, ct);

    public async Task<Merchant?> GetByApiKeyAsync(string apiKey, CancellationToken ct = default)
        => await _db.Merchants.FirstOrDefaultAsync(m => m.ApiKey == apiKey, ct);

    public async Task<IReadOnlyList<Merchant>> GetAllAsync(CancellationToken ct = default)
        => await _db.Merchants.OrderBy(m => m.Name).ToListAsync(ct);

    public async Task<IReadOnlyList<Merchant>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => await _db.Merchants.Where(m => m.UserId == userId).OrderBy(m => m.Name).ToListAsync(ct);

    public async Task AddAsync(Merchant merchant, CancellationToken ct = default)
        => await _db.Merchants.AddAsync(merchant, ct);

    public Task UpdateAsync(Merchant merchant, CancellationToken ct = default)
    {
        _db.Merchants.Update(merchant);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
