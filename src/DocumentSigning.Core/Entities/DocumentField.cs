namespace DocumentSigning.Core.Entities;

/// <summary>OCR-detected field position on a document page.</summary>
public class DocumentField
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    /// <summary>Signature | Date | Name | Initials | Checkbox</summary>
    public string FieldType { get; set; } = string.Empty;
    public int PageNumber { get; set; }
    public float X { get; set; }
    public float Y { get; set; }
    public float Width { get; set; }
    public float Height { get; set; }
    /// <summary>Confidence score 0–1 from OCR engine</summary>
    public float Confidence { get; set; }
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Document Document { get; set; } = null!;
}
