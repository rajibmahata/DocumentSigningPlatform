using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace DocumentSigning.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Merchant>        Merchants        => Set<Merchant>();
    public DbSet<SigningEnvelope> SigningEnvelopes  => Set<SigningEnvelope>();
    public DbSet<Signer>          Signers           => Set<Signer>();
    public DbSet<Claim>           Claims            => Set<Claim>();
    public DbSet<Document>        Documents         => Set<Document>();
    public DbSet<SigningRequest>   SigningRequests   => Set<SigningRequest>();
    public DbSet<SignedDocument>   SignedDocuments   => Set<SignedDocument>();
    public DbSet<OutboxQueue>             OutboxQueue              => Set<OutboxQueue>();
    public DbSet<AuditLog>                AuditLogs                => Set<AuditLog>();
    public DbSet<User>                    Users                    => Set<User>();
    public DbSet<EmailVerificationToken>  EmailVerificationTokens  => Set<EmailVerificationToken>();
    public DbSet<PasswordResetToken>      PasswordResetTokens      => Set<PasswordResetToken>();
    public DbSet<Ticket>                  Tickets                  => Set<Ticket>();
    public DbSet<TicketMessage>           TicketMessages           => Set<TicketMessage>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        base.OnModelCreating(model);

        // Merchants
        model.Entity<Merchant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.ApiKey).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.ApiKey).IsUnique();
            e.HasOne(x => x.User)
             .WithMany()
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // SigningEnvelopes
        model.Entity<SigningEnvelope>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(500).IsRequired();
            e.Property(x => x.Status).HasConversion<int>();
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Signers).WithOne(s => s.Envelope).HasForeignKey(s => s.EnvelopeId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Documents).WithOne(d => d.Envelope).HasForeignKey(d => d.EnvelopeId).OnDelete(DeleteBehavior.SetNull);
        });

        // Signers
        model.Entity<Signer>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Role).HasMaxLength(64).IsRequired();
            e.Property(x => x.Message).HasMaxLength(1000);
            e.Property(x => x.Status).HasConversion<int>();
        });

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
            e.Property(x => x.DocumentTitle).HasMaxLength(500);
            e.Property(x => x.DocumentFileName).HasMaxLength(256);
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

        // Users
        model.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
            e.Property(x => x.Country).HasMaxLength(100);
            e.Property(x => x.AccessRole)
             .HasMaxLength(20)
             .HasConversion<string>()
             .HasDefaultValueSql("'User'")
             .IsRequired();
        });

        // EmailVerificationTokens
        model.Entity<EmailVerificationToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Token).HasMaxLength(128).IsRequired();
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // PasswordResetTokens
        model.Entity<PasswordResetToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Token).HasMaxLength(128).IsRequired();
            e.HasIndex(x => x.Token).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Tickets
        model.Entity<Ticket>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("Tickets");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Type).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(50).IsRequired().HasDefaultValue("Open");
            e.Property(x => x.Priority).HasMaxLength(50);
            e.Property(x => x.AttachmentBase64).HasColumnType("nvarchar(max)");
            e.Property(x => x.AttachmentContentType).HasMaxLength(100);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Messages).WithOne(m => m.Ticket).HasForeignKey(m => m.TicketId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Status);
        });

        // TicketMessages
        model.Entity<TicketMessage>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("TicketMessages");
            e.Property(x => x.SenderType).HasMaxLength(20).IsRequired();
        });
    }
}
