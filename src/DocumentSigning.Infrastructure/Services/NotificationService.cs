using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repo;

    public NotificationService(INotificationRepository repo) => _repo = repo;

    public Task NotifyAsync(Guid userId, string title, string body, string type, string? link = null, CancellationToken ct = default) =>
        _repo.CreateAsync(new Notification
        {
            UserId    = userId,
            Title     = title,
            Body      = body,
            Type      = type,
            Link      = link,
            CreatedAt = DateTime.UtcNow,
        }, ct);
}
