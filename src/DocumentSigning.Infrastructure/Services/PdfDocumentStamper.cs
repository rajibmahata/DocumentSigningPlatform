using System.Text.RegularExpressions;
using DocumentSigning.Core.Interfaces;
using iText.Forms;
using iText.Forms.Fields;
using iText.IO.Image;
using iText.Kernel.Colors;
using iText.Kernel.Geom;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Data;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using iText.Kernel.Pdf.Xobject;
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

    // Try progressively looser patterns.
    // Some PDF renderers drop curly braces or encode them as different characters,
    // so we fall back to matching just the key token text.
    private static readonly Regex[] SigPatterns =
    [
        new(@"\{signature:[^}]+\}",            RegexOptions.IgnoreCase),
        new(@"signature:[^\s{}\r\n]+",          RegexOptions.IgnoreCase),
        new(@"Please[\+\s\-_]{0,3}Sign[\+\s\-_]{0,3}Here", RegexOptions.IgnoreCase),
        new(@"Please.{0,10}Sign.{0,10}Here",    RegexOptions.IgnoreCase),
    ];

    private static readonly Regex[] DatePatterns =
    [
        new(@"\{date:[^}]+\}",                 RegexOptions.IgnoreCase),
        new(@"date:[^\s{}\r\n]+",               RegexOptions.IgnoreCase),
        new(@"Date[\+\s\-_]{0,3}Here",          RegexOptions.IgnoreCase),
        new(@"Date.{0,5}Here",                  RegexOptions.IgnoreCase),
    ];

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

        // Search every page for placeholder locations — try each fallback pattern
        var sigRect  = FindPlaceholderRect(pdfDoc, SigPatterns,  totalPages, "signature", _logger);
        var dateRect = FindPlaceholderRect(pdfDoc, DatePatterns, totalPages, "date",      _logger);

        if (sigRect is not null)
        {
            RemoveAnnotationsOverlapping(pdfDoc, sigRect.Value.pageNum, sigRect.Value.rect, _logger);
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
            RemoveAnnotationsOverlapping(pdfDoc, dateRect.Value.pageNum, dateRect.Value.rect, _logger);
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
            _logger?.LogWarning(
                "PDF stamp: no signature or date placeholder found on any page. " +
                "Falling back to bottom-right corner of last page.");

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
        PdfDocument pdfDoc, Regex[] patterns, int totalPages,
        string label, Microsoft.Extensions.Logging.ILogger? logger)
    {
        for (int p = 1; p <= totalPages; p++)
        {
            // Collect all text chunks from the page once
            var strategy = new AllChunksStrategy();
            new PdfCanvasProcessor(strategy).ProcessPageContent(pdfDoc.GetPage(p));

            var fullText = strategy.GetFullText();

            // Log extracted text for every page for diagnostics
            logger?.LogInformation("PDF stamp: page {Page} extracted text (first 500 chars): {Text}",
                p, fullText.Length > 500 ? fullText[..500] : fullText);

            // Try each pattern from strictest to most lenient
            foreach (var pattern in patterns)
            {
                var rect = strategy.GetBoundingRect(pattern, fullText);
                if (rect is not null)
                {
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' placeholder on page {Page} using pattern '{Pattern}' → {Rect}",
                        label, p, pattern.ToString(), rect);
                    return (p, rect);
                }
            }
        }

        // ── Fallback 2: page annotations (/Contents text) ────────────────────────────
        for (int p = 1; p <= totalPages; p++)
        {
            foreach (var annot in pdfDoc.GetPage(p).GetAnnotations())
            {
                var text = annot.GetContents()?.ToUnicodeString() ?? string.Empty;
                foreach (var pattern in patterns)
                {
                    if (!pattern.IsMatch(text)) continue;
                    var ra = annot.GetRectangle();
                    if (ra is null) continue;
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' in annotation contents on page {Page}.",
                        label, p);
                    return (p, PdfArrayToRect(ra));
                }
            }
        }

        // ── Fallback 3: AcroForm field name, value, and tooltip ─────────────────────────
        try
        {
            var acroForm = PdfAcroForm.GetAcroForm(pdfDoc, false);
            if (acroForm is not null)
            {
                foreach (var (fName, field) in acroForm.GetAllFormFields())
                {
                    var fValue   = field.GetValueAsString() ?? string.Empty;
                    var fTooltip = field.GetPdfObject().GetAsString(PdfName.TU)?.ToUnicodeString() ?? string.Empty;

                    foreach (var pattern in patterns)
                    {
                        if (!pattern.IsMatch(fName) && !pattern.IsMatch(fValue) && !pattern.IsMatch(fTooltip))
                            continue;

                        foreach (var widget in field.GetWidgets())
                        {
                            var wPage = widget.GetPage();
                            if (wPage is null) continue;
                            var ra = widget.GetRectangle();
                            if (ra is null) continue;
                            int pNum = pdfDoc.GetPageNumber(wPage);
                            logger?.LogInformation(
                                "PDF stamp: found '{Label}' in AcroForm field name/value/tooltip '{Field}' on page {Page}.",
                                label, fName, pNum);
                            return (pNum, PdfArrayToRect(ra));
                        }
                    }
                }
            }
        }
        catch (Exception aex)
        {
            logger?.LogWarning(aex, "PDF stamp: error while searching AcroForm for '{Label}'.", label);
        }

        // ── Fallback 4: widget annotation appearance streams (/AP/N) ────────────────────
        for (int p = 1; p <= totalPages; p++)
        {
            foreach (var annot in pdfDoc.GetPage(p).GetAnnotations())
            {
                try
                {
                    var apDict = annot.GetPdfObject().GetAsDictionary(PdfName.AP);
                    if (apDict is null) continue;
                    var nStream = apDict.GetAsStream(PdfName.N);
                    if (nStream is null) continue;

                    var apStrategy = new AllChunksStrategy();
                    var apProcessor = new PdfCanvasProcessor(apStrategy);
                    var resDict = nStream.GetAsDictionary(PdfName.Resources);
                    var resources = resDict is not null ? new PdfResources(resDict) : new PdfResources();
                    apProcessor.ProcessContent(nStream.GetBytes(), resources);
                    var apText = apStrategy.GetFullText();

                    if (!string.IsNullOrWhiteSpace(apText))
                        logger?.LogInformation(
                            "PDF stamp: annotation AP/N text on page {Page}: {Text}", p, apText);

                    foreach (var pattern in patterns)
                    {
                        if (!pattern.IsMatch(apText)) continue;
                        var ra = annot.GetRectangle();
                        if (ra is null) continue;
                        logger?.LogInformation(
                            "PDF stamp: found '{Label}' in annotation appearance stream on page {Page}.",
                            label, p);
                        return (p, PdfArrayToRect(ra));
                    }
                }
                catch (Exception apEx)
                {
                    logger?.LogDebug(apEx, "PDF stamp: could not read annotation AP stream on page {Page}.", p);
                }
            }
        }

        logger?.LogWarning("PDF stamp: '{Label}' placeholder not found on any of {Total} pages.", label, totalPages);
        return null;
    }

    /// <summary>
    /// Converts a PDF /Rect array [llx lly urx ury] to an iText Rectangle.
    /// Normalises the coordinates so width/height are always positive.
    /// </summary>
    private static Rectangle PdfArrayToRect(PdfArray a)
    {
        float llx = a.GetAsNumber(0)?.FloatValue() ?? 0f;
        float lly = a.GetAsNumber(1)?.FloatValue() ?? 0f;
        float urx = a.GetAsNumber(2)?.FloatValue() ?? 0f;
        float ury = a.GetAsNumber(3)?.FloatValue() ?? 0f;
        if (llx > urx) (llx, urx) = (urx, llx);
        if (lly > ury) (lly, ury) = (ury, lly);
        return new Rectangle(llx, lly, urx - llx, ury - lly);
    }

    /// <summary>
    /// Removes every annotation on the given page whose centre point falls inside
    /// <paramref name="area"/>.  This prevents annotation-based placeholder text
    /// from rendering on top of the freshly-stamped signature image.
    /// </summary>
    private static void RemoveAnnotationsOverlapping(
        PdfDocument pdfDoc, int pageNum, Rectangle area,
        Microsoft.Extensions.Logging.ILogger? logger)
    {
        try
        {
            var page   = pdfDoc.GetPage(pageNum);
            var annots = page.GetAnnotations().ToList(); // snapshot before mutating
            foreach (var a in annots)
            {
                var ra = a.GetRectangle();
                if (ra is null) continue;
                var r  = PdfArrayToRect(ra);
                float cx = r.GetX() + r.GetWidth()  / 2f;
                float cy = r.GetY() + r.GetHeight() / 2f;
                if (cx >= area.GetX() && cx <= area.GetX() + area.GetWidth() &&
                    cy >= area.GetY() && cy <= area.GetY() + area.GetHeight())
                {
                    page.RemoveAnnotation(a);
                }
            }
        }
        catch (Exception ex)
        {
            // Annotation removal is best-effort; do not let it break the stamp.
            logger?.LogWarning(ex, "PDF stamp: could not remove overlapping annotation on page {Page}.", pageNum);
        }
    }

    // ── Strategy that collects all text chunks and finds bounding rects ───────
    private class AllChunksStrategy : ITextExtractionStrategy
    {
        private readonly List<TextChunk> _chunks = new();

        public void EventOccurred(IEventData data, EventType type)
        {
            if (type != EventType.RENDER_TEXT) return;
            var info = (TextRenderInfo)data;
            var text = info.GetText();
            if (string.IsNullOrEmpty(text)) return;

            var baseline = info.GetBaseline();
            var ascent   = info.GetAscentLine();
            var descent  = info.GetDescentLine();

            float x0   = baseline.GetStartPoint().Get(0);
            float x1   = baseline.GetEndPoint().Get(0);
            float yTop = ascent.GetStartPoint().Get(1);
            float yBot = descent.GetStartPoint().Get(1);

            if (x0 > x1) (x0, x1) = (x1, x0);

            _chunks.Add(new TextChunk(text, x0, x1, yBot, yTop));
        }

        public string GetFullText() => string.Concat(_chunks.Select(c => c.Text));

        public void GetResultantText() { }
        string ITextExtractionStrategy.GetResultantText() => string.Empty;

        public ICollection<EventType> GetSupportedEvents() =>
            new HashSet<EventType> { EventType.RENDER_TEXT };

        public Rectangle? GetBoundingRect(Regex pattern, string fullText)
        {
            if (!pattern.IsMatch(fullText)) return null;

            var match = pattern.Match(fullText);
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

            const float pad = 3f;
            return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        }

        private record TextChunk(string Text, float X0, float X1, float YBottom, float YTop);
    }
}
