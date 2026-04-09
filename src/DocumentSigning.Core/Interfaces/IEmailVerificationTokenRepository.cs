using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IEmailVerificationTokenRepository
{
    Task<EmailVerificationToken?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task CreateAsync(EmailVerificationToken record, CancellationToken ct = default);
    Task UpdateAsync(EmailVerificationToken record, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
