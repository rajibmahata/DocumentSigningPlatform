using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class OutboxQueueRepository : IOutboxQueueRepository
{
    private readonly AppDbContext _db;
    public OutboxQueueRepository(AppDbContext db) => _db = db;

    public async Task AddAsync(OutboxQueue job, CancellationToken ct = default)
        => await _db.OutboxQueue.AddAsync(job, ct);

    /// <summary>
    /// Atomically claims one Pending job by setting it to Processing.
    /// Uses ExecuteUpdate to avoid race conditions without requiring explicit transactions.
    /// </summary>
    public async Task<OutboxQueue?> ClaimNextJobAsync(CancellationToken ct = default)
    {
        var job = await _db.OutboxQueue
            .Where(j => j.Status == JobStatus.Pending)
            .OrderBy(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (job is null) return null;

        var affected = await _db.OutboxQueue
            .Where(j => j.Id == job.Id && j.Status == JobStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, JobStatus.Processing), ct);

        // Another worker claimed it before us
        if (affected == 0) return null;

        job.Status = JobStatus.Processing;
        return job;
    }

    public Task UpdateAsync(OutboxQueue job, CancellationToken ct = default)
    {
        _db.OutboxQueue.Update(job);
        return Task.CompletedTask;
    }

    public async Task MoveToFailedAsync(OutboxQueue job, CancellationToken ct = default)
    {
        job.Status = JobStatus.Failed;
        _db.OutboxQueue.Update(job);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
