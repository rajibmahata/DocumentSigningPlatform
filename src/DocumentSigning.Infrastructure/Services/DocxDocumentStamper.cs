using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Stamps DOCX files by replacing {signature:...} and {date:...} placeholders
/// with the drawn/typed signature image and signed date.
/// Handles the common DOCX issue where placeholder text is split across multiple runs.
/// </summary>
public class DocxDocumentStamper : IDocumentStamper
{
    private const string DocxContentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private const string DocContentType = "application/msword";

    // Matches {signature:anything} and {date:anything} — URL-encoded or not
    private static readonly Regex SigPattern  = new(@"\{signature:[^}]+\}", RegexOptions.IgnoreCase);
    private static readonly Regex DatePattern = new(@"\{date:[^}]+\}", RegexOptions.IgnoreCase);

    public bool CanHandle(string contentType) =>
        contentType.Equals(DocxContentType, StringComparison.OrdinalIgnoreCase) ||
        contentType.Equals(DocContentType, StringComparison.OrdinalIgnoreCase);

    public async Task<byte[]> StampAsync(
        byte[] docBytes,
        string contentType,
        byte[] signaturePng,
        string signedDate,
        CancellationToken ct = default)
    {
        using var stream = new MemoryStream();
        await stream.WriteAsync(docBytes, ct);
        stream.Position = 0;

        using var wordDoc = WordprocessingDocument.Open(stream, isEditable: true);
        var body = wordDoc.MainDocumentPart?.Document?.Body
            ?? throw new InvalidOperationException("DOCX body is null.");

        // Work at the paragraph level so we can handle placeholders split across runs.
        foreach (var para in body.Descendants<Paragraph>().ToList())
        {
            // Consolidate all run text in this paragraph into one string.
            var runs = para.Descendants<Run>().ToList();
            var fullText = string.Concat(runs.Select(r => r.InnerText));

            bool hasSig  = SigPattern.IsMatch(fullText);
            bool hasDate = DatePattern.IsMatch(fullText);

            if (!hasSig && !hasDate) continue;

            // -----------------------------------------------------------------
            // Merge strategy: collapse all runs into the first run, remove rest,
            // then operate on a single, clean run.
            // -----------------------------------------------------------------
            ConsolidateRuns(para, fullText);

            // Re-fetch the single consolidated run
            var consolidated = para.Descendants<Run>().FirstOrDefault();
            if (consolidated is null) continue;

            var textElem = consolidated.GetFirstChild<Text>();
            if (textElem is null) continue;

            if (hasDate)
            {
                // Replace {date:...} in-place with the actual signed date.
                textElem.Text = DatePattern.Replace(textElem.Text, signedDate);
                textElem.Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve;
            }

            if (hasSig)
            {
                // Remove the {signature:...} placeholder text, keep any label before it (e.g. "Signed:").
                textElem.Text = SigPattern.Replace(textElem.Text, string.Empty).TrimEnd();

                // Add the signature image as a new run immediately after.
                var imagePart = wordDoc.MainDocumentPart!.AddImagePart(ImagePartType.Png);
                using (var imgStream = new MemoryStream(signaturePng))
                    imagePart.FeedData(imgStream);

                var relationshipId = wordDoc.MainDocumentPart.GetIdOfPart(imagePart);
                var imageRun = BuildImageRun(relationshipId);
                consolidated.InsertAfterSelf(imageRun);
            }
        }

        wordDoc.MainDocumentPart?.Document?.Save();
        wordDoc.Dispose();

        stream.Position = 0;
        return stream.ToArray();
    }

    /// <summary>
    /// Collapses all runs in a paragraph into the first run so placeholder
    /// text that was split across runs becomes a single searchable string.
    /// Only removes runs that share the same parent as the first run (safe for
    /// paragraphs containing hyperlinks or bookmarks).
    /// </summary>
    private static void ConsolidateRuns(Paragraph para, string fullText)
    {
        var runs = para.Descendants<Run>().ToList();
        if (runs.Count == 0) return;

        var first = runs[0];
        var sharedParent = first.Parent;

        // Keep the first run's formatting, set its text to the full paragraph text.
        var firstText = first.GetFirstChild<Text>();
        if (firstText is null)
        {
            firstText = new Text();
            first.AppendChild(firstText);
        }
        firstText.Text = fullText;
        firstText.Space = DocumentFormat.OpenXml.SpaceProcessingModeValues.Preserve;

        // Remove all sibling runs (same parent) to avoid orphaned empty containers.
        foreach (var run in runs.Skip(1))
            run.Remove();
    }

    private static Run BuildImageRun(string relationshipId)
    {
        // ~180pt × 60pt in EMUs (1pt = 12700 EMU)
        long cx = 180 * 12700;
        long cy = 60 * 12700;

        var drawing = new DocumentFormat.OpenXml.Wordprocessing.Drawing(
            new DocumentFormat.OpenXml.Drawing.Wordprocessing.Inline(
                new DocumentFormat.OpenXml.Drawing.Wordprocessing.Extent() { Cx = cx, Cy = cy },
                new DocumentFormat.OpenXml.Drawing.Wordprocessing.DocProperties() { Id = 1, Name = "Signature" },
                new DocumentFormat.OpenXml.Drawing.Wordprocessing.NonVisualGraphicFrameDrawingProperties(
                    new DocumentFormat.OpenXml.Drawing.GraphicFrameLocks() { NoChangeAspect = true }
                ),
                new DocumentFormat.OpenXml.Drawing.Graphic(
                    new DocumentFormat.OpenXml.Drawing.GraphicData(
                        new DocumentFormat.OpenXml.Drawing.Pictures.Picture(
                            new DocumentFormat.OpenXml.Drawing.Pictures.NonVisualPictureProperties(
                                new DocumentFormat.OpenXml.Drawing.Pictures.NonVisualDrawingProperties() { Id = 0, Name = "sig.png" },
                                new DocumentFormat.OpenXml.Drawing.Pictures.NonVisualPictureDrawingProperties()
                            ),
                            new DocumentFormat.OpenXml.Drawing.Pictures.BlipFill(
                                new DocumentFormat.OpenXml.Drawing.Blip() { Embed = relationshipId },
                                new DocumentFormat.OpenXml.Drawing.Stretch(
                                    new DocumentFormat.OpenXml.Drawing.FillRectangle()
                                )
                            ),
                            new DocumentFormat.OpenXml.Drawing.Pictures.ShapeProperties(
                                new DocumentFormat.OpenXml.Drawing.Transform2D(
                                    new DocumentFormat.OpenXml.Drawing.Offset() { X = 0, Y = 0 },
                                    new DocumentFormat.OpenXml.Drawing.Extents() { Cx = cx, Cy = cy }
                                ),
                                new DocumentFormat.OpenXml.Drawing.PresetGeometry(
                                    new DocumentFormat.OpenXml.Drawing.AdjustValueList()
                                ) { Preset = DocumentFormat.OpenXml.Drawing.ShapeTypeValues.Rectangle }
                            )
                        )
                    )
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }
                )
            )
            { DistanceFromTop = 0, DistanceFromBottom = 0, DistanceFromLeft = 0, DistanceFromRight = 0 }
        );

        return new Run(drawing);
    }
}
