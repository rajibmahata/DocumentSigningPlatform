using DocumentSigning.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Claim> Claims => Set<Claim>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<SigningRequest> SigningRequests => Set<SigningRequest>();
    public DbSet<SignedDocument> SignedDocuments => Set<SignedDocument>();
    public DbSet<OutboxQueue> OutboxQueue => Set<OutboxQueue>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);

        // Claims
        model.Entity<Claim>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ClaimantName).HasMaxLength(256).IsRequired();
            e.Property(x => x.ClaimantEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.Status).HasConversion<int>();
        });

        // Documents
        model.Entity<Document>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ContentType).HasMaxLength(128).IsRequired();
            e.Property(x => x.Hash).HasMaxLength(128).IsRequired();
        });

        // SigningRequests
        model.Entity<SigningRequest>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Token).HasMaxLength(512).IsRequired();
            e.HasIndex(x => x.Token).IsUnique();
            e.Property(x => x.Status).HasConversion<int>();
        });

        // SignedDocuments
        model.Entity<SignedDocument>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ContentType).HasMaxLength(128).IsRequired();
        });

        // OutboxQueue
        model.Entity<OutboxQueue>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.JobType).HasMaxLength(64).IsRequired();
            e.Property(x => x.Status).HasConversion<int>();
            e.HasIndex(x => x.Status);
        });

        // AuditLog — append-only
        model.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(64).IsRequired();
            e.Property(x => x.IpAddress).HasMaxLength(64).IsRequired();
            e.Property(x => x.UserAgent).HasMaxLength(512).IsRequired();
            e.HasIndex(x => x.SigningRequestId);
        });
    }
}
