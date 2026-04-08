namespace DocumentSigning.Core.Interfaces;

public interface IDocumentStamper
{
    Task<byte[]> StampAsync(
        byte[] docBytes,
        string contentType,
        byte[] signaturePng,
        string signedDate,
        CancellationToken ct = default);
}
