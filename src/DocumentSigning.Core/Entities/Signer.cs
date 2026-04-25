using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

/// <summary>
/// A single signer within a signing envelope.
/// Each signer gets their own SigningRequest (token + expiry).
/// </summary>
public class Signer
{
    public Guid   Id              { get; set; }
    public Guid   EnvelopeId      { get; set; }
    public string Name            { get; set; } = string.Empty;
    public string Email           { get; set; } = string.Empty;
    public string Role            { get; set; } = "signer";
    public int    Order           { get; set; } = 1;
    public string Message         { get; set; } = string.Empty;
    public SigningStatus Status         { get; set; } = SigningStatus.Pending;
    public string? RejectionReason      { get; set; }
    public DateTime CreatedAt           { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt        { get; set; }

    // Navigation
    public SigningEnvelope? Envelope { get; set; }
}
