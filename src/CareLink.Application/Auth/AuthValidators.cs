using System.Text;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Auth;

public static class PasswordPolicy
{
    public static bool IsValid(string password) => password.Length >= 8 && Encoding.UTF8.GetByteCount(password) <= 72 && password.Any(char.IsLetter) && password.Any(char.IsDigit);
    public const string Message = "Mật khẩu cần ít nhất 8 ký tự, có chữ và số, tối đa 72 byte.";
}
public sealed class RegisterValidator : AbstractValidator<RegisterInput>
{
    public RegisterValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().Length(2, 80).WithMessage("Họ tên cần từ 2 đến 80 ký tự.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254).WithMessage("Vui lòng nhập email hợp lệ.");
        RuleFor(x => x.Password).Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.Message);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password).WithMessage("Mật khẩu xác nhận chưa khớp.");
        RuleFor(x => x.Role).Must(r => r is UserRole.Requester or UserRole.Helper).WithMessage("Chỉ có thể đăng ký vai trò Người cần hỗ trợ hoặc Người hỗ trợ.");
        RuleFor(x => x.Phone).Matches(@"^(0|\+84)\d{9,10}$").When(x => !string.IsNullOrWhiteSpace(x.Phone)).WithMessage("Số điện thoại chưa đúng định dạng.");
    }
}
public sealed class LoginValidator : AbstractValidator<LoginInput>
{
    public LoginValidator() { RuleFor(x => x.Email).NotEmpty().MaximumLength(254); RuleFor(x => x.Password).NotEmpty().MaximumLength(200); }
}
public sealed class ProfileValidator : AbstractValidator<ProfileInput>
{
    public ProfileValidator()
    {
        RuleFor(x => x.FullName).Length(2, 80).WithMessage("Họ tên cần từ 2 đến 80 ký tự.");
        RuleFor(x => x.Phone).Matches(@"^(0|\+84)\d{9,10}$").When(x => !string.IsNullOrWhiteSpace(x.Phone)).WithMessage("Số điện thoại chưa đúng định dạng.");
        RuleFor(x => x.Address).MaximumLength(200).WithMessage("Địa chỉ tối đa 200 ký tự.");
    }
}
public sealed class PasswordValidator : AbstractValidator<PasswordInput>
{
    public PasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).Must(PasswordPolicy.IsValid).WithMessage(PasswordPolicy.Message);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.NewPassword).WithMessage("Mật khẩu xác nhận chưa khớp.");
    }
}
