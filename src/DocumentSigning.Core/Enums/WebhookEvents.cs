namespace DocumentSigning.Core.Enums;

/// <summary>All event names supported by the webhook delivery system.</summary>
public static class WebhookEvents
{
    public const string EnvelopeProcessing = "envelope.processing";
    public const string EnvelopeSent       = "envelope.sent";
    public const string EnvelopeSigned     = "envelope.signed";
    public const string EnvelopeConfirmed  = "envelope.confirmed";
    public const string EnvelopeCompleted  = "envelope.completed";
    public const string EnvelopeFailed     = "envelope.failed";
    public const string EnvelopeExpired    = "envelope.expired";
    public const string EnvelopeRejected   = "envelope.rejected";
    public const string EnvelopeCancelled  = "envelope.cancelled";
    public const string TicketCreated      = "ticket.created";
    public const string TicketReplied      = "ticket.replied";

    public static readonly IReadOnlyList<string> All = new[]
    {
        EnvelopeProcessing, EnvelopeSent, EnvelopeSigned, EnvelopeConfirmed, EnvelopeCompleted,
        EnvelopeFailed, EnvelopeExpired, EnvelopeRejected, EnvelopeCancelled,
        TicketCreated, TicketReplied
    };
}
