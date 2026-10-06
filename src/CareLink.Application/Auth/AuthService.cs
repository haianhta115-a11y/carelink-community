using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Auth;

public sealed class AuthService(IDataStore db, IPasswordHasher passwords, ITokenService tokens, IClock clock, IValidator<RegisterInput> registerValidator, IValidator<LoginInput> loginValidator)
{
    public async Task<UserDto> RegisterAsync(RegisterInput input)
    {
        input = input with { Email = input.Email.Trim().ToLowerInvariant(), FullName = input.FullName.Trim(), Phone = string.IsNullOrWhiteSpace(input.Phone) ? null : input.Phone.Trim() };
        await registerValidator.ValidateAndThrowAsync(input);
        if (await db.AnyAsync(db.Query<User>().Where(u => u.Email == input.Email))) throw AppException.Conflict("EMAIL_TAKEN", "Email này đã được đăng ký.");
        var user = new User { Email = input.Email, FullName = input.FullName, PasswordHash = passwords.Hash(input.Password), Role = input.Role, Phone = input.Phone, CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };
        db.Add(user);
        try { await db.SaveAsync(); }
        catch (AppException ex) when (ex.Code == "CONCURRENCY_CONFLICT") { throw AppException.Conflict("EMAIL_TAKEN", "Email này đã được đăng ký."); }
        return user.ToDto();
    }
    public async Task<AuthDto> LoginAsync(LoginInput input)
    {
        await loginValidator.ValidateAndThrowAsync(input);
        var email = input.Email.Trim().ToLowerInvariant();
        var user = await db.FirstAsync(db.Query<User>().Where(u => u.Email == email));
        if (user is null || !passwords.Verify(input.Password, user.PasswordHash)) throw new AppException(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        if (user.Status == UserStatus.Locked) throw new AppException(403, "ACCOUNT_LOCKED", "Tài khoản đã bị khóa: " + user.LockedReason);
        return tokens.Issue(user);
    }
}
