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
        // Load doc IDs for this envelope
        var docIds = await _db.Documents
            .Where(d => d.EnvelopeId == envelopeId)
            .Select(d => d.Id)
            .ToListAsync(ct);
        if (docIds.Count == 0) return 0;
        // Load matching signing requests in memory, then update — avoids OPENJSON/CTE SQL compat issues
        var requests = await _db.SigningRequests
            .Where(sr => sr.Status == SigningStatus.Pending || sr.Status == SigningStatus.Processing)
            .ToListAsync(ct);
        var toExpire = requests.Where(sr => docIds.Contains(sr.DocumentId)).ToList();
        foreach (var r in toExpire)
            r.Status = SigningStatus.Expired;
        await _db.SaveChangesAsync(ct);
        return toExpire.Count;
    }

    public async Task<List<PendingReminderDto>> GetPendingRemindersAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        // Use a broad upper cap so EF can push the filter to SQL, then per-merchant window is applied below
        var broadCap = now.AddHours(72);

        return await _db.SigningRequests
            .Where(sr =>
                sr.Status == SigningStatus.Pending &&
                sr.ReminderSentAt == null &&
                sr.ExpiresAt > now &&
                sr.ExpiresAt <= broadCap)
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
            .Where(x =>
                x.m.ReminderEnabled &&
                EF.Functions.DateDiffHour(now, x.sr.ExpiresAt) <= x.m.ReminderWindowHours)
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
