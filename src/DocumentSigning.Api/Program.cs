using DocumentSigning.Api.Filters;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using DocumentSigning.Infrastructure.Persistence;
using DocumentSigning.Infrastructure.Repositories;
using DocumentSigning.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

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

// ─── Filters ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<MerchantApiKeyFilter>();

// ─── Domain services ──────────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IDocumentStamper, DocumentStamperDispatcher>();
builder.Services.AddScoped<IEmailService, EmailService>();

// ─── Background job handler (scoped — instantiated inside OutboxWorker scope) ─
builder.Services.AddScoped<StampDocJobHandler>();

// ─── Background worker ────────────────────────────────────────────────────────
builder.Services.AddHostedService<OutboxWorker>();

// ─── HTTP client (used by Blazor components to call local API endpoints) ──────
builder.Services.AddHttpClient("api", client =>
{
    var baseUrl = builder.Configuration["App:BaseUrl"] ?? "https://localhost:5001";
    client.BaseAddress = new Uri(baseUrl);
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
});

// ─── Controllers + Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Document Signing API",
        Version = "v1",
        Description = "In-house electronic document signing platform — initiate signing, validate tokens, submit signatures."
    });

    // Include XML doc comments from the Api assembly
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);

    c.EnableAnnotations();
    c.OperationFilter<DocumentSigning.Api.Swagger.InitiateSigningExampleFilter>();
    c.OperationFilter<DocumentSigning.Api.Swagger.ApiKeyHeaderFilter>();
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
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Document Signing API";
    });
}

if (app.Environment.IsDevelopment())
{
    // developer-only tooling can go here
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAntiforgery();
app.UseRateLimiter();

app.MapControllers();

app.MapRazorComponents<DocumentSigning.Api.Components.App>()
    .AddInteractiveServerRenderMode();

app.Run();

// Make Program accessible to WebApplicationFactory in tests
public partial class Program { }
