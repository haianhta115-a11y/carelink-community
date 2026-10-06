using FluentValidation;
using CareLink.Domain;
namespace CareLink.Application.Admin;
public sealed class ReasonValidator : AbstractValidator<ReasonInput>
{
    public ReasonValidator() { RuleFor(x => x.Reason).NotEmpty().Length(3, 1000).WithMessage("Vui lòng nêu lý do từ 3 đến 1.000 ký tự."); }
}
public sealed class ReportValidator : AbstractValidator<ReportInput>
{
    public ReportValidator()
    {
        RuleFor(x => x.TargetType).IsInEnum(); RuleFor(x => x.Reason).IsInEnum(); RuleFor(x => x.Description).Length(10, 1000).WithMessage("Mô tả báo cáo cần từ 10 đến 1.000 ký tự.");
        RuleFor(x => x).Must(x => x.TargetType == ReportTarget.Request ? x.TargetRequestId.HasValue && !x.TargetUserId.HasValue : x.TargetUserId.HasValue && !x.TargetRequestId.HasValue).WithMessage("Vui lòng chọn đúng một đối tượng báo cáo.");
    }
}
public sealed class ResolveValidator : AbstractValidator<ResolveInput>
{
    public ResolveValidator()
    {
        RuleFor(x => x.Status).Must(s => s is ReportStatus.Reviewing or ReportStatus.Resolved or ReportStatus.Rejected);
        RuleFor(x => x.AdminNote).Length(3, 1000).WithMessage("Ghi chú xử lý cần từ 3 đến 1.000 ký tự.");
        RuleFor(x => x.Action).Must(a => a is null or "" or "HideRequest" or "LockUser");
        RuleFor(x => x).Must(x => string.IsNullOrEmpty(x.Action) || x.Status == ReportStatus.Resolved).WithMessage("Hành động kiểm duyệt chỉ áp dụng khi giải quyết báo cáo.");
    }
}
public sealed class AdminFilterValidator : AbstractValidator<AdminFilter>
{
    public AdminFilterValidator()
    {
        RuleFor(x => x.Keyword).MaximumLength(200); RuleFor(x => x.Role).IsInEnum().When(x => x.Role.HasValue);
        RuleFor(x => x.Status).MaximumLength(25); RuleFor(x => x.Action).MaximumLength(50);
        RuleFor(x => x.Group).MaximumLength(30);
        RuleFor(x => x.Page).InclusiveBetween(1, 100000); RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
        RuleFor(x => x).Must(x => !x.From.HasValue || !x.To.HasValue || x.From <= x.To).WithMessage("Ngày bắt đầu phải trước ngày kết thúc.");
    }
}
