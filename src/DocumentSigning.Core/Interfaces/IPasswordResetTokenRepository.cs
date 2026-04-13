using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task<PasswordResetToken?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task CreateAsync(PasswordResetToken record, CancellationToken ct = default);
    Task UpdateAsync(PasswordResetToken record, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
