using CareLink.Application.Common;
using CareLink.Domain;
namespace CareLink.Api.Auth;
public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid Id => Guid.TryParse(accessor.HttpContext?.User.FindFirst("sub")?.Value, out var id) ? id : throw new AppException(401, "UNAUTHORIZED", "Bạn cần đăng nhập.");
    public UserRole Role => Enum.TryParse<UserRole>(accessor.HttpContext?.User.FindFirst("role")?.Value, out var role) ? role : throw AppException.Forbidden();
}
