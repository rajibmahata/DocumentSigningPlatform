using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface INotificationRepository
{
    Task<List<Notification>> GetRecentAsync(Guid userId, int limit = 30, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
    Task CreateAsync(Notification notification, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);
    Task MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
}
