using System.Text.Json;
using System.Text.RegularExpressions;
using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Interfaces;
using DocumentSigning.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DocumentSigning.Infrastructure.Services.Agents;

/// <summary>
/// Agentic flow that validates every signer contact email for a merchant.
/// Contacts with invalid or malformed email addresses are soft-deleted (IsActive = false).
/// Returns a JSON summary: total, valid, invalid, and details of removed contacts.
/// </summary>
public sealed class ContactEmailValidationAgent(
    AppDbContext db,
    ILogger<ContactEmailValidationAgent> log) : ISpecializedAgent
{
    public string AgentType => "contact_email_validation";

    // RFC 5322–inspired regex; rejects obvious malformations and requires a real TLD
    private static readonly Regex _emailRegex = new(
        @"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase,
        matchTimeout: TimeSpan.FromMilliseconds(200));

    public async Task<AgentExecutionOutput> ExecuteAsync(
        AgentExecutionInput input, CancellationToken ct = default)
    {
        log.LogInformation(
            "ContactEmailValidationAgent executing for merchant {MerchantId}", input.MerchantId);

        // Resolve the merchant to get the associated userId
        var merchant = await db.Merchants
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == input.MerchantId, ct);

        if (merchant is null)
            return Fail("Merchant not found.");

        // Load all active contacts belonging to this merchant's user
        var contacts = await db.SignerContacts
            .Where(c => c.UserId == merchant.UserId && c.IsActive)
            .ToListAsync(ct);

        if (contacts.Count == 0)
        {
            var emptyOutput = new
            {
                total   = 0,
                valid   = 0,
                invalid = 0,
                deleted = Array.Empty<object>()
            };
            return new AgentExecutionOutput(
                true,
                "No active contacts found to validate.",
                JsonSerializer.Serialize(emptyOutput),
                null, null);
        }

        var removed = new List<object>();
        var validCount = 0;

        foreach (var contact in contacts)
        {
            if (!IsValidEmail(contact.Email))
            {
                contact.IsActive  = false;
                contact.UpdatedAt = DateTime.UtcNow;
                removed.Add(new
                {
                    id     = contact.Id,
                    name   = contact.Name,
                    email  = contact.Email,
                    reason = "Invalid email format"
                });
                log.LogInformation(
                    "Marking contact {Id} ({Email}) inactive — invalid email", contact.Id, contact.Email);
            }
            else
            {
                validCount++;
            }
        }

        if (removed.Count > 0)
            await db.SaveChangesAsync(ct);

        var summary = new
        {
            total   = contacts.Count,
            valid   = validCount,
            invalid = removed.Count,
            deleted = removed
        };

        var message =
            $"Email validation complete. {validCount}/{contacts.Count} contacts valid. " +
            $"{removed.Count} contact(s) removed due to invalid email addresses.";

        log.LogInformation(
            "ContactEmailValidationAgent finished: {Valid}/{Total} valid, {Invalid} removed for merchant {MerchantId}",
            validCount, contacts.Count, removed.Count, input.MerchantId);

        return new AgentExecutionOutput(
            true,
            message,
            JsonSerializer.Serialize(summary),
            null, null);
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        try
        {
            return _emailRegex.IsMatch(email.Trim());
        }
        catch (RegexMatchTimeoutException)
        {
            return false;
        }
    }

    private static AgentExecutionOutput Fail(string error) =>
        new(false, null, null, null, error);
}
