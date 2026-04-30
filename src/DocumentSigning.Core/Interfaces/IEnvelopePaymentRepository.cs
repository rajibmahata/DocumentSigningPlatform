using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IEnvelopePaymentRepository
{
    Task<EnvelopePayment?> GetByEnvelopeIdAsync(Guid envelopeId, CancellationToken ct = default);
    Task<EnvelopePayment?> GetByPaymentIntentIdAsync(string paymentIntentId, CancellationToken ct = default);
    Task AddAsync(EnvelopePayment payment, CancellationToken ct = default);
    Task UpdateAsync(EnvelopePayment payment, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
