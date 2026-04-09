namespace DocumentSigning.Core.Enums;

public enum AccessRole
{
    /// <summary>Standard user — send and view envelopes. (Default)</summary>
    User = 0,

    /// <summary>Full control — manage users, envelopes, and settings.</summary>
    Admin = 1,

    /// <summary>Read-only access — view envelopes only.</summary>
    Viewer = 2
}
