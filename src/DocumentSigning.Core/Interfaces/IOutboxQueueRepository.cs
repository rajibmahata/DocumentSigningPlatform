using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IOutboxQueueRepository
{
    Task AddAsync(OutboxQueue job, CancellationToken ct = default);
    /// <summary>
    /// Atomically claims one pending job by setting its status to Processing. Returns null if none available.
    /// </summary>
    Task<OutboxQueue?> ClaimNextJobAsync(CancellationToken ct = default);
    Task UpdateAsync(OutboxQueue job, CancellationToken ct = default);
    Task MoveToFailedAsync(OutboxQueue job, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
