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
    public DbSet<Webhook>                 Webhooks                 => Set<Webhook>();
    public DbSet<WebhookSubscription>     WebhookSubscriptions     => Set<WebhookSubscription>();
    public DbSet<WebhookDelivery>         WebhookDeliveries        => Set<WebhookDelivery>();
    public DbSet<SignerContact>            SignerContacts            => Set<SignerContact>();
    public DbSet<DocumentTemplate>         DocumentTemplates         => Set<DocumentTemplate>();
    public DbSet<Notification>             Notifications             => Set<Notification>();

    // â”€â”€ Feature-roadmap DbSets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public DbSet<MerchantFeatureFlag>      MerchantFeatureFlags      => Set<MerchantFeatureFlag>();
    public DbSet<DocumentInsight>          DocumentInsights          => Set<DocumentInsight>();
    public DbSet<DocumentField>            DocumentFields            => Set<DocumentField>();
    public DbSet<BulkSendJob>              BulkSendJobs              => Set<BulkSendJob>();
    public DbSet<EnvelopePayment>          EnvelopePayments          => Set<EnvelopePayment>();
    public DbSet<IdentityVerification>     IdentityVerifications     => Set<IdentityVerification>();
    public DbSet<MerchantBranding>         MerchantBrandings         => Set<MerchantBranding>();
    public DbSet<BlockchainRecord>         BlockchainRecords         => Set<BlockchainRecord>();

    // â”€â”€ Workflow engine DbSets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public DbSet<WorkflowDefinition>    WorkflowDefinitions    => Set<WorkflowDefinition>();
    public DbSet<WorkflowInstance>      WorkflowInstances      => Set<WorkflowInstance>();
    public DbSet<WorkflowNodeExecution> WorkflowNodeExecutions => Set<WorkflowNodeExecution>();
    public DbSet<WorkflowTrigger>       WorkflowTriggers       => Set<WorkflowTrigger>();

    // â”€â”€ Marketing engine DbSets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public DbSet<SocialAccount>       SocialAccounts       => Set<SocialAccount>();
    public DbSet<MarketingPost>       MarketingPosts       => Set<MarketingPost>();
    public DbSet<MarketingCampaign>   MarketingCampaigns   => Set<MarketingCampaign>();
    public DbSet<EngagementActivity>  EngagementActivities => Set<EngagementActivity>();

    // â”€â”€ Agent Manager DbSets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    public DbSet<AgentDefinition>          AgentDefinitions          => Set<AgentDefinition>();
    public DbSet<AgentWorkflow>            AgentWorkflows            => Set<AgentWorkflow>();
    public DbSet<AgentExecutionHistory>    AgentExecutionHistories   => Set<AgentExecutionHistory>();
    public DbSet<AgentMemory>              AgentMemories             => Set<AgentMemory>();
    public DbSet<CustomerInteractionMemory> CustomerInteractionMemories => Set<CustomerInteractionMemory>();
    public DbSet<Blog>                     Blogs                     => Set<Blog>();

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

        // AuditLog â€” append-only, immutable
        model.Entity<AuditLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(100).IsRequired();
            e.Property(x => x.EntityType).HasMaxLength(50).HasDefaultValue(string.Empty);
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Success");
            e.Property(x => x.Description).HasMaxLength(1000).HasDefaultValue(string.Empty);
            e.Property(x => x.IpAddress).HasMaxLength(64).HasDefaultValue(string.Empty);
            e.Property(x => x.UserAgent).HasMaxLength(512).HasDefaultValue(string.Empty);
            e.Property(x => x.Hash).HasMaxLength(128).HasDefaultValue(string.Empty);
            e.Property(x => x.Metadata).HasMaxLength(4000);
            // Indexes for common query patterns
            e.HasIndex(x => x.Timestamp);
            e.HasIndex(x => x.Action);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.MerchantId);
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

        // Webhooks
        model.Entity<Webhook>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("Webhooks");
            e.Property(x => x.Url).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Secret).HasMaxLength(100).IsRequired();
            e.HasOne(x => x.Merchant)
             .WithMany()
             .HasForeignKey(x => x.MerchantId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Subscriptions)
             .WithOne(s => s.Webhook)
             .HasForeignKey(s => s.WebhookId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.MerchantId);
        });

        // WebhookSubscriptions
        model.Entity<WebhookSubscription>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WebhookSubscriptions");
            e.Property(x => x.EventName).HasMaxLength(100).IsRequired();
            e.HasIndex(x => new { x.WebhookId, x.EventName }).IsUnique();
        });

        // WebhookDeliveries
        model.Entity<WebhookDelivery>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WebhookDeliveries");
            e.Property(x => x.EventName).HasMaxLength(100).IsRequired();
            e.Property(x => x.Payload).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.Response).HasMaxLength(1000);
            e.HasOne(x => x.Webhook)
             .WithMany()
             .HasForeignKey(x => x.WebhookId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.Status, x.NextAttempt });
            e.HasIndex(x => x.WebhookId);
        });

        // SignerContacts
        model.Entity<SignerContact>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("SignerContacts");
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.Role).HasMaxLength(64).IsRequired().HasDefaultValue("signer");
            e.Property(x => x.Phone).HasMaxLength(64);
            e.Property(x => x.Company).HasMaxLength(256);
            e.HasIndex(x => new { x.UserId, x.Email }).IsUnique();
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.User)
             .WithMany()
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // DocumentTemplates
        model.Entity<DocumentTemplate>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("DocumentTemplates");
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.Property(x => x.DefaultTitle).HasMaxLength(500).IsRequired();
            e.Property(x => x.SignersJson).HasColumnType("nvarchar(max)").IsRequired();
            e.HasIndex(x => x.MerchantId);
            e.HasOne(x => x.Merchant)
             .WithMany()
             .HasForeignKey(x => x.MerchantId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Notifications
        model.Entity<Notification>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("Notifications");
            e.Property(x => x.Title).HasMaxLength(256).IsRequired();
            e.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Type).HasMaxLength(64).IsRequired();
            e.Property(x => x.Link).HasMaxLength(500);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
            e.HasIndex(x => new { x.UserId, x.IsRead });
            e.HasOne(x => x.User)
             .WithMany()
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // MerchantFeatureFlags
        model.Entity<MerchantFeatureFlag>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("MerchantFeatureFlags");
            e.Property(x => x.FeatureKey).HasMaxLength(64).IsRequired();
            e.HasIndex(x => new { x.MerchantId, x.FeatureKey }).IsUnique();
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // DocumentInsights
        model.Entity<DocumentInsight>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("DocumentInsights");
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.RisksJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.Summary).HasColumnType("nvarchar(max)");
            e.Property(x => x.ErrorMessage).HasMaxLength(2000);
            e.HasIndex(x => x.DocumentId).IsUnique();
            e.HasOne(x => x.Document).WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
        });

        // DocumentFields
        model.Entity<DocumentField>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("DocumentFields");
            e.Property(x => x.FieldType).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.DocumentId);
            e.HasOne(x => x.Document).WithMany().HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
        });

        // BulkSendJobs
        model.Entity<BulkSendJob>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("BulkSendJobs");
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.RecipientName).HasMaxLength(256).IsRequired();
            e.Property(x => x.RecipientEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.RecipientCompany).HasMaxLength(256);
            e.Property(x => x.MergeDataJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.ErrorMessage).HasMaxLength(2000);
            e.HasIndex(x => x.BatchId);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // EnvelopePayments
        model.Entity<EnvelopePayment>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("EnvelopePayments");
            e.Property(x => x.PaymentIntentId).HasMaxLength(128).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.Currency).HasMaxLength(10).IsRequired();
            e.Property(x => x.ClientSecret).HasMaxLength(256).IsRequired();
            e.HasIndex(x => x.EnvelopeId).IsUnique();
            e.HasIndex(x => x.PaymentIntentId).IsUnique();
            e.HasOne(x => x.Envelope).WithMany().HasForeignKey(x => x.EnvelopeId).OnDelete(DeleteBehavior.Cascade);
        });

        // IdentityVerifications
        model.Entity<IdentityVerification>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("IdentityVerifications");
            e.Property(x => x.SignerEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.DocumentType).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.IdImageUrl).HasMaxLength(2000);
            e.Property(x => x.RejectionReason).HasMaxLength(1000);
            e.HasIndex(x => x.SigningRequestId);
            e.HasOne(x => x.SigningRequest).WithMany().HasForeignKey(x => x.SigningRequestId).OnDelete(DeleteBehavior.Cascade);
        });

        // MerchantBrandings
        model.Entity<MerchantBranding>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("MerchantBrandings");
            e.Property(x => x.CustomDomain).HasMaxLength(256);
            e.Property(x => x.LogoUrl).HasMaxLength(2000);
            e.Property(x => x.PrimaryColor).HasMaxLength(20);
            e.Property(x => x.EmailFromName).HasMaxLength(256);
            e.Property(x => x.PortalFooterText).HasMaxLength(2000);
            e.HasIndex(x => x.MerchantId).IsUnique();
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // BlockchainRecords
        model.Entity<BlockchainRecord>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("BlockchainRecords");
            e.Property(x => x.DocumentHash).HasMaxLength(128).IsRequired();
            e.Property(x => x.Network).HasMaxLength(50).IsRequired();
            e.Property(x => x.TransactionHash).HasMaxLength(128);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.ErrorMessage).HasMaxLength(2000);
            e.HasIndex(x => x.EnvelopeId).IsUnique();
            e.HasOne(x => x.Envelope).WithMany().HasForeignKey(x => x.EnvelopeId).OnDelete(DeleteBehavior.Cascade);
        });

        // WorkflowDefinitions
        model.Entity<WorkflowDefinition>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WorkflowDefinitions");
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.TemplateName).HasMaxLength(256);
            e.Property(x => x.Category).HasMaxLength(100);
            e.Property(x => x.CreatedBy).HasMaxLength(256);
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.JsonDefinition).HasColumnType("nvarchar(max)");
            e.HasIndex(x => x.MerchantId);
            e.HasIndex(x => x.IsTemplate);
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // WorkflowInstances
        model.Entity<WorkflowInstance>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WorkflowInstances");
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.CurrentNodeId).HasMaxLength(128);
            e.Property(x => x.TriggeredBy).HasMaxLength(256);
            e.Property(x => x.ErrorMessage).HasMaxLength(2000);
            e.Property(x => x.ContextJson).HasColumnType("nvarchar(max)");
            e.HasIndex(x => x.WorkflowDefinitionId);
            e.HasIndex(x => x.Status);
            e.HasOne(x => x.Definition).WithMany(d => d.Instances)
              .HasForeignKey(x => x.WorkflowDefinitionId).OnDelete(DeleteBehavior.Cascade);
        });

        // WorkflowNodeExecutions
        model.Entity<WorkflowNodeExecution>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WorkflowNodeExecutions");
            e.Property(x => x.NodeId).HasMaxLength(128).IsRequired();
            e.Property(x => x.NodeType).HasMaxLength(64).IsRequired();
            e.Property(x => x.NodeLabel).HasMaxLength(256).IsRequired();
            e.Property(x => x.Status).HasConversion<int>();
            e.Property(x => x.OutputJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.ErrorMessage).HasMaxLength(2000);
            e.HasIndex(x => x.WorkflowInstanceId);
            e.HasOne(x => x.Instance).WithMany(i => i.NodeExecutions)
              .HasForeignKey(x => x.WorkflowInstanceId).OnDelete(DeleteBehavior.Cascade);
        });

        // WorkflowTriggers
        model.Entity<WorkflowTrigger>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("WorkflowTriggers");
            e.Property(x => x.TriggerType).HasConversion<int>();
            e.Property(x => x.ConfigurationJson).HasColumnType("nvarchar(max)");
            e.HasIndex(x => x.WorkflowDefinitionId);
            e.HasOne(x => x.Definition).WithMany(d => d.Triggers)
              .HasForeignKey(x => x.WorkflowDefinitionId).OnDelete(DeleteBehavior.Cascade);
        });

        // â”€â”€ Marketing engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        // SocialAccounts
        model.Entity<SocialAccount>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("SocialAccounts");
            e.Property(x => x.Platform).HasMaxLength(50).IsRequired();
            e.Property(x => x.AccountName).HasMaxLength(256).IsRequired();
            e.Property(x => x.PageId).HasMaxLength(256).IsRequired();
            e.Property(x => x.AccessToken).HasMaxLength(2000).IsRequired();
            e.Property(x => x.RefreshToken).HasMaxLength(2000);
            e.HasIndex(x => new { x.MerchantId, x.Platform });
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // MarketingPosts
        model.Entity<MarketingPost>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("MarketingPosts");
            e.Property(x => x.Platform).HasMaxLength(50).IsRequired();
            e.Property(x => x.Content).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.ImageUrl).HasMaxLength(2000);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.CreatedBy).HasMaxLength(128).IsRequired();
            e.Property(x => x.ContentCategory).HasMaxLength(64).IsRequired();
            e.Property(x => x.Hashtags).HasMaxLength(1000);
            e.Property(x => x.CampaignId).HasMaxLength(64);
            e.HasIndex(x => new { x.MerchantId, x.Status });
            e.HasIndex(x => x.ScheduledAt);
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // MarketingCampaigns
        model.Entity<MarketingCampaign>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("MarketingCampaigns");
            e.Property(x => x.Name).HasMaxLength(256).IsRequired();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.CampaignType).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.MerchantId);
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // EngagementActivities
        model.Entity<EngagementActivity>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("EngagementActivities");
            e.Property(x => x.Platform).HasMaxLength(50).IsRequired();
            e.Property(x => x.ActivityType).HasMaxLength(50).IsRequired();
            e.Property(x => x.UserName).HasMaxLength(256);
            e.Property(x => x.Message).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Response).HasColumnType("nvarchar(max)");
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.PostId).HasMaxLength(256);
            e.HasIndex(x => new { x.MerchantId, x.Status });
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // â”€â”€ Agent Manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        // AgentDefinitions
        model.Entity<AgentDefinition>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("AgentDefinitions");
            e.Property(x => x.AgentName).HasMaxLength(256).IsRequired();
            e.Property(x => x.AgentType).HasMaxLength(100).IsRequired();
            e.Property(x => x.ParentAgentType).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.ScheduleExpression).HasMaxLength(100);
            e.Property(x => x.Timezone).HasMaxLength(64).HasDefaultValue("UTC");
            e.Property(x => x.ApprovalMode).HasMaxLength(20).HasDefaultValue("approval");
            e.Property(x => x.ConfigurationJson).HasColumnType("nvarchar(max)");
            e.HasIndex(x => new { x.MerchantId, x.AgentType });
            e.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // AgentWorkflows
        model.Entity<AgentWorkflow>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("AgentWorkflows");
            e.Property(x => x.WorkflowName).HasMaxLength(256).IsRequired();
            e.Property(x => x.StepsJson).HasColumnType("nvarchar(max)").IsRequired();
            e.HasIndex(x => x.AgentId);
            e.HasOne(x => x.Agent).WithMany(a => a.Workflows)
             .HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Cascade);
        });

        // AgentExecutionHistory
        model.Entity<AgentExecutionHistory>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("AgentExecutionHistories");
            e.Property(x => x.ExecutionStatus).HasMaxLength(30).IsRequired();
            e.Property(x => x.InputJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.OutputJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.ValidationResultJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.ErrorDetails).HasMaxLength(4000);
            e.Property(x => x.StepLogJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.TriggerType).HasMaxLength(20).HasDefaultValue("scheduled");
            e.HasIndex(x => new { x.AgentId, x.StartedAt });
            e.HasIndex(x => x.MerchantId);
            e.HasOne(x => x.Agent).WithMany(a => a.ExecutionHistory)
             .HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Merchant).WithMany()
             .HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Restrict);
        });

        // AgentMemory
        model.Entity<AgentMemory>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("AgentMemories");
            e.Property(x => x.ContextType).HasMaxLength(100).IsRequired();
            e.Property(x => x.ContextKey).HasMaxLength(256).IsRequired();
            e.Property(x => x.ContextValue).HasColumnType("nvarchar(max)").IsRequired();
            e.HasIndex(x => new { x.AgentId, x.ContextType, x.ContextKey }).IsUnique();
            e.HasOne(x => x.Agent).WithMany(a => a.Memories)
             .HasForeignKey(x => x.AgentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Merchant).WithMany()
             .HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Restrict);
        });

        // CustomerInteractionMemory
        model.Entity<CustomerInteractionMemory>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("CustomerInteractionMemories");
            e.Property(x => x.CustomerEmail).HasMaxLength(256).IsRequired();
            e.Property(x => x.CustomerName).HasMaxLength(256);
            e.Property(x => x.InteractionType).HasMaxLength(64).IsRequired();
            e.Property(x => x.Platform).HasMaxLength(50).IsRequired();
            e.Property(x => x.Message).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.AiInterpretation).HasColumnType("nvarchar(max)");
            e.Property(x => x.Sentiment).HasMaxLength(30).IsRequired();
            e.Property(x => x.NextRecommendedAction).HasMaxLength(2000);
            e.Property(x => x.ObjectionType).HasMaxLength(50);
            e.HasIndex(x => new { x.MerchantId, x.CustomerEmail });
            e.HasIndex(x => x.Sentiment);
            e.HasOne(x => x.Merchant).WithMany()
             .HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        // Blogs
        model.Entity<Blog>(e =>
        {
            e.HasKey(x => x.Id);
            e.ToTable("Blogs");
            e.Property(x => x.Title).HasMaxLength(512).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(512).IsRequired();
            e.Property(x => x.Content).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.MetaDescription).HasMaxLength(1000);
            e.Property(x => x.Keywords).HasMaxLength(1000);
            e.Property(x => x.Tags).HasMaxLength(500);
            e.Property(x => x.Category).HasMaxLength(100);
            e.Property(x => x.CoverImageUrl).HasMaxLength(2000);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.CreatedByAgent).HasMaxLength(128).IsRequired();
            e.Property(x => x.SeoScore).HasMaxLength(20);
            e.HasIndex(x => new { x.MerchantId, x.Status });
            e.HasIndex(x => x.Slug);
            e.HasOne(x => x.Merchant).WithMany()
             .HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
