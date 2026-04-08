using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Routes stamping to the correct stamper implementation (PDF or DOCX).
/// Registered as IDocumentStamper in DI.
/// </summary>
public class DocumentStamperDispatcher : IDocumentStamper
{
    private readonly PdfDocumentStamper _pdfStamper = new();
    private readonly DocxDocumentStamper _docxStamper = new();

    public async Task<byte[]> StampAsync(
        byte[] docBytes,
        string contentType,
        byte[] signaturePng,
        string signedDate,
        CancellationToken ct = default)
    {
        if (_pdfStamper.CanHandle(contentType))
            return await _pdfStamper.StampAsync(docBytes, contentType, signaturePng, signedDate, ct);

        if (_docxStamper.CanHandle(contentType))
            return await _docxStamper.StampAsync(docBytes, contentType, signaturePng, signedDate, ct);

        throw new NotSupportedException($"Unsupported document content type: {contentType}");
    }
}
