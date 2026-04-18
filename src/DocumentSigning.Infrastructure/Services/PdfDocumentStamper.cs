using System.Text.RegularExpressions;
using DocumentSigning.Core.Interfaces;
using iText.IO.Image;
using iText.Kernel.Colors;
using iText.Kernel.Geom;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Data;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using iText.Layout;
using iText.Layout.Element;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Stamps a signature image and date onto PDF files.
/// Tries to replace {signature:...} and {date:...} placeholder text in-place;
/// falls back to appending to the bottom-right of the last page when no placeholders exist.
/// If all stamping attempts fail (e.g. malformed PDF), returns the original document bytes
/// so the signing flow can still complete with the record in the database.
/// </summary>
public class PdfDocumentStamper : IDocumentStamper
{
    private const string PdfContentType = "application/pdf";
    private static readonly Regex SigPattern  = new(@"\{signature:[^}]+\}", RegexOptions.IgnoreCase);
    private static readonly Regex DatePattern = new(@"\{date:[^}]+\}", RegexOptions.IgnoreCase);

    private readonly Microsoft.Extensions.Logging.ILogger? _logger;

    public PdfDocumentStamper(Microsoft.Extensions.Logging.ILogger? logger = null)
    {
        _logger = logger;
    }

    public bool CanHandle(string contentType) =>
        contentType.Equals(PdfContentType, StringComparison.OrdinalIgnoreCase);

    public Task<byte[]> StampAsync(
        byte[] docBytes,
        string contentType,
        byte[] signaturePng,
        string signedDate,
        CancellationToken ct = default)
    {
        // First attempt — standard read
        try
        {
            return Task.FromResult(StampInternal(docBytes, signaturePng, signedDate, unethicalRead: false));
        }
        catch (Exception ex1)
        {
            _logger?.LogWarning(ex1, "PDF stamp attempt 1 failed, retrying with unethical reading.");
        }

        // Second attempt — relaxed reader (handles encrypted / owner-locked PDFs)
        try
        {
            return Task.FromResult(StampInternal(docBytes, signaturePng, signedDate, unethicalRead: true));
        }
        catch (Exception ex2)
        {
            _logger?.LogWarning(ex2,
                "PDF stamp attempt 2 (unethical reading) also failed. " +
                "Returning original document bytes so signing flow can complete.");
        }

        // Graceful fallback — stamp could not be applied (e.g. malformed/unsupported PDF).
        // Return the original bytes unchanged. The signing record is still persisted in the DB.
        return Task.FromResult(docBytes);
    }

    private byte[] StampInternal(byte[] docBytes, byte[] signaturePng, string signedDate, bool unethicalRead)
    {
        using var inputStream  = new MemoryStream(docBytes);
        using var outputStream = new MemoryStream();

        var readerProps = new iText.Kernel.Pdf.ReaderProperties();
        var reader = new PdfReader(inputStream, readerProps);
        if (unethicalRead) reader.SetUnethicalReading(true);
        var writer = new PdfWriter(outputStream);

        using var pdfDoc   = new PdfDocument(reader, writer);
        using var document = new Document(pdfDoc);

        int totalPages = pdfDoc.GetNumberOfPages();

        // Search every page for placeholder locations
        var sigRect  = FindPlaceholderRect(pdfDoc, SigPattern,  totalPages);
        var dateRect = FindPlaceholderRect(pdfDoc, DatePattern, totalPages);

        if (sigRect is not null)
        {
            var page   = sigRect.Value.pageNum;
            var canvas = new PdfCanvas(pdfDoc.GetPage(page));
            canvas.SetFillColor(ColorConstants.WHITE)
                  .Rectangle(sigRect.Value.rect)
                  .Fill();
            canvas.Release();

            float x = sigRect.Value.rect.GetX();
            float y = sigRect.Value.rect.GetY();
            float w = Math.Max(sigRect.Value.rect.GetWidth(), 180f);
            float h = Math.Max(sigRect.Value.rect.GetHeight(), 50f);

            var imageData = ImageDataFactory.Create(signaturePng);
            var sigImage  = new iText.Layout.Element.Image(imageData)
                .SetFixedPosition(page, x, y)
                .SetWidth(w)
                .SetHeight(h);
            document.Add(sigImage);
        }

        if (dateRect is not null)
        {
            var page   = dateRect.Value.pageNum;
            var canvas = new PdfCanvas(pdfDoc.GetPage(page));
            canvas.SetFillColor(ColorConstants.WHITE)
                  .Rectangle(dateRect.Value.rect)
                  .Fill();
            canvas.Release();

            float x = dateRect.Value.rect.GetX();
            float y = dateRect.Value.rect.GetY();
            float w = Math.Max(dateRect.Value.rect.GetWidth(), 200f);

            var datePara = new Paragraph(signedDate)
                .SetFixedPosition(page, x, y, w)
                .SetFontSize(10f);
            document.Add(datePara);
        }

        // No placeholders found — fall back to bottom-right corner of last page
        if (sigRect is null && dateRect is null)
        {
            var lastPage = pdfDoc.GetPage(totalPages);
            var pageSize = lastPage.GetPageSize();
            float pw   = pageSize.GetWidth();
            float imgW = 180f, imgH = 60f;
            float x    = pw - imgW - 40f;
            float y    = 60f;

            var imageData = ImageDataFactory.Create(signaturePng);
            var sigImage  = new iText.Layout.Element.Image(imageData)
                .SetFixedPosition(totalPages, x, y)
                .SetWidth(imgW).SetHeight(imgH);
            document.Add(sigImage);

            var datePara = new Paragraph($"Signed: {signedDate}")
                .SetFixedPosition(totalPages, x, y - 16f, imgW)
                .SetFontSize(8f);
            document.Add(datePara);
        }

        document.Flush();
        pdfDoc.Close();

        return outputStream.ToArray();
    }

    private static (int pageNum, Rectangle rect)? FindPlaceholderRect(
        PdfDocument pdfDoc, Regex pattern, int totalPages)
    {
        for (int p = 1; p <= totalPages; p++)
        {
            var strategy = new RegexTextLocationStrategy(pattern);
            PdfCanvasProcessor processor = new(strategy);
            processor.ProcessPageContent(pdfDoc.GetPage(p));
            var rect = strategy.GetBoundingRect();
            if (rect is not null)
                return (p, rect);
        }
        return null;
    }

    // ── Strategy that finds the accurate bounding rectangle of matched text ─────
    private class RegexTextLocationStrategy : ITextExtractionStrategy
    {
        private readonly Regex _pattern;
        private readonly List<TextChunk> _chunks = new();

        public RegexTextLocationStrategy(Regex pattern) => _pattern = pattern;

        public void EventOccurred(IEventData data, EventType type)
        {
            if (type != EventType.RENDER_TEXT) return;
            var info = (TextRenderInfo)data;
            var text = info.GetText();
            if (string.IsNullOrEmpty(text)) return;

            // Use actual line geometry for accurate coordinates
            var baseline = info.GetBaseline();
            var ascent   = info.GetAscentLine();
            var descent  = info.GetDescentLine();

            float x0     = baseline.GetStartPoint().Get(0);
            float x1     = baseline.GetEndPoint().Get(0);
            float yTop   = ascent.GetStartPoint().Get(1);
            float yBot   = descent.GetStartPoint().Get(1);

            // Ensure x0 <= x1 (handles right-to-left text)
            if (x0 > x1) (x0, x1) = (x1, x0);

            _chunks.Add(new TextChunk(text, x0, x1, yBot, yTop));
        }

        public void GetResultantText() { } // not used
        string ITextExtractionStrategy.GetResultantText() => string.Empty;

        public ICollection<EventType> GetSupportedEvents() =>
            new HashSet<EventType> { EventType.RENDER_TEXT };

        public Rectangle? GetBoundingRect()
        {
            var fullText = string.Concat(_chunks.Select(c => c.Text));
            if (!_pattern.IsMatch(fullText)) return null;

            var match = _pattern.Match(fullText);
            int start = match.Index, end = match.Index + match.Length;

            int pos = 0;
            float minX = float.MaxValue, minY = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue;
            bool found = false;

            foreach (var chunk in _chunks)
            {
                int len      = chunk.Text.Length;
                int chunkEnd = pos + len;

                if (chunkEnd > start && pos < end)
                {
                    minX = Math.Min(minX, chunk.X0);
                    minY = Math.Min(minY, chunk.YBottom);
                    maxX = Math.Max(maxX, chunk.X1);
                    maxY = Math.Max(maxY, chunk.YTop);
                    found = true;
                }
                pos = chunkEnd;
            }

            if (!found) return null;

            // Add a small padding so the white cover rectangle fully erases the text
            const float pad = 3f;
            return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        }

        private record TextChunk(string Text, float X0, float X1, float YBottom, float YTop);
    }
}
