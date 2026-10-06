using FluentValidation;
namespace CareLink.Application.Requests;
public sealed class CreateRequestValidator : AbstractValidator<CreateRequestInput>
{
    public CreateRequestValidator()
    {
        RuleFor(x => x.Title).Length(5, 120).WithMessage("Tiêu đề cần từ 5 đến 120 ký tự.");
        RuleFor(x => x.Description).Length(20, 2000).WithMessage("Mô tả cần từ 20 đến 2.000 ký tự.");
        RuleFor(x => x.Location).Length(3, 200).WithMessage("Địa điểm cần từ 3 đến 200 ký tự.");
        RuleFor(x => x.CategoryId).GreaterThan(0).WithMessage("Vui lòng chọn danh mục."); RuleFor(x => x.Urgency).IsInEnum();
    }
}
public sealed class RequestFilterValidator : AbstractValidator<RequestFilter>
{
    public RequestFilterValidator()
    {
        RuleFor(x => x.Keyword).MaximumLength(200); RuleFor(x => x.Location).MaximumLength(200);
        RuleFor(x => x.Group).MaximumLength(30);
        RuleFor(x => x.CategoryId).GreaterThan(0).When(x => x.CategoryId.HasValue); RuleFor(x => x.Urgency).IsInEnum().When(x => x.Urgency.HasValue);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status.HasValue); RuleFor(x => x.Sort).Must(x => x is "newest" or "urgency");
        RuleFor(x => x.Page).InclusiveBetween(1, 100000); RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
    }
}
