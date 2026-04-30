using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IDocumentInsightRepository
{
    Task<DocumentInsight?> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default);
    Task AddAsync(DocumentInsight insight, CancellationToken ct = default);
    Task UpdateAsync(DocumentInsight insight, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
