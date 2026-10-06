using CareLink.Domain;
namespace CareLink.Application.Auth;
public sealed record UserDto(Guid Id, string Email, string FullName, UserRole Role, UserStatus Status, string? AvatarUrl, string? Phone, string? Address, DateTime CreatedAt);
public sealed record PublicUserDto(Guid Id, string FullName, UserRole Role, string? AvatarUrl, double? AverageRating, int ReviewCount);
public sealed record AuthDto(string Token, DateTime ExpiresAt, UserDto User);
public sealed record RegisterInput(string FullName, string Email, string Password, string ConfirmPassword, UserRole Role, string? Phone);
public sealed record LoginInput(string Email, string Password);
public sealed record ProfileInput(string FullName, string? Phone, string? Address);
public sealed record PasswordInput(string CurrentPassword, string NewPassword, string ConfirmPassword);
public interface ITokenService { AuthDto Issue(User user); }
public static class UserMapping
{
    public static UserDto ToDto(this User user) => new(user.Id, user.Email, user.FullName, user.Role, user.Status, user.AvatarPath == null ? null : $"/api/users/{user.Id}/avatar", user.Phone, user.Address, user.CreatedAt);
}
