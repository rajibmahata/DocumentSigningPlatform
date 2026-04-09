using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class SignedDocumentRepository : ISignedDocumentRepository
{
    private readonly AppDbContext _db;
    public SignedDocumentRepository(AppDbContext db) => _db = db;

    public async Task<SignedDocument?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.SignedDocuments.FindAsync(new object[] { id }, ct);

    public async Task<SignedDocument?> GetByClaimIdAsync(Guid claimId, CancellationToken ct = default)
        => await _db.SignedDocuments
            .FirstOrDefaultAsync(sd => sd.ClaimId == claimId, ct);

    public async Task<SignedDocument?> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default)
        => await _db.SignedDocuments
            .Join(_db.SigningRequests, sd => sd.SigningRequestId, sr => sr.Id, (sd, sr) => new { sd, sr })
            .Where(x => x.sr.DocumentId == documentId)
            .Select(x => x.sd)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(SignedDocument signedDocument, CancellationToken ct = default)
        => await _db.SignedDocuments.AddAsync(signedDocument, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
