using System.Globalization;
using System.Text;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;
using DocumentSigning.Core.Interfaces;

namespace DocumentSigning.Infrastructure.Services;

public class SignerContactService : ISignerContactService
{
    private readonly ISignerContactRepository _repo;

    public SignerContactService(ISignerContactRepository repo) => _repo = repo;

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static SignerContactResponse ToResponse(SignerContact c) => new(
        c.Id, c.UserId, c.Name, c.Email, c.Role,
        c.Phone, c.Company, c.IsActive, c.CreatedAt, c.UpdatedAt);

    // ── Read ──────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<SignerContactResponse>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var contacts = await _repo.GetByUserIdAsync(userId, ct);
        return contacts.Select(ToResponse).ToList();
    }

    public async Task<IReadOnlyList<SignerContactResponse>> SearchAsync(Guid userId, string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return await GetAllAsync(userId, ct);

        var contacts = await _repo.SearchAsync(userId, query, ct);
        return contacts.Select(ToResponse).ToList();
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public async Task<SignerContactResponse> CreateAsync(Guid userId, CreateSignerContactRequest request, CancellationToken ct = default)
    {
        // Enforce uniqueness per user+email
        var existing = await _repo.GetByEmailAsync(userId, request.Email, ct);
        if (existing is not null)
        {
            // Reactivate if soft-deleted
            if (!existing.IsActive)
            {
                existing.IsActive   = true;
                existing.Name       = request.Name.Trim();
                existing.Role       = string.IsNullOrWhiteSpace(request.Role) ? "signer" : request.Role.Trim();
                existing.Phone      = request.Phone?.Trim();
                existing.Company    = request.Company?.Trim();
                existing.UpdatedAt  = DateTime.UtcNow;
                await _repo.UpdateAsync(existing, ct);
                await _repo.SaveChangesAsync(ct);
                return ToResponse(existing);
            }
            throw new InvalidOperationException($"A contact with email '{request.Email}' already exists.");
        }

        var contact = new SignerContact
        {
            Id        = Guid.NewGuid(),
            UserId    = userId,
            Name      = request.Name.Trim(),
            Email     = request.Email.Trim().ToLowerInvariant(),
            Role      = string.IsNullOrWhiteSpace(request.Role) ? "signer" : request.Role.Trim(),
            Phone     = request.Phone?.Trim(),
            Company   = request.Company?.Trim(),
            IsActive  = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repo.AddAsync(contact, ct);
        await _repo.SaveChangesAsync(ct);
        return ToResponse(contact);
    }

    public async Task<SignerContactResponse?> UpdateAsync(Guid userId, Guid contactId, UpdateSignerContactRequest request, CancellationToken ct = default)
    {
        var contact = await _repo.GetByIdAsync(contactId, ct);
        if (contact is null || contact.UserId != userId) return null;

        // If email changed, verify uniqueness
        if (!string.Equals(contact.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            var dupe = await _repo.GetByEmailAsync(userId, request.Email, ct);
            if (dupe is not null && dupe.Id != contactId)
                throw new InvalidOperationException($"A contact with email '{request.Email}' already exists.");
        }

        contact.Name      = request.Name.Trim();
        contact.Email     = request.Email.Trim().ToLowerInvariant();
        contact.Role      = string.IsNullOrWhiteSpace(request.Role) ? "signer" : request.Role.Trim();
        contact.Phone     = request.Phone?.Trim();
        contact.Company   = request.Company?.Trim();
        contact.IsActive  = request.IsActive;
        contact.UpdatedAt = DateTime.UtcNow;

        await _repo.UpdateAsync(contact, ct);
        await _repo.SaveChangesAsync(ct);
        return ToResponse(contact);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid contactId, CancellationToken ct = default)
    {
        var contact = await _repo.GetByIdAsync(contactId, ct);
        if (contact is null || contact.UserId != userId) return false;

        // Soft-delete
        contact.IsActive  = false;
        contact.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(contact, ct);
        await _repo.SaveChangesAsync(ct);
        return true;
    }

    // ── Auto-create from envelope ─────────────────────────────────────────────

    public async Task UpsertFromSignerAsync(Guid userId, string name, string email, string role, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email)) return;

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existing = await _repo.GetByEmailAsync(userId, normalizedEmail, ct);

        if (existing is null)
        {
            var contact = new SignerContact
            {
                Id        = Guid.NewGuid(),
                UserId    = userId,
                Name      = name.Trim(),
                Email     = normalizedEmail,
                Role      = string.IsNullOrWhiteSpace(role) ? "signer" : role.Trim(),
                IsActive  = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            await _repo.AddAsync(contact, ct);
            await _repo.SaveChangesAsync(ct);
        }
        else if (!existing.IsActive)
        {
            existing.IsActive   = true;
            existing.UpdatedAt  = DateTime.UtcNow;
            await _repo.UpdateAsync(existing, ct);
            await _repo.SaveChangesAsync(ct);
        }
        // If active contact already exists, leave it unchanged.
    }

    // ── CSV Import ────────────────────────────────────────────────────────────

    public async Task<SignerContactImportResult> ImportCsvAsync(Guid userId, string csvContent, CancellationToken ct = default)
    {
        var imported = 0;
        var skipped  = 0;
        var failed   = 0;
        var errors   = new List<string>();

        var lines = csvContent
            .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        if (lines.Count == 0) return new(0, 0, 0, ["Empty file."]);

        // Detect and skip header row
        var startIndex = 0;
        var firstLine  = lines[0].ToLowerInvariant();
        if (firstLine.Contains("name") || firstLine.Contains("email"))
            startIndex = 1;

        for (var i = startIndex; i < lines.Count; i++)
        {
            var parts = SplitCsvLine(lines[i]);
            if (parts.Length < 2)
            {
                errors.Add($"Row {i + 1}: fewer than 2 columns — skipped.");
                failed++;
                continue;
            }

            var name    = parts[0].Trim().Trim('"');
            var email   = parts[1].Trim().Trim('"').ToLowerInvariant();
            var role    = parts.Length > 2 ? parts[2].Trim().Trim('"') : "signer";
            var phone   = parts.Length > 3 ? parts[3].Trim().Trim('"') : null;
            var company = parts.Length > 4 ? parts[4].Trim().Trim('"') : null;

            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email))
            {
                errors.Add($"Row {i + 1}: name or email is empty — skipped.");
                failed++;
                continue;
            }

            if (!IsValidEmail(email))
            {
                errors.Add($"Row {i + 1}: '{email}' is not a valid email — skipped.");
                failed++;
                continue;
            }

            var existing = await _repo.GetByEmailAsync(userId, email, ct);
            if (existing is not null && existing.IsActive)
            {
                skipped++;
                continue;
            }

            if (existing is not null && !existing.IsActive)
            {
                existing.IsActive   = true;
                existing.Name       = name;
                existing.Role       = string.IsNullOrWhiteSpace(role) ? "signer" : role;
                existing.Phone      = string.IsNullOrWhiteSpace(phone) ? existing.Phone : phone;
                existing.Company    = string.IsNullOrWhiteSpace(company) ? existing.Company : company;
                existing.UpdatedAt  = DateTime.UtcNow;
                await _repo.UpdateAsync(existing, ct);
                await _repo.SaveChangesAsync(ct);
                imported++;
                continue;
            }

            var contact = new SignerContact
            {
                Id        = Guid.NewGuid(),
                UserId    = userId,
                Name      = name,
                Email     = email,
                Role      = string.IsNullOrWhiteSpace(role) ? "signer" : role,
                Phone     = string.IsNullOrWhiteSpace(phone) ? null : phone,
                Company   = string.IsNullOrWhiteSpace(company) ? null : company,
                IsActive  = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _repo.AddAsync(contact, ct);
            await _repo.SaveChangesAsync(ct);
            imported++;
        }

        return new(imported, skipped, failed, errors);
    }

    // ── CSV Export ────────────────────────────────────────────────────────────

    public async Task<string> ExportCsvAsync(Guid userId, CancellationToken ct = default)
    {
        var contacts = await _repo.GetByUserIdAsync(userId, ct);
        var sb = new StringBuilder();
        sb.AppendLine("Name,Email,Role,Phone,Company");
        foreach (var c in contacts)
        {
            sb.AppendLine(
                $"{EscapeCsv(c.Name)},{EscapeCsv(c.Email)},{EscapeCsv(c.Role)}," +
                $"{EscapeCsv(c.Phone ?? "")},{EscapeCsv(c.Company ?? "")}");
        }
        return sb.ToString();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }

    private static string[] SplitCsvLine(string line)
    {
        // Simple CSV split that handles quoted fields
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        foreach (var ch in line)
        {
            if (ch == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (ch == ',' && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(ch);
            }
        }
        result.Add(current.ToString());
        return result.ToArray();
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}
