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
    // Some PDF renderers drop curly braces, encode them differently, or inject spaces
    // between characters (due to TJ-operator kerning). Space-tolerant variants (\s*)
    // handle the case where iText7 inserts synthetic spaces inside the placeholder text.
    private static readonly Regex[] SigPatterns =
    [
        // Strict — exact form with curly braces
        new(@"\{signature:[^}]+\}",                        RegexOptions.IgnoreCase),
        // No curly braces (dropped by font encoding)
        new(@"signature:[^\s{}\r\n]+",                     RegexOptions.IgnoreCase),
        // Human-readable key words — literal + separator
        new(@"Please[\+\s\-_]{0,3}Sign[\+\s\-_]{0,3}Here", RegexOptions.IgnoreCase),
        new(@"Please.{0,10}Sign.{0,10}Here",               RegexOptions.IgnoreCase),
        // Space-tolerant: handles spaces injected between chars by iText7
        new(@"\{\s*signature\s*:[^}]*\}",                  RegexOptions.IgnoreCase),
        new(@"signature\s*:[^\r\n]+",                       RegexOptions.IgnoreCase),
        new(@"P\s*l\s*e\s*a\s*s\s*e.{0,25}S\s*i\s*g\s*n.{0,25}H\s*e\s*r\s*e", RegexOptions.IgnoreCase),
        // URL-decoded form: + decoded to space → "Please Sign Here"
        new(@"Please\s+Sign\s+Here",                        RegexOptions.IgnoreCase),
        // Partial fallback: any text containing the key word "signature"
        new(@"\bsignature\b",                               RegexOptions.IgnoreCase),
    ];

    private static readonly Regex[] DatePatterns =
    [
        // Strict — exact form with curly braces
        new(@"\{date:[^}]+\}",                             RegexOptions.IgnoreCase),
        // No curly braces (dropped by font encoding)
        new(@"date:[^\s{}\r\n]+",                          RegexOptions.IgnoreCase),
        // Human-readable key words
        new(@"Date[\+\s\-_]{0,3}Here",                     RegexOptions.IgnoreCase),
        new(@"Date.{0,5}Here",                             RegexOptions.IgnoreCase),
        // Space-tolerant: handles spaces injected between chars by iText7
        new(@"\{\s*date\s*:[^}]*\}",                       RegexOptions.IgnoreCase),
        new(@"date\s*:[^\r\n]+",                            RegexOptions.IgnoreCase),
        new(@"D\s*a\s*t\s*e.{0,15}H\s*e\s*r\s*e",          RegexOptions.IgnoreCase),
        // URL-decoded form: + decoded to space → "Date Here"
        new(@"Date\s+Here",                                 RegexOptions.IgnoreCase),
        // Partial fallback: "signer" label used as a date anchor
        new(@"signer[\s:]*date",                            RegexOptions.IgnoreCase),
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

            // Also try matching on whitespace-stripped text.
            // iText7 can inject space chars between glyphs when TJ kerning values are large;
            // stripping whitespace from both the extracted text and the chunks lets us
            // still find the placeholder and recover its bounding rectangle.
            foreach (var pattern in patterns)
            {
                var rect = strategy.GetBoundingRectFromStripped(pattern);
                if (rect is not null)
                {
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' placeholder on page {Page} (whitespace-stripped) using pattern '{Pattern}' → {Rect}",
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

        // ── Fallback 5: location-sorted + whitespace-stripped matching ───────────────
        // iText7 fires TextRenderInfo events in PDF stream order, which is not always
        // reading order. Sort chunks top-to-bottom/left-to-right AND strip all whitespace
        // so that character-spaced TJ text still matches.
        for (int p = 1; p <= totalPages; p++)
        {
            var strategy5 = new AllChunksStrategy();
            new PdfCanvasProcessor(strategy5).ProcessPageContent(pdfDoc.GetPage(p));

            foreach (var pattern in patterns)
            {
                var rect = strategy5.GetBoundingRectSortedAndStripped(pattern);
                if (rect is not null)
                {
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' via sorted+stripped strategy on page {Page} " +
                        "using pattern '{Pattern}' → {Rect}",
                        label, p, pattern.ToString(), rect);
                    return (p, rect);
                }
            }
        }

        // ── Fallback 6: LocationTextExtractionStrategy text → stripped bounds ─────────
        // Use iText7's built-in location-aware extraction (handles reading order +
        // word-space insertion) to test whether any pattern matches, then recover the
        // spatial bounds through the stripped chunk index.
        for (int p = 1; p <= totalPages; p++)
        {
            string locText;
            try
            {
                locText = PdfTextExtractor.GetTextFromPage(
                    pdfDoc.GetPage(p), new LocationTextExtractionStrategy());
                logger?.LogInformation(
                    "PDF stamp: page {Page} location-sorted text (first 500 chars): {Text}",
                    p, locText.Length > 500 ? locText[..500] : locText);
            }
            catch (Exception lex)
            {
                logger?.LogDebug(lex, "PDF stamp: LocationTextExtractionStrategy failed on page {Page}.", p);
                continue;
            }

            foreach (var pattern in patterns)
            {
                if (!pattern.IsMatch(locText)) continue;

                // Pattern confirmed present in location-sorted text.
                // Recover bounds by stripping the matched text and searching chunks.
                var matchValue = pattern.Match(locText).Value;
                var compactMatch = Regex.Replace(matchValue, @"\s+", "");

                var strategy6 = new AllChunksStrategy();
                new PdfCanvasProcessor(strategy6).ProcessPageContent(pdfDoc.GetPage(p));

                var compactPattern = new Regex(Regex.Escape(compactMatch), RegexOptions.IgnoreCase);
                var rect = strategy6.GetBoundingRectFromStripped(compactPattern)
                         ?? strategy6.GetBoundingRectFromStripped(pattern);
                if (rect is not null)
                {
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' via LocationTextExtractionStrategy on page {Page} " +
                        "using pattern '{Pattern}' → {Rect}",
                        label, p, pattern.ToString(), rect);
                    return (p, rect);
                }
            }
        }

        // ── Fallback 7: URL-decoded text (replace + with space) ──────────────────────
        // Word processors and PDF export tools sometimes decode the URL-encoded label
        // so "Please+Sign+Here" becomes "Please Sign Here" in the PDF text stream.
        for (int p = 1; p <= totalPages; p++)
        {
            var strategy7 = new AllChunksStrategy();
            new PdfCanvasProcessor(strategy7).ProcessPageContent(pdfDoc.GetPage(p));

            // Try both: decoded full text and decoded stripped text
            var rawText     = strategy7.GetFullText();
            var decodedText = rawText.Replace('+', ' ');

            foreach (var pattern in patterns)
            {
                if (!pattern.IsMatch(decodedText)) continue;

                // The pattern matches in decoded text — try to find the rect using the
                // decoded chunks (rebuild a strategy operating on decoded text).
                var decodedStrategy = new AllChunksStrategy();
                new PdfCanvasProcessor(decodedStrategy).ProcessPageContent(pdfDoc.GetPage(p));

                var rect = decodedStrategy.GetBoundingRectDecoded(pattern);
                if (rect is not null)
                {
                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' via URL-decoded text on page {Page} " +
                        "using pattern '{Pattern}' → {Rect}",
                        label, p, pattern.ToString(), rect);
                    return (p, rect);
                }
            }
        }

        // ── Fallback 8: raw content stream scan ──────────────────────────────────────
        // Read the raw bytes of each page's content stream as Latin-1 text and scan
        // with all patterns. When a match is found, return the nearest text chunk
        // bounding rectangle from the parsed strategy as an approximation.
        for (int p = 1; p <= totalPages; p++)
        {
            try
            {
                var pageObj  = pdfDoc.GetPage(p).GetPdfObject();
                var contents = pageObj.Get(PdfName.Contents);
                string rawStream = string.Empty;

                if (contents is PdfStream stream8)
                {
                    rawStream = System.Text.Encoding.Latin1.GetString(stream8.GetBytes(true));
                }
                else if (contents is PdfArray arr8)
                {
                    var sb8 = new System.Text.StringBuilder();
                    foreach (var item in arr8)
                        if (item is PdfStream s8)
                            sb8.Append(System.Text.Encoding.Latin1.GetString(s8.GetBytes(true)));
                    rawStream = sb8.ToString();
                }

                if (string.IsNullOrEmpty(rawStream)) continue;

                // Also try decoded version of raw stream
                var decodedStream = rawStream.Replace('+', ' ');

                foreach (var pattern in patterns)
                {
                    if (!pattern.IsMatch(rawStream) && !pattern.IsMatch(decodedStream)) continue;

                    logger?.LogInformation(
                        "PDF stamp: found '{Label}' in raw content stream on page {Page}. " +
                        "Using approximate position from text chunks.",
                        label, p);

                    // Return approximate position: centroid of all text chunks on this page
                    var strategy8 = new AllChunksStrategy();
                    new PdfCanvasProcessor(strategy8).ProcessPageContent(pdfDoc.GetPage(p));
                    var approxRect = strategy8.GetApproximateRectForKeyword(pattern);
                    if (approxRect is not null)
                        return (p, approxRect);

                    // Last resort: use full page area
                    var pageSize = pdfDoc.GetPage(p).GetPageSize();
                    return (p, new Rectangle(
                        pageSize.GetWidth() - 250f,
                        pageSize.GetHeight() / 2f - 30f,
                        200f, 50f));
                }
            }
            catch (Exception ex8)
            {
                logger?.LogDebug(ex8, "PDF stamp: raw content stream scan failed on page {Page}.", p);
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

        /// <summary>
        /// Sorts chunks by reading order (top-to-bottom, left-to-right), strips all whitespace,
        /// concatenates, and finds the bounding rectangle for the first pattern match.
        /// Handles both wrong render order and spaces injected between glyphs.
        /// </summary>
        public Rectangle? GetBoundingRectSortedAndStripped(Regex pattern)
        {
            // Group chunks into lines (within 3 pt of same Y), then sort lines top→bottom
            // and chunks within a line left→right.
            var sorted = _chunks
                .OrderByDescending(c => (float)Math.Round(c.YTop / 4f) * 4f)
                .ThenBy(c => c.X0)
                .ToList();

            var sb        = new System.Text.StringBuilder();
            var positions = new List<(int compactStart, int compactEnd, int idx)>();

            for (int i = 0; i < sorted.Count; i++)
            {
                var stripped = Regex.Replace(sorted[i].Text, @"\s", "");
                if (stripped.Length == 0) continue;
                int start = sb.Length;
                sb.Append(stripped);
                positions.Add((start, sb.Length, i));
            }

            var compactText = sb.ToString();
            if (!pattern.IsMatch(compactText)) return null;

            var match      = pattern.Match(compactText);
            int matchStart = match.Index;
            int matchEnd   = match.Index + match.Length;

            float minX = float.MaxValue, minY = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue;
            bool  found = false;

            foreach (var (compactStart, compactEnd, idx) in positions)
            {
                if (compactEnd > matchStart && compactStart < matchEnd)
                {
                    var chunk = sorted[idx];
                    minX = Math.Min(minX, chunk.X0);
                    minY = Math.Min(minY, chunk.YBottom);
                    maxX = Math.Max(maxX, chunk.X1);
                    maxY = Math.Max(maxY, chunk.YTop);
                    found = true;
                }
            }

            if (!found) return null;
            const float pad = 3f;
            return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        }

        /// <summary>
        /// Strips all whitespace from each chunk's text (in original render order), rebuilds
        /// a compact string, then finds the bounding rectangle for the first pattern match.
        /// Handles PDFs where iText7 injects synthetic spaces between glyphs
        /// due to TJ-operator kerning values.
        /// </summary>
        public Rectangle? GetBoundingRectFromStripped(Regex pattern)
        {
            var sb        = new System.Text.StringBuilder();
            var positions = new List<(int compactStart, int compactEnd, int chunkIdx)>();

            for (int i = 0; i < _chunks.Count; i++)
            {
                // Remove every whitespace character from the chunk text
                var stripped = Regex.Replace(_chunks[i].Text, @"\s", "");
                if (stripped.Length == 0) continue;

                int start = sb.Length;
                sb.Append(stripped);
                positions.Add((start, sb.Length, i));
            }

            var compactText = sb.ToString();
            if (!pattern.IsMatch(compactText)) return null;

            var match      = pattern.Match(compactText);
            int matchStart = match.Index;
            int matchEnd   = match.Index + match.Length;

            float minX = float.MaxValue, minY = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue;
            bool  found = false;

            foreach (var (compactStart, compactEnd, idx) in positions)
            {
                if (compactEnd > matchStart && compactStart < matchEnd)
                {
                    var chunk = _chunks[idx];
                    minX = Math.Min(minX, chunk.X0);
                    minY = Math.Min(minY, chunk.YBottom);
                    maxX = Math.Max(maxX, chunk.X1);
                    maxY = Math.Max(maxY, chunk.YTop);
                    found = true;
                }
            }

            if (!found) return null;

            const float pad = 3f;
            return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        }

        private record TextChunk(string Text, float X0, float X1, float YBottom, float YTop);

        /// <summary>
        /// Replaces '+' with ' ' in every chunk's text (URL-decode), then builds a compact
        /// whitespace-stripped string and finds the bounding rectangle for the pattern match.
        /// </summary>
        public Rectangle? GetBoundingRectDecoded(Regex pattern)
        {
            var sb        = new System.Text.StringBuilder();
            var positions = new List<(int compactStart, int compactEnd, int chunkIdx)>();

            for (int i = 0; i < _chunks.Count; i++)
            {
                var decoded  = _chunks[i].Text.Replace('+', ' ');
                var stripped = Regex.Replace(decoded, @"\s", "");
                if (stripped.Length == 0) continue;

                int start = sb.Length;
                sb.Append(stripped);
                positions.Add((start, sb.Length, i));
            }

            var compactText = sb.ToString();
            if (!pattern.IsMatch(compactText)) return null;

            var match      = pattern.Match(compactText);
            int matchStart = match.Index;
            int matchEnd   = match.Index + match.Length;

            float minX = float.MaxValue, minY = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue;
            bool  found = false;

            foreach (var (compactStart, compactEnd, idx) in positions)
            {
                if (compactEnd > matchStart && compactStart < matchEnd)
                {
                    var chunk = _chunks[idx];
                    minX = Math.Min(minX, chunk.X0);
                    minY = Math.Min(minY, chunk.YBottom);
                    maxX = Math.Max(maxX, chunk.X1);
                    maxY = Math.Max(maxY, chunk.YTop);
                    found = true;
                }
            }

            if (!found) return null;
            const float pad = 3f;
            return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
        }

        /// <summary>
        /// Finds the bounding rectangle of the chunk whose text best matches the pattern,
        /// or falls back to the centroid region if no single chunk matches.
        /// Used as an approximation when the placeholder was found in the raw stream
        /// but position recovery through iText7 events fails.
        /// </summary>
        public Rectangle? GetApproximateRectForKeyword(Regex pattern)
        {
            // First: try to find a single chunk that matches the pattern (or decoded version)
            foreach (var chunk in _chunks)
            {
                var decoded = chunk.Text.Replace('+', ' ');
                if (pattern.IsMatch(chunk.Text) || pattern.IsMatch(decoded))
                {
                    const float pad = 5f;
                    return new Rectangle(
                        chunk.X0 - pad, chunk.YBottom - pad,
                        chunk.X1 - chunk.X0 + pad * 2,
                        chunk.YTop - chunk.YBottom + pad * 2);
                }
            }

            // Second: try nearby chunks using the compact stripped approach
            if (_chunks.Count == 0) return null;

            // Sort by position and look for keyword proximity
            var sorted = _chunks.OrderByDescending(c => c.YTop).ThenBy(c => c.X0).ToList();
            for (int window = 3; window <= 20; window++)
            {
                for (int i = 0; i <= sorted.Count - window; i++)
                {
                    var windowText = string.Concat(sorted.Skip(i).Take(window).Select(c => c.Text.Replace('+', ' ')));
                    if (!pattern.IsMatch(windowText)) continue;

                    var slice = sorted.Skip(i).Take(window).ToList();
                    float minX = slice.Min(c => c.X0),   minY = slice.Min(c => c.YBottom);
                    float maxX = slice.Max(c => c.X1),   maxY = slice.Max(c => c.YTop);
                    const float pad = 3f;
                    return new Rectangle(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);
                }
            }

            return null;
        }
    }
}
