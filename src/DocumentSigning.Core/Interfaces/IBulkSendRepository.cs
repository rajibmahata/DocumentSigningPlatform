using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IBulkSendRepository
{
    Task AddRangeAsync(IEnumerable<BulkSendJob> jobs, CancellationToken ct = default);
    Task<BulkSendJob?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<BulkSendJob>> GetByBatchAsync(Guid batchId, CancellationToken ct = default);
    Task<BulkSendJob?> ClaimNextPendingAsync(CancellationToken ct = default);
    Task UpdateAsync(BulkSendJob job, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
