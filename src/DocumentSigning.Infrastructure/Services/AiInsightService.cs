using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Enums;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.BackgroundJobs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services;

/// <summary>
/// Enqueues document AI-summary jobs via OutboxQueue.
/// Background processing calls OpenAI Chat Completions API.
/// Requires configuration section: OpenAI:ApiKey and OpenAI:Model.
/// </summary>
public sealed class AiInsightService : IAiInsightService
{
    private readonly IDocumentInsightRepository  _insightRepo;
    private readonly IDocumentRepository         _documentRepo;
    private readonly IOutboxQueueRepository      _outbox;
    private readonly IConfiguration              _config;
    private readonly ILogger<AiInsightService>   _logger;

    public AiInsightService(
        IDocumentInsightRepository insightRepo,
        IDocumentRepository documentRepo,
        IOutboxQueueRepository outbox,
        IConfiguration config,
        ILogger<AiInsightService> logger)
    {
        _insightRepo  = insightRepo;
        _documentRepo = documentRepo;
        _outbox       = outbox;
        _config       = config;
        _logger       = logger;
    }

    public async Task EnqueueSummaryAsync(Guid documentId, Guid merchantId, CancellationToken ct = default)
    {
        // Create/reset DocumentInsight row
        var existing = await _insightRepo.GetByDocumentIdAsync(documentId, ct);
        if (existing is null)
        {
            await _insightRepo.AddAsync(new DocumentInsight
            {
                Id         = Guid.NewGuid(),
                DocumentId = documentId,
                Summary    = string.Empty,
                Status     = "Pending",
                CreatedAt  = DateTime.UtcNow,
            }, ct);
        }
        else
        {
            existing.Status       = "Pending";
            existing.ErrorMessage = null;
            await _insightRepo.UpdateAsync(existing, ct);
        }
        await _insightRepo.SaveChangesAsync(ct);

        // Enqueue background job
        var payload = JsonSerializer.Serialize(new AiSummaryPayload(documentId, merchantId));
        await _outbox.AddAsync(new OutboxQueue
        {
            Id        = Guid.NewGuid(),
            JobType   = JobTypes.AiSummary,
            Payload   = payload,
            Status    = JobStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        }, ct);
        await _outbox.SaveChangesAsync(ct);
    }

    public async Task<DocumentInsightDto?> GetInsightAsync(Guid documentId, CancellationToken ct = default)
    {
        var entity = await _insightRepo.GetByDocumentIdAsync(documentId, ct);
        if (entity is null) return null;
        return Map(entity);
    }

    public async Task ProcessInsightJobAsync(Guid documentId, CancellationToken ct = default)
    {
        var insight = await _insightRepo.GetByDocumentIdAsync(documentId, ct);
        if (insight is null)
        {
            _logger.LogWarning("AI insight record not found for document {DocumentId}", documentId);
            return;
        }

        insight.Status = "Processing";
        await _insightRepo.UpdateAsync(insight, ct);
        await _insightRepo.SaveChangesAsync(ct);

        try
        {
            var document = await _documentRepo.GetByIdAsync(documentId, ct);
            if (document is null) throw new InvalidOperationException($"Document {documentId} not found.");

            var extractedText = ExtractTextFromDocument(document);
            var (summary, risks) = await CallOpenAiAsync(extractedText, ct);

            insight.Summary      = summary;
            insight.RisksJson    = JsonSerializer.Serialize(risks);
            insight.Status       = "Done";
            insight.CompletedAt  = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI insight processing failed for document {DocumentId}", documentId);
            insight.Status       = "Failed";
            insight.ErrorMessage = ex.Message;
        }

        await _insightRepo.UpdateAsync(insight, ct);
        await _insightRepo.SaveChangesAsync(ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static string ExtractTextFromDocument(Document document)
    {
        // For now, treat DocumentBytes as UTF-8 text (PDF extraction requires PdfPig; this is the stub).
        // In production: add UglyToad.PdfPig NuGet and extract page text.
        if (document.ContentBytes is null || document.ContentBytes.Length == 0)
            return string.Empty;

        try
        {
            return System.Text.Encoding.UTF8.GetString(document.ContentBytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    private async Task<(string summary, List<string> risks)> CallOpenAiAsync(string text, CancellationToken ct)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        var model  = _config["OpenAI:Model"] ?? "gpt-4o-mini";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            // Return stub when not configured — useful for dev/test
            return ("AI summary not configured. Set OpenAI:ApiKey in settings.", []);
        }

        // Truncate to ~4000 chars to stay well within token limits
        if (text.Length > 4000) text = text[..4000];

        var requestBody = new
        {
            model,
            response_format = new { type = "json_object" },
            messages = new[]
            {
                new
                {
                    role    = "system",
                    content = "You are a legal document analyst. Respond ONLY with valid JSON: { \"summary\": string, \"risks\": string[] }",
                },
                new
                {
                    role    = "user",
                    content = $"Summarise this document and list any risks:\n\n{text}",
                },
            },
            max_tokens = 512,
        };

        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await http.PostAsJsonAsync(
            "https://api.openai.com/v1/chat/completions", requestBody, ct);

        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);

        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        using var parsed = JsonDocument.Parse(content);
        var root    = parsed.RootElement;
        var summary = root.TryGetProperty("summary", out var s) ? s.GetString() ?? string.Empty : string.Empty;
        var risks   = new List<string>();
        if (root.TryGetProperty("risks", out var r) && r.ValueKind == JsonValueKind.Array)
            foreach (var item in r.EnumerateArray())
                risks.Add(item.GetString() ?? string.Empty);

        return (summary, risks);
    }

    private static DocumentInsightDto Map(DocumentInsight e)
    {
        List<string> risks = [];
        if (!string.IsNullOrEmpty(e.RisksJson))
        {
            try { risks = JsonSerializer.Deserialize<List<string>>(e.RisksJson) ?? []; }
            catch { /* ignore */ }
        }

        return new DocumentInsightDto(e.Id, e.DocumentId, e.Summary ?? string.Empty, risks, e.Status, e.CreatedAt, e.CompletedAt);
    }
}
