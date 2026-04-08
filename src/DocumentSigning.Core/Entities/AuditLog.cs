namespace DocumentSigning.Core.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid SigningRequestId { get; set; }
    public Guid ClaimId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
