using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISignerContactRepository
{
    /// <summary>Returns all active contacts for a user, ordered by name.</summary>
    Task<IReadOnlyList<SignerContact>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Searches contacts by name or email prefix for a user.</summary>
    Task<IReadOnlyList<SignerContact>> SearchAsync(Guid userId, string query, CancellationToken ct = default);

    Task<SignerContact?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>Returns a specific contact by userId+email, or null if not found.</summary>
    Task<SignerContact?> GetByEmailAsync(Guid userId, string email, CancellationToken ct = default);

    Task AddAsync(SignerContact contact, CancellationToken ct = default);
    Task UpdateAsync(SignerContact contact, CancellationToken ct = default);
    Task DeleteAsync(SignerContact contact, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
