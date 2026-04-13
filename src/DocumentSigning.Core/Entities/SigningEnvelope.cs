using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// A signing envelope groups one or more documents and signers for a single merchant request.
/// </summary>
public class SigningEnvelope
{
    public Guid   Id         { get; set; }
    public Guid   MerchantId { get; set; }
    public string Title      { get; set; } = string.Empty;
    public EnvelopeStatus Status { get; set; } = EnvelopeStatus.Sent;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigations
    public Merchant?      Merchant { get; set; }
    public List<Signer>   Signers  { get; set; } = new();
    public List<Document> Documents { get; set; } = new();
}
