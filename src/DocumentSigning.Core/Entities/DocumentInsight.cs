namespace DocumentSigning.Core.Entities;

/// <summary>AI-generated summary/risk analysis for a document.</summary>
public class DocumentInsight
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    /// <summary>Bullet-point summary (markdown)</summary>
    public string Summary { get; set; } = string.Empty;
    /// <summary>JSON array of risk strings, e.g. ["No termination clause"]</summary>
    public string? RisksJson { get; set; }
    /// <summary>Pending | Processing | Done | Failed</summary>
    public string Status { get; set; } = "Pending";
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Document Document { get; set; } = null!;
}
