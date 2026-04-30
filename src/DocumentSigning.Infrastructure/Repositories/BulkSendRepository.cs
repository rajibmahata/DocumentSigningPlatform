using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class BulkSendRepository : IBulkSendRepository
{
    private readonly AppDbContext _db;
    public BulkSendRepository(AppDbContext db) => _db = db;

    public async Task AddRangeAsync(IEnumerable<BulkSendJob> jobs, CancellationToken ct = default)
        => await _db.BulkSendJobs.AddRangeAsync(jobs, ct);

    public async Task<BulkSendJob?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.BulkSendJobs.FindAsync([id], ct);

    public async Task<IReadOnlyList<BulkSendJob>> GetByBatchAsync(Guid batchId, CancellationToken ct = default)
        => await _db.BulkSendJobs.Where(j => j.BatchId == batchId).ToListAsync(ct);

    public async Task<BulkSendJob?> ClaimNextPendingAsync(CancellationToken ct = default)
    {
        // Simple FIFO — production would use skip-locked or pessimistic lock
        var job = await _db.BulkSendJobs
            .Where(j => j.Status == "Pending")
            .OrderBy(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (job is null) return null;

        job.Status = "Processing";
        await _db.SaveChangesAsync(ct);
        return job;
    }

    public Task UpdateAsync(BulkSendJob job, CancellationToken ct = default)
    {
        _db.BulkSendJobs.Update(job);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
