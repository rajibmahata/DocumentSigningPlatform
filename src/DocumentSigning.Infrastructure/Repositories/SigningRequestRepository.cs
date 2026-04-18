using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class SigningRequestRepository : ISigningRequestRepository
{
    private readonly AppDbContext _db;
    public SigningRequestRepository(AppDbContext db) => _db = db;

    public async Task<SigningRequest?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.SigningRequests.FindAsync(new object[] { id }, ct);

    public async Task<SigningRequest?> GetByTokenAsync(string token, CancellationToken ct = default)
        => await _db.SigningRequests
            .FirstOrDefaultAsync(r => r.Token == token, ct);

    public async Task<SigningRequest?> GetByDocumentAndEnvelopeAsync(Guid documentId, Guid envelopeId, CancellationToken ct = default)
        => await _db.SigningRequests
            .Where(r => r.DocumentId == documentId)
            .OrderBy(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task AddAsync(SigningRequest request, CancellationToken ct = default)
        => await _db.SigningRequests.AddAsync(request, ct);

    public Task UpdateAsync(SigningRequest request, CancellationToken ct = default)
    {
        _db.SigningRequests.Update(request);
        return Task.CompletedTask;
    }

    public async Task<bool> TryLockForProcessingAsync(string token, CancellationToken ct = default)
    {
        // Atomic: only updates if currently Pending
        return await _db.SigningRequests
            .Where(r => r.Token == token && r.Status == SigningStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, SigningStatus.Processing), ct) > 0;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
