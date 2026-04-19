using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IUserRepository
{
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task CreateAsync(User user, CancellationToken ct = default);
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task<int> CountAllAsync(CancellationToken ct = default);
    Task<List<(DateOnly Date, int Count)>> CountByDayAsync(int days, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetPendingAdminsAsync(CancellationToken ct = default);
}
