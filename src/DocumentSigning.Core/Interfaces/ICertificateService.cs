namespace DocumentSigning.Core.Interfaces;

public interface ICertificateService
{
    /// <summary>
    /// Generates a PDF Certificate of Completion for the given envelope.
    /// Returns null if the envelope does not exist or has not been completed.
    /// </summary>
    Task<byte[]?> GenerateAsync(Guid envelopeId, CancellationToken ct = default);
}
