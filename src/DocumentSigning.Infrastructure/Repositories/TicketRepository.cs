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

    public Task<int> CountAllAsync(CancellationToken ct = default)
        => _db.Tickets.CountAsync(ct);

    public Task<int> CountByStatusAsync(string status, CancellationToken ct = default)
        => _db.Tickets.CountAsync(t => t.Status == status, ct);

    public async Task<List<(DateOnly Date, int Count)>> CountByDayAsync(int days, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));
        var rows = await _db.Tickets
            .Where(t => t.CreatedAt >= since)
            .GroupBy(t => t.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);
        return rows.Select(r => (DateOnly.FromDateTime(r.Date), r.Count)).ToList();
    }

    public async Task AddTicketAsync(Ticket ticket, CancellationToken ct = default)
        => await _db.Tickets.AddAsync(ticket, ct);

    public async Task AddMessageAsync(TicketMessage message, CancellationToken ct = default)
        => await _db.TicketMessages.AddAsync(message, ct);

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
