namespace DocumentSigning.Core.Entities;

/// <summary>Blockchain notarization record for a signed envelope.</summary>
public class BlockchainRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnvelopeId { get; set; }
    /// <summary>SHA-256 of all signed document bytes concatenated.</summary>
    public string DocumentHash { get; set; } = string.Empty;
    /// <summary>Blockchain network: "polygon", "ethereum"</summary>
    public string Network { get; set; } = "polygon";
    /// <summary>Transaction hash returned by blockchain node.</summary>
    public string? TransactionHash { get; set; }
    /// <summary>Pending | Confirmed | Failed</summary>
    public string Status { get; set; } = "Pending";
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }

    // Navigation
    public SigningEnvelope Envelope { get; set; } = null!;
}
