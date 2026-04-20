namespace DocumentSigning.Core.Entities;

public class Ticket
{
    public Guid    Id          { get; set; } = Guid.NewGuid();
    public Guid    UserId      { get; set; }
    public Guid?   MerchantId  { get; set; }

    public string  Title       { get; set; } = string.Empty;
    public string  Description { get; set; } = string.Empty;

    /// <summary>Bug | Feedback | FeatureRequest</summary>
    public string  Type        { get; set; } = "Feedback";

    /// <summary>Open | InProgress | Resolved | Closed</summary>
    public string  Status      { get; set; } = "Open";

    /// <summary>Low | Medium | High</summary>
    public string? Priority    { get; set; }

    /// <summary>Optional image attachment (base64). Only valid for Bug and FeatureRequest.</summary>
    public string? AttachmentBase64      { get; set; }
    public string? AttachmentContentType { get; set; }

    public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User                      User     { get; set; } = null!;
    public ICollection<TicketMessage> Messages { get; set; } = new List<TicketMessage>();
}
