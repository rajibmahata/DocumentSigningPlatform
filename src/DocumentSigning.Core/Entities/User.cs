using DocumentSigning.Core.Enums;

namespace DocumentSigning.Core.Entities;

public class User
{
    public Guid       Id               { get; set; }
    public string     Name             { get; set; } = string.Empty;
    public string     Email            { get; set; } = string.Empty;
    public string     PasswordHash     { get; set; } = string.Empty;
    public string?    Country          { get; set; }
    public bool       IsEmailVerified  { get; set; } = false;
    public AccessRole AccessRole       { get; set; } = AccessRole.User;
    public DateTime   CreatedAt        { get; set; } = DateTime.UtcNow;
}
