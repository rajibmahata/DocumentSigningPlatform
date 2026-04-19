using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default);
    /// <summary>Returns the document with Envelope and Envelope.Merchant loaded.</summary>
    Task<Document?> GetWithEnvelopeAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Document document, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
