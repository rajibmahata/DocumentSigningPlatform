using DocumentSigning.Core.DTOs;
using DocumentSigning.Core.Entities;

namespace DocumentSigning.Core.Interfaces;

public interface ISignerContactService
{
    Task<IReadOnlyList<SignerContactResponse>> GetAllAsync(Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<SignerContactResponse>> SearchAsync(Guid userId, string query, CancellationToken ct = default);

    Task<SignerContactResponse> CreateAsync(Guid userId, CreateSignerContactRequest request, CancellationToken ct = default);

    Task<SignerContactResponse?> UpdateAsync(Guid userId, Guid contactId, UpdateSignerContactRequest request, CancellationToken ct = default);

    /// <summary>Returns true if the contact was found and deleted.</summary>
    Task<bool> DeleteAsync(Guid userId, Guid contactId, CancellationToken ct = default);

    /// <summary>
    /// Upserts a contact from signer data. If the contact already exists for this user+email,
    /// updates name and role only if they differ. Used for auto-create after envelope creation.
    /// </summary>
    Task UpsertFromSignerAsync(Guid userId, string name, string email, string role, CancellationToken ct = default);

    /// <summary>Imports contacts from a CSV string. Returns import summary.</summary>
    Task<SignerContactImportResult> ImportCsvAsync(Guid userId, string csvContent, CancellationToken ct = default);

    /// <summary>Exports all contacts for a user as a CSV string.</summary>
    Task<string> ExportCsvAsync(Guid userId, CancellationToken ct = default);
}
