using DocumentSigning.Core.DTOs;
using FluentValidation;

namespace DocumentSigning.Api.Validators;

public class InitiateEnvelopeRequestValidator : AbstractValidator<InitiateEnvelopeRequest>
{
    public InitiateEnvelopeRequestValidator()
    {
        RuleFor(x => x.TokenTtlDays)
            .InclusiveBetween(1, 365)
            .When(x => x.TokenTtlDays.HasValue)
            .WithMessage("TokenTtlDays must be between 1 and 365.");
    }
}
