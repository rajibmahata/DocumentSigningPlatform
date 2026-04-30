using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class DocumentFieldRepository : IDocumentFieldRepository
{
    private readonly AppDbContext _db;
    public DocumentFieldRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<DocumentField>> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default)
        => await _db.DocumentFields.Where(f => f.DocumentId == documentId).ToListAsync(ct);

    public async Task AddRangeAsync(IEnumerable<DocumentField> fields, CancellationToken ct = default)
        => await _db.DocumentFields.AddRangeAsync(fields, ct);

    public async Task DeleteByDocumentIdAsync(Guid documentId, CancellationToken ct = default)
    {
        var rows = await _db.DocumentFields.Where(f => f.DocumentId == documentId).ToListAsync(ct);
        _db.DocumentFields.RemoveRange(rows);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
