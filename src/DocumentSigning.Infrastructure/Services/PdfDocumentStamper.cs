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

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Stamps a signature image and date onto PDF files.
/// Tries to replace {signature:...} and {date:...} placeholder text in-place;
/// falls back to appending to the bottom-right of the last page when no placeholders exist.
/// </summary>
public class PdfDocumentStamper : IDocumentStamper
{
    private const string PdfContentType = "application/pdf";
    private static readonly Regex SigPattern  = new(@"\{signature:[^}]+\}", RegexOptions.IgnoreCase);
    private static readonly Regex DatePattern = new(@"\{date:[^}]+\}", RegexOptions.IgnoreCase);

    public bool CanHandle(string contentType) =>
        contentType.Equals(PdfContentType, StringComparison.OrdinalIgnoreCase);

    public Task<byte[]> StampAsync(
        byte[] docBytes,
        string contentType,
        byte[] signaturePng,
        string signedDate,
        CancellationToken ct = default)
    {
        using var inputStream  = new MemoryStream(docBytes);
        using var outputStream = new MemoryStream();

        var reader = new PdfReader(inputStream);
        var writer = new PdfWriter(outputStream);

        using var pdfDoc   = new PdfDocument(reader, writer);
        using var document = new Document(pdfDoc);

        int totalPages = pdfDoc.GetNumberOfPages();

        // Search every page for placeholder locations
        var sigRect  = FindPlaceholderRect(pdfDoc, SigPattern,  totalPages);
        var dateRect = FindPlaceholderRect(pdfDoc, DatePattern, totalPages);

        if (sigRect is not null)
        {
            // Cover the placeholder text with a white rectangle, then draw the image
            var page   = sigRect.Value.pageNum;
            var canvas = new PdfCanvas(pdfDoc.GetPage(page));
            canvas.SetFillColor(ColorConstants.WHITE)
                  .Rectangle(sigRect.Value.rect)
                  .Fill();
            canvas.Release();

            float x = sigRect.Value.rect.GetX();
            float y = sigRect.Value.rect.GetY();

            var imageData = ImageDataFactory.Create(signaturePng);
            var sigImage  = new iText.Layout.Element.Image(imageData)
                .SetFixedPosition(page, x, y)
                .SetWidth(180f)
                .SetHeight(60f);
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

            var datePara = new Paragraph(signedDate)
                .SetFixedPosition(page, x, y, 200f)
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

        return Task.FromResult(outputStream.ToArray());
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

    // ── Simple strategy that finds the bounding rectangle of matched text ──────
    private class RegexTextLocationStrategy : ITextExtractionStrategy
    {
        private readonly Regex _pattern;
        private readonly List<TextChunk> _chunks = new();

        public RegexTextLocationStrategy(Regex pattern) => _pattern = pattern;

        public void EventOccurred(IEventData data, EventType type)
        {
            if (type != EventType.RENDER_TEXT) return;
            var info = (TextRenderInfo)data;
            _chunks.Add(new TextChunk(info.GetText(), info.GetBaseline().GetStartPoint()));
        }

        public void GetResultantText() { }  // not used
        string ITextExtractionStrategy.GetResultantText() => string.Empty;

        public ICollection<EventType> GetSupportedEvents() =>
            new HashSet<EventType> { EventType.RENDER_TEXT };

        public Rectangle? GetBoundingRect()
        {
            // Build the full page text and see if pattern matches
            var fullText = string.Concat(_chunks.Select(c => c.Text));
            if (!_pattern.IsMatch(fullText)) return null;

            // Approximate: return the bounding box of all chunks whose text
            // overlaps with the match position
            var match = _pattern.Match(fullText);
            int start = match.Index, end = match.Index + match.Length;

            int pos = 0;
            float minX = float.MaxValue, minY = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue;
            bool found = false;

            foreach (var chunk in _chunks)
            {
                int len = chunk.Text.Length;
                int chunkEnd = pos + len;

                if (chunkEnd > start && pos < end)
                {
                    minX = Math.Min(minX, chunk.Point.Get(0));
                    minY = Math.Min(minY, chunk.Point.Get(1));
                    maxX = Math.Max(maxX, chunk.Point.Get(0) + len * 6f); // approx width
                    maxY = Math.Max(maxY, chunk.Point.Get(1) + 12f);
                    found = true;
                }
                pos = chunkEnd;
            }

            return found ? new Rectangle(minX, minY, maxX - minX, maxY - minY) : null;
        }

        private record TextChunk(string Text, iText.Kernel.Geom.Vector Point);
    }
}
