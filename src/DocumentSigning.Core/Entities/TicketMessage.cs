namespace DocumentSigning.Core.Entities;

public class TicketMessage
{
    public Guid   Id          { get; set; } = Guid.NewGuid();
    public Guid   TicketId    { get; set; }

    /// <summary>User | Admin</summary>
    public string SenderType  { get; set; } = "User";

    public string Message     { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Ticket Ticket { get; set; } = null!;
}
