namespace DocumentSigning.Core.Enums;

public enum EnvelopeStatus
{
    Sent        = 0,  // Email dispatched to signer(s)
    Signed      = 1,  // At least one signer has signed (was InProgress — same DB value, safe rename)
    Completed   = 2,  // All signers completed
    Cancelled   = 3,  // Sender cancelled the envelope
    Processing  = 4,  // Request accepted; system is preparing / sending emails
    Failed      = 5,  // System error occurred while sending or stamping
    Expired     = 6,  // Signing window elapsed without completion
    Rejected    = 7   // Signer explicitly rejected the document
}
