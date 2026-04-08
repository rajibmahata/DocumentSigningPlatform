namespace DocumentSigning.Core.Entities;

public class Document
{
    public Guid Id { get; set; }
    public Guid ClaimId { get; set; }
    public Guid? EnvelopeId { get; set; }
    public string DocumentTitle    { get; set; } = string.Empty;
    public string DocumentFileName { get; set; } = string.Empty;
    public byte[] ContentBytes { get; set; } = Array.Empty<byte>();
    public string ContentType { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public SigningEnvelope? Envelope { get; set; }
}
