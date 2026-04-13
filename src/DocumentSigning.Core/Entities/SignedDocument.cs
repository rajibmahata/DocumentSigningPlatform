namespace DocumentSigning.Core.Entities;

public class SignedDocument
{
    public Guid Id { get; set; }
    public Guid SigningRequestId { get; set; }
    public Guid ClaimId { get; set; }
    public byte[] ContentBytes { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
