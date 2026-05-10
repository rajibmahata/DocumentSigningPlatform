namespace DocumentSigning.Core.Entities;

/// <summary>
/// Cognitive memory of individual customer interactions.
/// Enables personalised, context-aware future communication.
/// </summary>
public class CustomerInteractionMemory
{
    public Guid     Id                      { get; set; } = Guid.NewGuid();
    public Guid     MerchantId              { get; set; }
    public Merchant? Merchant                { get; set; }

    public string   CustomerEmail           { get; set; } = string.Empty;
    public string?  CustomerName            { get; set; }

    /// <summary>email_reply | social_comment | form_submission | chat | unsubscribe</summary>
    public string   InteractionType         { get; set; } = string.Empty;

    /// <summary>email | linkedin | facebook | website</summary>
    public string   Platform                { get; set; } = "email";

    /// <summary>Raw message from the customer.</summary>
    public string   Message                 { get; set; } = string.Empty;

    /// <summary>AI interpretation: intent, objection type, interest level.</summary>
    public string?  AiInterpretation        { get; set; }

    /// <summary>positive | neutral | negative | objection | interested | not_interested</summary>
    public string   Sentiment               { get; set; } = "neutral";

    /// <summary>AI-recommended next action for this customer.</summary>
    public string?  NextRecommendedAction   { get; set; }

    /// <summary>Number of days to wait before re-engaging (0 = no delay).</summary>
    public int      ReEngageDaysDelay       { get; set; } = 0;

    /// <summary>Objection type if applicable: price | timing | competitor | no_need | trust</summary>
    public string?  ObjectionType           { get; set; }

    public DateTime CreatedAt               { get; set; } = DateTime.UtcNow;
}
