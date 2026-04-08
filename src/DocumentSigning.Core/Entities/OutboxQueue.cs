using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

public class OutboxQueue
{
    public Guid Id { get; set; }
    public string JobType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public JobStatus Status { get; set; } = JobStatus.Pending;
    public int RetryCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? Error { get; set; }
}
