using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using iText.IO.Font.Constants;
using iText.Kernel.Colors;
using iText.Kernel.Font;
using iText.Kernel.Geom;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Borders;
using iText.Layout.Element;
using iText.Layout.Properties;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Generates a PDF Certificate of Completion for a signing envelope using iText7.
/// </summary>
public class CertificateService : ICertificateService
{
    private readonly AppDbContext _db;

    public CertificateService(AppDbContext db) => _db = db;

    public async Task<byte[]?> GenerateAsync(Guid envelopeId, CancellationToken ct = default)
    {
        // ── Load envelope with all related data ──────────────────────────────
        var envelope = await _db.SigningEnvelopes
            .Include(e => e.Signers)
            .Include(e => e.Documents)
            .Include(e => e.Merchant).ThenInclude(m => m!.User)
            .FirstOrDefaultAsync(e => e.Id == envelopeId, ct);

        if (envelope is null) return null;

        // ── Load signing timestamps per signer ───────────────────────────────
        // Key: Signer.Email → SignedAt
        var signedAtMap = await _db.SigningRequests
            .Where(sr =>
                sr.Status == SigningStatus.Signed &&
                _db.Documents.Any(d => d.Id == sr.DocumentId && d.EnvelopeId == envelopeId))
            .Join(_db.Claims,
                sr  => sr.ClaimId,
                c   => c.Id,
                (sr, c) => new { c.ClaimantEmail, sr.SignedAt })
            .GroupBy(x => x.ClaimantEmail)
            .Select(g => new { Email = g.Key, SignedAt = g.Max(x => x.SignedAt) })
            .ToDictionaryAsync(x => x.Email, x => x.SignedAt, StringComparer.OrdinalIgnoreCase, ct);

        // ── Generate PDF ─────────────────────────────────────────────────────
        using var ms     = new MemoryStream();
        using var writer = new PdfWriter(ms);
        using var pdf    = new PdfDocument(writer);
        using var doc    = new Document(pdf, PageSize.A4);

        doc.SetMargins(50, 50, 50, 50);

        var fontBold    = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_BOLD);
        var fontRegular = PdfFontFactory.CreateFont(StandardFonts.HELVETICA);
        var fontItalic  = PdfFontFactory.CreateFont(StandardFonts.HELVETICA_OBLIQUE);

        var brandBlue  = new DeviceRgb(26, 86, 219);
        var lightBlue  = new DeviceRgb(240, 245, 255);
        var darkGray   = new DeviceRgb(55, 65, 81);
        var midGray    = new DeviceRgb(107, 114, 128);
        var lightGray  = new DeviceRgb(243, 244, 246);
        var white      = ColorConstants.WHITE;

        // ── Header banner ────────────────────────────────────────────────────
        var header = new Paragraph("CERTIFICATE OF COMPLETION")
            .SetFont(fontBold)
            .SetFontSize(22)
            .SetFontColor(white)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginBottom(0);

        var headerCell = new Cell()
            .Add(header)
            .SetBackgroundColor(brandBlue)
            .SetBorder(Border.NO_BORDER)
            .SetPadding(24);

        var headerTable = new Table(UnitValue.CreatePercentArray(new float[] { 1 }))
            .UseAllAvailableWidth()
            .SetMarginBottom(24);
        headerTable.AddCell(headerCell);
        doc.Add(headerTable);

        // ── Platform subtitle ────────────────────────────────────────────────
        doc.Add(new Paragraph("Document Signing Platform")
            .SetFont(fontRegular)
            .SetFontSize(11)
            .SetFontColor(midGray)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginBottom(24));

        // ── Envelope summary card ─────────────────────────────────────────────
        var summaryTable = new Table(UnitValue.CreatePercentArray(new float[] { 30, 70 }))
            .UseAllAvailableWidth()
            .SetMarginBottom(28)
            .SetBackgroundColor(lightBlue);

        void AddSummaryRow(string label, string value)
        {
            summaryTable.AddCell(new Cell()
                .Add(new Paragraph(label).SetFont(fontBold).SetFontSize(10).SetFontColor(midGray))
                .SetBorder(Border.NO_BORDER)
                .SetPadding(8)
                .SetBackgroundColor(lightBlue));
            summaryTable.AddCell(new Cell()
                .Add(new Paragraph(value).SetFont(fontRegular).SetFontSize(11).SetFontColor(darkGray))
                .SetBorder(Border.NO_BORDER)
                .SetPadding(8)
                .SetBackgroundColor(lightBlue));
        }

        AddSummaryRow("Document Title",   envelope.Title);
        AddSummaryRow("Envelope ID",      envelope.Id.ToString().ToUpperInvariant());
        AddSummaryRow("Merchant",         envelope.Merchant?.Name ?? "—");
        AddSummaryRow("Status",           envelope.Status.ToString());
        AddSummaryRow("Created",          envelope.CreatedAt.ToString("f") + " UTC");
        AddSummaryRow("Certificate ID",   $"CERT-{envelope.Id.ToString()[..8].ToUpperInvariant()}");

        doc.Add(summaryTable);

        // ── Signers table heading ─────────────────────────────────────────────
        doc.Add(new Paragraph("Signatory Record")
            .SetFont(fontBold)
            .SetFontSize(13)
            .SetFontColor(brandBlue)
            .SetMarginBottom(8));

        // ── Signers table ─────────────────────────────────────────────────────
        var signersTable = new Table(UnitValue.CreatePercentArray(new float[] { 22, 28, 15, 15, 20 }))
            .UseAllAvailableWidth()
            .SetMarginBottom(32);

        // Header row
        foreach (var heading in new[] { "Name", "Email", "Role", "Status", "Signed At (UTC)" })
        {
            signersTable.AddHeaderCell(new Cell()
                .Add(new Paragraph(heading).SetFont(fontBold).SetFontSize(10).SetFontColor(white))
                .SetBackgroundColor(brandBlue)
                .SetBorder(Border.NO_BORDER)
                .SetPaddingTop(8)
                .SetPaddingBottom(8)
                .SetPaddingLeft(6)
                .SetPaddingRight(6));
        }

        bool shaded = false;
        foreach (var signer in envelope.Signers.OrderBy(s => s.Order))
        {
            var bg       = shaded ? lightGray : white;
            var signedAt = signedAtMap.TryGetValue(signer.Email, out var ts) && ts.HasValue
                ? ts.Value.ToString("g") + " UTC"
                : "—";

            var statusColor = signer.Status switch
            {
                SigningStatus.Signed   => new DeviceRgb(5, 150, 105),
                SigningStatus.Expired  => new DeviceRgb(220, 38, 38),
                SigningStatus.Rejected => new DeviceRgb(180, 83, 9),
                _                     => (Color)midGray
            };

            void AddSignerCell(string text, bool bold = false, Color? color = null)
            {
                var para = new Paragraph(text)
                    .SetFont(bold ? fontBold : fontRegular)
                    .SetFontSize(10)
                    .SetFontColor(color ?? (Color)darkGray);
                signersTable.AddCell(new Cell()
                    .Add(para)
                    .SetBackgroundColor(bg)
                    .SetBorder(Border.NO_BORDER)
                    .SetPaddingTop(7)
                    .SetPaddingBottom(7)
                    .SetPaddingLeft(6)
                    .SetPaddingRight(6));
            }

            AddSignerCell(signer.Name, bold: true);
            AddSignerCell(signer.Email);
            AddSignerCell(signer.Role ?? "signer");
            AddSignerCell(signer.Status.ToString(), color: statusColor);
            AddSignerCell(signedAt);

            shaded = !shaded;
        }

        doc.Add(signersTable);

        // ── Footer ────────────────────────────────────────────────────────────
        doc.Add(new Paragraph(
                $"This certificate was generated on {DateTime.UtcNow:f} UTC by Document Signing Platform.")
            .SetFont(fontItalic)
            .SetFontSize(9)
            .SetFontColor(midGray)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetMarginTop(12));

        doc.Close();
        return ms.ToArray();
    }
}
