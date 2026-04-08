using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

public class SigningRequest
{
    public Guid Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public Guid ClaimId { get; set; }
    public Guid DocumentId { get; set; }
    public SigningStatus Status { get; set; } = SigningStatus.Pending;
    public DateTime ExpiresAt { get; set; }
    public DateTime? SignedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
