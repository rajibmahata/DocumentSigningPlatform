namespace DocumentSigning.Core.Entities;

/// <summary>
/// A saved signer contact belonging to a specific user.
/// Scoped per user — UserId+Email is unique.
/// </summary>
public class SignerContact
{
    public Guid   Id        { get; set; } = Guid.NewGuid();
    public Guid   UserId    { get; set; }

    public string Name      { get; set; } = string.Empty;
    public string Email     { get; set; } = string.Empty;

    /// <summary>Flexible role string, e.g. "signer", "witness", "notary". Default = "signer".</summary>
    public string Role      { get; set; } = "signer";

    public string? Phone    { get; set; }
    public string? Company  { get; set; }

    public bool   IsActive  { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User? User { get; set; }
}
