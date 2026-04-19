namespace DocumentSigning.Core.Enums;

/// <summary>Outcome of an audited event.</summary>
public static class AuditStatuses
{
    public const string Success = "Success";
    public const string Failure = "Failure";
    public const string Warning = "Warning";
}

/// <summary>Entity type name constants used in EntityType column.</summary>
public static class AuditEntities
{
    public const string Envelope = "Envelope";
    public const string Document = "Document";
    public const string User     = "User";
    public const string Merchant = "Merchant";
    public const string Ticket   = "Ticket";
    public const string Portal   = "Portal";
}
