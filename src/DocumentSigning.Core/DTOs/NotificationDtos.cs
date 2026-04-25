namespace DocumentSigning.Core.DTOs;

public record NotificationDto(
    Guid     Id,
    string   Title,
    string   Body,
    string   Type,
    string?  Link,
    bool     IsRead,
    DateTime CreatedAt);

public record NotificationSummaryDto(
    int  UnreadCount,
    List<NotificationDto> Recent);
