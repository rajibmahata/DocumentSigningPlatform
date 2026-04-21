namespace DocumentSigning.Core.Interfaces;

public interface INotificationService
{
    Task NotifyAsync(Guid userId, string title, string body, string type, string? link = null, CancellationToken ct = default);
}
