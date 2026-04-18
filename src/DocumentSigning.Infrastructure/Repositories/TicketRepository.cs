using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly AppDbContext _db;

    public TicketRepository(AppDbContext db) => _db = db;

    public Task<Ticket?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => _db.Tickets
              .Include(t => t.User)
              .Include(t => t.Messages.OrderBy(m => m.CreatedAt))
              .FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<List<Ticket>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
        => _db.Tickets
              .Include(t => t.User)
              .Include(t => t.Messages)
              .Where(t => t.UserId == userId)
              .OrderByDescending(t => t.CreatedAt)
              .ToListAsync(ct);

    public Task<List<Ticket>> GetAllAsync(CancellationToken ct = default)
        => _db.Tickets
              .Include(t => t.User)
              .Include(t => t.Messages)
              .OrderByDescending(t => t.CreatedAt)
              .ToListAsync(ct);

    public async Task AddTicketAsync(Ticket ticket, CancellationToken ct = default)
        => await _db.Tickets.AddAsync(ticket, ct);

    public async Task AddMessageAsync(TicketMessage message, CancellationToken ct = default)
        => await _db.TicketMessages.AddAsync(message, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
