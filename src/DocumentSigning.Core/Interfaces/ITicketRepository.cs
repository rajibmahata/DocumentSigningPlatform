using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ITicketRepository
{
    // ── Tickets ───────────────────────────────────────────────────────────────

    Task<Ticket?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<List<Ticket>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<List<Ticket>> GetAllAsync(CancellationToken ct = default);

    Task AddTicketAsync(Ticket ticket, CancellationToken ct = default);

    // ── Messages ──────────────────────────────────────────────────────────────

    Task AddMessageAsync(TicketMessage message, CancellationToken ct = default);

    // ── Persistence ───────────────────────────────────────────────────────────

    Task SaveChangesAsync(CancellationToken ct = default);
}
