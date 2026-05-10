namespace DocumentSigning.Core.Entities;

/// <summary>Blog posts managed by the Blog Agent and editable by admins.</summary>
public class Blog
{
    public Guid     Id              { get; set; } = Guid.NewGuid();
    public Guid     MerchantId      { get; set; }
    public Merchant? Merchant        { get; set; }

    public string   Title           { get; set; } = string.Empty;

    /// <summary>URL-safe slug: "how-to-automate-contracts-2026"</summary>
    public string   Slug            { get; set; } = string.Empty;

    public string   Content         { get; set; } = string.Empty;

    public string?  MetaDescription { get; set; }

    /// <summary>Comma-separated SEO keywords.</summary>
    public string?  Keywords        { get; set; }

    public string?  Tags            { get; set; }

    public string?  Category        { get; set; }

    public string?  CoverImageUrl   { get; set; }

    /// <summary>draft | published | unpublished | pending_review</summary>
    public string   Status          { get; set; } = "draft";

    public DateTime? PublishedAt    { get; set; }

    /// <summary>ai-agent or user ID</summary>
    public string   CreatedByAgent  { get; set; } = "user";

    public int      ViewCount       { get; set; } = 0;

    public string?  SeoScore        { get; set; }

    public DateTime CreatedAt       { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt       { get; set; } = DateTime.UtcNow;
}
