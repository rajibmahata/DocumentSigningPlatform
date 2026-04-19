using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly AppDbContext _db;
    public DocumentRepository(AppDbContext db) => _db = db;

    public async Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Documents.FindAsync(new object[] { id }, ct);

    public async Task<Document?> GetWithEnvelopeAsync(Guid id, CancellationToken ct = default)
        => await _db.Documents
            .Include(d => d.Envelope)
                .ThenInclude(e => e!.Merchant)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task AddAsync(Document document, CancellationToken ct = default)
        => await _db.Documents.AddAsync(document, ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
