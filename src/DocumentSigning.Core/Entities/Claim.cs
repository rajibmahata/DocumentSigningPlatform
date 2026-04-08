using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

public class Claim
{
    public Guid Id { get; set; }
    public string ClaimantName { get; set; } = string.Empty;
    public string ClaimantEmail { get; set; } = string.Empty;
    public ClaimStatus Status { get; set; } = ClaimStatus.Active;
    public Guid? SignedDocRef { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
