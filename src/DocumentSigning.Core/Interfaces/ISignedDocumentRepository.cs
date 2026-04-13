using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISignedDocumentRepository
{
    Task<SignedDocument?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SignedDocument?> GetByClaimIdAsync(Guid claimId, CancellationToken ct = default);
    Task<SignedDocument?> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default);
    Task<SignedDocument?> GetByEnvelopeAndEmailAsync(Guid envelopeId, string email, CancellationToken ct = default);
    Task AddAsync(SignedDocument signedDocument, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<int> CountAllAsync(CancellationToken ct = default);
}
