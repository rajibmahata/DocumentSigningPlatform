using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class DocumentInsightRepository : IDocumentInsightRepository
{
    private readonly AppDbContext _db;
    public DocumentInsightRepository(AppDbContext db) => _db = db;

    public async Task<DocumentInsight?> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default)
        => await _db.DocumentInsights.FirstOrDefaultAsync(i => i.DocumentId == documentId, ct);

    public async Task AddAsync(DocumentInsight insight, CancellationToken ct = default)
        => await _db.DocumentInsights.AddAsync(insight, ct);

    public Task UpdateAsync(DocumentInsight insight, CancellationToken ct = default)
    {
        _db.DocumentInsights.Update(insight);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
