using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public sealed class EnvelopePaymentRepository : IEnvelopePaymentRepository
{
    private readonly AppDbContext _db;
    public EnvelopePaymentRepository(AppDbContext db) => _db = db;

    public async Task<EnvelopePayment?> GetByEnvelopeIdAsync(Guid envelopeId, CancellationToken ct = default)
        => await _db.EnvelopePayments.FirstOrDefaultAsync(p => p.EnvelopeId == envelopeId, ct);

    public async Task<EnvelopePayment?> GetByPaymentIntentIdAsync(string paymentIntentId, CancellationToken ct = default)
        => await _db.EnvelopePayments.FirstOrDefaultAsync(p => p.PaymentIntentId == paymentIntentId, ct);

    public async Task AddAsync(EnvelopePayment payment, CancellationToken ct = default)
        => await _db.EnvelopePayments.AddAsync(payment, ct);

    public Task UpdateAsync(EnvelopePayment payment, CancellationToken ct = default)
    {
        _db.EnvelopePayments.Update(payment);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
