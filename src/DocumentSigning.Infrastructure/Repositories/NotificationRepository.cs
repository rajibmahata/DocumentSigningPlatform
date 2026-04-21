using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;

    public NotificationRepository(AppDbContext db) => _db = db;

    public Task<List<Notification>> GetRecentAsync(Guid userId, int limit = 30, CancellationToken ct = default) =>
        _db.Notifications
           .Where(n => n.UserId == userId)
           .OrderByDescending(n => n.CreatedAt)
           .Take(limit)
           .ToListAsync(ct);

    public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default) =>
        _db.Notifications
           .CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task CreateAsync(Notification notification, CancellationToken ct = default)
    {
        await _db.Notifications.AddAsync(notification, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await _db.Notifications
                 .Where(n => n.UserId == userId && !n.IsRead)
                 .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    public async Task MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        await _db.Notifications
                 .Where(n => n.Id == notificationId && n.UserId == userId)
                 .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }
}
