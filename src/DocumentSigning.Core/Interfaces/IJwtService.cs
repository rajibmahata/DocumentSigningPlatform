using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
}
