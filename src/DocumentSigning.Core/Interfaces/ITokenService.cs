namespace DocumentSigning.Core.Interfaces;

public interface ITokenService
{
    string GenerateToken(Guid claimId, Guid documentId, out Guid tokenGuid);
    bool ValidateTokenSignature(string token, Guid claimId, Guid documentId);
}
