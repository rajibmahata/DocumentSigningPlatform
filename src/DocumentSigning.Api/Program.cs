using DocumentSigning.Api.Filters;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using DocumentSigning.Infrastructure.Persistence;
using DocumentSigning.Infrastructure.Repositories;
using DocumentSigning.Infrastructure.Services;
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

// ─── Filters ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<MerchantApiKeyFilter>();

// ─── Domain services ──────────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IDocumentStamper, DocumentStamperDispatcher>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IJwtService, JwtService>();

// ─── Background job handler (scoped — instantiated inside OutboxWorker scope) ─
builder.Services.AddScoped<StampDocJobHandler>();

// ─── Background worker ────────────────────────────────────────────────────────
builder.Services.AddHostedService<OutboxWorker>();

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
        Title   = "Document Signing API",
        Version = "v1",
        Description = """
            In-house electronic document signing platform.

            ## Authentication
            - **JWT Bearer** — most endpoints. Obtain a token via `POST /api/auth/login`.
            - **X-Api-Key** — envelope endpoints. Obtain from `GET /api/merchants/by-user/{userId}`.

            ## Sections
            | Tag | Description |
            |-----|-------------|
            | Auth | Register, login, verify email, password reset |
            | Users | User profile management |
            | Analytics | Platform-wide statistics and daily trends (Admin only) |
            | Merchants | Merchant workspaces and API key management |
            | Envelope | Send signing envelopes and retrieve signed documents |
            | Portal | Signing flow — validate token, submit signature, view signer's own envelopes |
            | Tickets | Support ticket creation and messaging |
            | Tickets — Admin | Admin-level ticket management (Admin only) |
            | Audit Logs — Admin | Paged audit log viewer and entity timeline (Admin only) |
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
            "AdminTickets"  => "Tickets — Admin",
            "AdminAudit"    => "Audit Logs — Admin",
            "Tickets"       => "Tickets",
            "Portal"       => "Portal",
            "Envelope"     => "Envelope",
            _              => controller
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
    // developer-only tooling can go here
}

app.UseStaticFiles();
app.UseAntiforgery();
app.UseCors("FrontendDev");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapRazorComponents<DocumentSigning.Api.Components.App>()
    .AddInteractiveServerRenderMode();

app.Run();

// Make Program accessible to WebApplicationFactory in tests
public partial class Program { }
