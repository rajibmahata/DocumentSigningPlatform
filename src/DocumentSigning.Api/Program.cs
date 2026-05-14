using DocumentSigning.Api.Filters;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using DocumentSigning.Infrastructure.Persistence;
using DocumentSigning.Infrastructure.Repositories;
using DocumentSigning.Infrastructure.Services;
using DocumentSigning.Infrastructure.Services.Agents;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
var builder = WebApplication.CreateBuilder(args);

// ─── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("Default"),
        sql => sql.MigrationsAssembly("DocumentSigning.Infrastructure")));

// ─── Repositories ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<IClaimRepository, ClaimRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<ISigningRequestRepository, SigningRequestRepository>();
builder.Services.AddScoped<ISignedDocumentRepository, SignedDocumentRepository>();
builder.Services.AddScoped<IOutboxQueueRepository, OutboxQueueRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IMerchantRepository, MerchantRepository>();
builder.Services.AddScoped<ISigningEnvelopeRepository, SigningEnvelopeRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
builder.Services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<ISignerContactRepository, SignerContactRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<ISignerRepository, SignerRepository>();

// ─── Feature-roadmap repositories ────────────────────────────────────────────
builder.Services.AddScoped<IFeatureFlagRepository, FeatureFlagRepository>();
builder.Services.AddScoped<IDocumentInsightRepository, DocumentInsightRepository>();
builder.Services.AddScoped<IDocumentFieldRepository, DocumentFieldRepository>();
builder.Services.AddScoped<IBulkSendRepository, BulkSendRepository>();
builder.Services.AddScoped<IEnvelopePaymentRepository, EnvelopePaymentRepository>();
builder.Services.AddScoped<IIdentityVerificationRepository, IdentityVerificationRepository>();
builder.Services.AddScoped<IMerchantBrandingRepository, MerchantBrandingRepository>();
builder.Services.AddScoped<IBlockchainRepository, BlockchainRepository>();
builder.Services.AddScoped<IWorkflowRepository, WorkflowRepository>();

// ─── Filters ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<MerchantApiKeyFilter>();

// ─── Domain services ──────────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IConfirmTokenService, ConfirmTokenService>();
builder.Services.AddScoped<IDocumentStamper, DocumentStamperDispatcher>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<ISignerContactService, SignerContactService>();
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// ─── Feature-roadmap services ─────────────────────────────────────────────────
builder.Services.AddScoped<IFeatureFlagService, FeatureFlagService>();
builder.Services.AddScoped<IBrandingService, BrandingService>();
builder.Services.AddScoped<IAiInsightService, AiInsightService>();
builder.Services.AddScoped<IOcrService, OcrService>();
builder.Services.AddScoped<IBulkSendService, BulkSendService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IIdentityVerificationService, IdentityVerificationService>();
builder.Services.AddScoped<IBlockchainService, BlockchainService>();
builder.Services.AddScoped<IWorkflowService, WorkflowService>();

// ─── Marketing services ────────────────────────────────────────────────────
builder.Services.AddScoped<IMarketingService, MarketingService>();
builder.Services.AddScoped<IDeepSeekService, DeepSeekService>();
builder.Services.AddHostedService<DailyMarketingAgent>();
builder.Services.AddHttpClient("deepseek", client =>
{
    var baseUrl = builder.Configuration["DeepSeek:BaseUrl"] ?? "https://api.deepseek.com";
    var apiKey  = builder.Configuration["DeepSeek:ApiKey"] ?? string.Empty;
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout     = TimeSpan.FromSeconds(60);
    if (!string.IsNullOrWhiteSpace(apiKey))
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
});

// ─── Agent Manager System ──────────────────────────────────────────────────
builder.Services.AddScoped<IAgentManagerService, AgentManagerService>();
builder.Services.AddScoped<IBlogService, BlogService>();
builder.Services.AddScoped<ILibraryDocumentService, LibraryDocumentService>();
builder.Services.AddScoped<IValidationPipeline, ValidationPipeline>();
builder.Services.AddScoped<IAgentOrchestrator, AgentOrchestrator>();
builder.Services.AddScoped<ISpecializedAgent, EmailMarketingAgent>();
builder.Services.AddScoped<ISpecializedAgent, SocialMediaAgent>();
builder.Services.AddScoped<ISpecializedAgent, CampaignAgent>();
builder.Services.AddScoped<ISpecializedAgent, BlogAgent>();
builder.Services.AddScoped<ISpecializedAgent, ValidationAgent>();
builder.Services.AddScoped<ISpecializedAgent, AnalyticsIntelligenceAgent>();
builder.Services.AddScoped<ISpecializedAgent, ContactEmailValidationAgent>();
builder.Services.AddHostedService<AgentSchedulerWorker>();

// ─── Background job handler (scoped — instantiated inside OutboxWorker scope) ─
builder.Services.AddScoped<StampDocJobHandler>();

// ─── Background worker ────────────────────────────────────────────────────────
builder.Services.AddHostedService<OutboxWorker>();
builder.Services.AddHostedService<ExpiryWorker>();
builder.Services.AddHostedService<ReminderWorker>();

// ─── Webhook system ───────────────────────────────────────────────────────────
builder.Services.AddScoped<IWebhookRepository, WebhookRepository>();
builder.Services.AddScoped<IWebhookService, WebhookService>();
builder.Services.AddHostedService<WebhookDeliveryWorker>();
builder.Services.AddHttpClient("webhook", client =>
{
    client.Timeout = TimeSpan.FromSeconds(35);
});

// ─── Audit service (singleton channel + hosted background flush) ──────────────
builder.Services.AddSingleton<AuditService>();
builder.Services.AddSingleton<DocumentSigning.Core.Interfaces.IAuditService>(
    sp => sp.GetRequiredService<AuditService>());
builder.Services.AddHostedService(
    sp => sp.GetRequiredService<AuditService>());

// ─── HTTP client (used by Blazor components to call local API endpoints) ──────
builder.Services.AddHttpClient("api", client =>
{
    var baseUrl = builder.Configuration["App:BaseUrl"];
    if (!string.IsNullOrWhiteSpace(baseUrl))
        client.BaseAddress = new Uri(baseUrl);
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.AllowAnyMethod().AllowAnyHeader();
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins);
        else
            policy.SetIsOriginAllowed(origin => new Uri(origin).Host == "localhost");
    });
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("signing", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 10,
                QueueLimit = 0
            }));

    // Stricter policy for auth endpoints (5 attempts per minute per IP)
    options.AddPolicy("auth", context =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(1),
                PermitLimit = 5,
                QueueLimit = 0
            }));
});

// ─── JWT Authentication ───────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtKey = builder.Configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing from configuration.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Admin: full control (manage users, envelopes, settings)
    options.AddPolicy("AdminOnly",     p => p.RequireRole("Admin"));
    // User or Admin: send + view envelopes
    options.AddPolicy("UserOrAbove",   p => p.RequireRole("Admin", "User"));
    // Any authenticated role (includes Viewer)
    options.AddPolicy("ViewerOrAbove", p => p.RequireRole("Admin", "User", "Viewer"));
});

// ─── Controllers + Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title   = "DocSignerHub API",
        Version = "v1",
        Description = """
            **DocSignerHub** — Enterprise eSign & Workflow Automation Platform.

            ## Authentication
            - **JWT Bearer** — most endpoints. Obtain via `POST /api/auth/login`.
            - **X-Api-Key** — envelope endpoints. Obtain from `GET /api/merchants/by-user/{userId}`.

            ## Quick Start
            1. `POST /api/auth/register` → create account
            2. Verify email → `GET /api/auth/verify-email/{token}`
            3. `POST /api/auth/login` → receive JWT token
            4. `POST /api/merchants` → create merchant, get API key
            5. `POST /api/envelopes` with `X-Api-Key` → send signing envelope

            ## API Sections
            | Tag | Description |
            |-----|-------------|
            | Auth | Register, login, verify email, password reset |
            | Users | User profile management |
            | Analytics | Platform-wide statistics and daily trends (Admin only) |
            | Merchants | Merchant workspaces and API key management |
            | Envelope | Send signing envelopes and retrieve signed documents |
            | Portal | Signing flow — validate token, submit signature, view signer's own envelopes |
            | Signer Contacts | Saved contact management — list, search, CRUD, CSV import/export |
            | Tickets | Support ticket creation and messaging |
            | Tickets — Admin | Admin-level ticket management (Admin only) |
            | Audit Logs — Admin | Paged audit log viewer and entity timeline (Admin only) |
            | Webhooks | Register endpoints and view delivery history |
            | Workflow | Visual workflow definitions, execution engine, templates, and monitoring |

            ## Workflow Engine
            The Workflow Engine lets you automate multi-step document signing processes using a visual drag-and-drop builder.

            ### Node Types
            | Node | Description |
            |------|-------------|
            | `start` | Entry point — required first node |
            | `end` | Exit point — required last node |
            | `sendEmail` | Send a templated notification email |
            | `approval` | Pause and wait for an approver |
            | `delay` | Wait N hours/days before continuing |
            | `condition` | Branch on true/false logic |
            | `documentTemplate` | Generate document from a template |
            | `signatureRequest` | Send a signing envelope automatically |
            | `webhook` | POST event data to an external URL |
            | `aiAction` | Run AI analysis or clause summarisation |

            ### Workflow Triggers
            | Trigger | Value |
            |---------|-------|
            | Manual | `0` |
            | On Envelope Created | `1` |
            | On Envelope Completed | `2` |
            | On Envelope Signed | `3` |
            | On Payment Received | `4` |
            | Scheduled | `5` |
            | Webhook | `6` |

            ### Workflow Status Values
            | Status | Value |
            |--------|-------|
            | Draft | `0` |
            | Published | `1` |
            | Archived | `2` |
        """
    });

    // Include XML doc comments from the Api assembly
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);

    c.EnableAnnotations();
    c.OperationFilter<DocumentSigning.Api.Swagger.CreateMerchantExampleFilter>();
    c.OperationFilter<DocumentSigning.Api.Swagger.ApiKeyHeaderFilter>();

    // Map controller names to clean Swagger tag names
    c.TagActionsBy(api =>
    {
        var controller = api.ActionDescriptor.RouteValues["controller"] ?? string.Empty;
        var tag = controller switch
        {
            "AdminTickets"    => "Tickets — Admin",
            "AdminAudit"      => "Audit Logs — Admin",
            "Tickets"         => "Tickets",
            "Portal"          => "Portal",
            "Envelope"        => "Envelope",
            "Webhooks"        => "Webhooks",
            "SignerContacts"  => "Signer Contacts",
            "Workflow"        => "Workflow",
            _                 => controller
        };
        return new[] { tag };
    });

    // JWT Bearer security definition
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        In           = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description  = "Enter your JWT token (without 'Bearer ' prefix)."
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ─── Blazor Server ────────────────────────────────────────────────────────────
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// ─── Build ────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Auto-migrate on startup ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────
// Swagger available when in Development OR when explicitly enabled via config
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Document Signing API v1");
        c.RoutePrefix   = "swagger";
        c.DocumentTitle = "Document Signing API";
        c.DefaultModelsExpandDepth(-1);   // collapse schemas by default
        c.DisplayRequestDuration();       // show response time in UI
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
    {
        ctx.Response.StatusCode = 500;
        ctx.Response.ContentType = "application/json";
        var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        await ctx.Response.WriteAsJsonAsync(new { error = ex?.Message ?? "Internal Server Error", detail = ex?.ToString() });
    }));
}

// Log all 500 responses in development for debugging
app.Use(async (context, next) =>
{
    await next();
    if (context.Response.StatusCode >= 500)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError("HTTP {StatusCode} on {Method} {Path}", context.Response.StatusCode, context.Request.Method, context.Request.Path);
    }
});

app.UseStaticFiles();
app.UseAntiforgery();
app.UseCors("FrontendDev");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapRazorComponents<DocumentSigning.Api.Components.App>()
    .AddInteractiveServerRenderMode();

// ─── Seed sample library documents ───────────────────────────────────────────
await SeedLibraryDocumentsAsync(app);

app.Run();

async Task SeedLibraryDocumentsAsync(WebApplication webApp)
{
    await using var scope = webApp.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (await db.LibraryDocuments.AnyAsync(x => x.IsSample)) return; // already seeded

    var samples = new DocumentSigning.Core.Entities.LibraryDocument[]
    {
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Employment Offer Letter",   Purpose = "OfferLetter",      Category = "HR",           FileType = "html", EditorContentHtml = "<h1>Employment Offer Letter</h1><p>Dear <strong>{{SignerName}}</strong>,</p><p>We are pleased to offer you the position of <strong>{{JobTitle}}</strong> at <strong>{{CompanyName}}</strong>, commencing on <strong>{{StartDate}}</strong>.</p><p>Your annual salary will be <strong>{{Salary}}</strong>.</p><p>Please sign below to accept this offer.</p><p>Signature: _______________</p><p>Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Non-Disclosure Agreement",  Purpose = "NDA",              Category = "Legal",        FileType = "html", EditorContentHtml = "<h1>Non-Disclosure Agreement</h1><p>This Agreement is entered into between <strong>{{PartyA}}</strong> and <strong>{{PartyB}}</strong> on <strong>{{Date}}</strong>.</p><p>Both parties agree to keep all shared information strictly confidential and not to disclose it to any third party without prior written consent.</p><p>This agreement shall remain in effect for a period of <strong>{{Duration}}</strong>.</p><p>Signatures:</p><p>Party A: _______________</p><p>Party B: _______________</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Freelancer Contract",       Purpose = "Contract",         Category = "Legal",        FileType = "html", EditorContentHtml = "<h1>Freelancer Services Agreement</h1><p>This Agreement is between <strong>{{ClientName}}</strong> (Client) and <strong>{{FreelancerName}}</strong> (Service Provider).</p><p><strong>Services:</strong> {{ServiceDescription}}</p><p><strong>Rate:</strong> {{Rate}} per {{RateUnit}}</p><p><strong>Timeline:</strong> {{StartDate}} to {{EndDate}}</p><p>Payment is due within 30 days of invoice submission.</p><p>Signature: _______________  Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Vendor Approval Form",      Purpose = "VendorAgreement",  Category = "Procurement",  FileType = "html", EditorContentHtml = "<h1>Vendor Approval Form</h1><p>Vendor Name: <strong>{{VendorName}}</strong></p><p>Services/Products: {{VendorServices}}</p><p>Contract Value: {{ContractValue}}</p><p>Approved by: _______________</p><p>Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Rental Agreement",          Purpose = "RentalAgreement",  Category = "Real Estate",  FileType = "html", EditorContentHtml = "<h1>Rental Agreement</h1><p>This agreement is between <strong>{{LandlordName}}</strong> (Landlord) and <strong>{{TenantName}}</strong> (Tenant) for the property at <strong>{{PropertyAddress}}</strong>.</p><p>Monthly Rent: {{RentAmount}}</p><p>Lease Period: {{StartDate}} to {{EndDate}}</p><p>Landlord Signature: _______________</p><p>Tenant Signature: _______________</p><p>Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Invoice Approval Form",     Purpose = "Invoice",          Category = "Finance",      FileType = "html", EditorContentHtml = "<h1>Invoice Approval</h1><p>Invoice #: <strong>{{InvoiceNumber}}</strong></p><p>Vendor: {{VendorName}}</p><p>Amount: <strong>{{Amount}}</strong></p><p>Description: {{Description}}</p><p>Approved by: _______________</p><p>Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "HR Onboarding Checklist",   Purpose = "HRForm",           Category = "HR",           FileType = "html", EditorContentHtml = "<h1>New Employee Onboarding Checklist</h1><p>Employee: <strong>{{EmployeeName}}</strong> | Start Date: {{StartDate}}</p><ul><li>☐ ID verification completed</li><li>☐ Tax forms submitted</li><li>☐ Benefits enrollment</li><li>☐ Equipment issued</li><li>☐ Access credentials created</li><li>☐ Orientation completed</li></ul><p>HR Signature: _______________  Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Software License Agreement",Purpose = "Legal",            Category = "Technology",   FileType = "html", EditorContentHtml = "<h1>Software License Agreement</h1><p>This License Agreement is between <strong>{{LicensorName}}</strong> and <strong>{{LicenseeName}}</strong>.</p><p>Software: <strong>{{SoftwareName}}</strong> v{{Version}}</p><p>License Type: {{LicenseType}}</p><p>Term: {{StartDate}} to {{EndDate}}</p><p>The Licensee agrees not to reverse-engineer, copy, or redistribute the software.</p><p>Signatures: _______________  Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Consulting Agreement",      Purpose = "Contract",         Category = "Professional", FileType = "html", EditorContentHtml = "<h1>Consulting Agreement</h1><p>This Agreement is between <strong>{{ClientName}}</strong> and <strong>{{ConsultantName}}</strong>.</p><p>Scope of Work: {{ScopeOfWork}}</p><p>Fee: {{ConsultingFee}}</p><p>Duration: {{StartDate}} – {{EndDate}}</p><p>Both parties agree to maintain confidentiality of all project information.</p><p>Client Signature: _______________  Consultant Signature: _______________</p><p>Date: {{Date}}</p>" },
        new() { Id = Guid.NewGuid(), MerchantId = null, UserId = null, IsSample = true, Name = "Internal Approval Form",    Purpose = "InternalApproval", Category = "Operations",   FileType = "html", EditorContentHtml = "<h1>Internal Approval Request</h1><p>Requested by: <strong>{{RequesterName}}</strong></p><p>Department: {{Department}}</p><p>Request Date: {{Date}}</p><p>Description: {{RequestDescription}}</p><p>Budget Impact: {{BudgetImpact}}</p><p>Manager Approval: _______________</p><p>Director Approval: _______________</p><p>Date Approved: _______________</p>" },
    };

    db.LibraryDocuments.AddRange(samples);
    await db.SaveChangesAsync();
}

// Make Program accessible to WebApplicationFactory in tests
public partial class Program { }
