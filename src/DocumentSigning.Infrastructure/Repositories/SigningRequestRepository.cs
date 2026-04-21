using DocumentSigning.Core.DTOs;
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
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<SigningRequest?> GetLatestByEmailAndDocumentAsync(string claimantEmail, Guid documentId, CancellationToken ct = default)
        => await _db.SigningRequests
            .Where(r => r.DocumentId == documentId)
            .Join(_db.Claims.Where(c => c.ClaimantEmail == claimantEmail),
                  sr => sr.ClaimId,
                  c  => c.Id,
                  (sr, _) => sr)
            .OrderByDescending(r => r.CreatedAt)
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

    public async Task<int> ExpireByEnvelopeAsync(Guid envelopeId, CancellationToken ct = default)
    {
        var expirableStatuses = new[] { SigningStatus.Pending, SigningStatus.Processing };
        return await _db.SigningRequests
            .Where(sr =>
                expirableStatuses.Contains(sr.Status) &&
                _db.Documents.Any(d => d.Id == sr.DocumentId && d.EnvelopeId == envelopeId))
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, SigningStatus.Expired), ct);
    }

    public async Task<List<PendingReminderDto>> GetPendingRemindersAsync(int withinHours, CancellationToken ct = default)
    {
        var now       = DateTime.UtcNow;
        var threshold = now.AddHours(withinHours);

        return await _db.SigningRequests
            .Where(sr =>
                sr.Status == SigningStatus.Pending &&
                sr.ReminderSentAt == null &&
                sr.ExpiresAt > now &&
                sr.ExpiresAt <= threshold)
            .Join(_db.Claims,
                sr  => sr.ClaimId,
                c   => c.Id,
                (sr, c) => new { sr, c })
            .Join(_db.Documents,
                x   => x.sr.DocumentId,
                d   => d.Id,
                (x, d) => new { x.sr, x.c, d })
            .Where(x => x.d.EnvelopeId != null)
            .Join(_db.SigningEnvelopes,
                x   => x.d.EnvelopeId,
                e   => e.Id,
                (x, e) => new { x.sr, x.c, x.d, e })
            .Where(x =>
                x.e.Status == EnvelopeStatus.Sent ||
                x.e.Status == EnvelopeStatus.Processing ||
                x.e.Status == EnvelopeStatus.Signed)
            .Join(_db.Merchants,
                x   => x.e.MerchantId,
                m   => m.Id,
                (x, m) => new { x.sr, x.c, x.e, m })
            .Join(_db.Users,
                x   => x.m.UserId,
                u   => u.Id,
                (x, u) => new PendingReminderDto(
                    x.sr.Id,
                    x.sr.Token,
                    x.sr.ExpiresAt,
                    x.c.ClaimantEmail,
                    x.c.ClaimantName,
                    x.e.Title,
                    x.m.Name,
                    x.e.Id,
                    x.e.MerchantId,
                    u.Email,
                    u.Name))
            .ToListAsync(ct);
    }

    public async Task MarkReminderSentAsync(Guid signingRequestId, CancellationToken ct = default)
    {
        await _db.SigningRequests
            .Where(sr => sr.Id == signingRequestId)
            .ExecuteUpdateAsync(
                s => s.SetProperty(r => r.ReminderSentAt, DateTime.UtcNow), ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
