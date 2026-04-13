namespace DocumentSigning.Core.Entities;

public class PasswordResetToken
{
    public Guid     Id        { get; set; }
    public Guid     UserId    { get; set; }
    public string   Token     { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool     IsUsed    { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
