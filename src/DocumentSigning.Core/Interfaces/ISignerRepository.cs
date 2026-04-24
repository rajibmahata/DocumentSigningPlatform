using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISignerRepository
{
    Task<Signer?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
