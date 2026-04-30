using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IDocumentFieldRepository
{
    Task<IReadOnlyList<DocumentField>> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<DocumentField> fields, CancellationToken ct = default);
    Task DeleteByDocumentIdAsync(Guid documentId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
