using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Auth;

public sealed class ProfileService(IDataStore db, ICurrentUser current, IPasswordHasher passwords, ITokenService tokens, IFileStorage files, IClock clock, IAccountCache cache, IRealtimeEvents realtime, IValidator<ProfileInput> profileValidator, IValidator<PasswordInput> passwordValidator)
{
    private async Task<User> CurrentAsync() => await db.FirstAsync(db.Query<User>().Where(u => u.Id == current.Id)) ?? throw AppException.NotFound();
    public async Task<UserDto> GetAsync() => (await CurrentAsync()).ToDto();
    public async Task<UserDto> UpdateAsync(ProfileInput input)
    {
        input = input with { FullName = input.FullName.Trim(), Phone = string.IsNullOrWhiteSpace(input.Phone) ? null : input.Phone.Trim(), Address = string.IsNullOrWhiteSpace(input.Address) ? null : input.Address.Trim() };
        await profileValidator.ValidateAndThrowAsync(input);
        var user = await CurrentAsync(); user.FullName = input.FullName; user.Phone = input.Phone; user.Address = input.Address; user.UpdatedAt = clock.UtcNow;
        await db.UpdateProfileAsync(current.Id, input.FullName, input.Phone, input.Address, clock.UtcNow); return user.ToDto();
    }
    public async Task<AuthDto> ChangePasswordAsync(PasswordInput input)
    {
        await passwordValidator.ValidateAndThrowAsync(input);
        var user = await CurrentAsync();
        if (!passwords.Verify(input.CurrentPassword, user.PasswordHash)) throw new AppException(401, "INVALID_CREDENTIALS", "Mật khẩu hiện tại không đúng.");
        var hash = passwords.Hash(input.NewPassword);
        if (!await db.ChangePasswordAsync(user.Id, user.TokenVersion, user.PasswordHash, hash, clock.UtcNow)) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Tài khoản vừa được cập nhật.");
        user.PasswordHash = hash; user.TokenVersion++; user.UpdatedAt = clock.UtcNow;
        cache.Invalidate(user.Id); await realtime.RevokeConnectionsAsync(user.Id); return tokens.Issue(user);
    }
    public async Task<UserDto> AvatarAsync(Stream stream, long length)
    {
        var user = await CurrentAsync(); var oldPath = user.AvatarPath;
        var file = await files.SaveImageAsync(stream, length, 2 * 1024 * 1024, "avatars");
        try { user.AvatarPath = file.Path; user.UpdatedAt = clock.UtcNow; await db.SetAvatarAsync(user.Id, file.Path, clock.UtcNow); }
        catch { files.Delete(file.Path); throw; }
        if (oldPath is not null) files.Delete(oldPath);
        return user.ToDto();
    }
    public async Task<PublicUserDto> PublicAsync(Guid id)
    {
        var user = await db.FirstAsync(db.Query<User>().Where(u => u.Id == id)) ?? throw AppException.NotFound();
        var stats = await db.FirstAsync(db.Query<Review>().Where(r => r.RevieweeId == id).GroupBy(r => 1).Select(g => new { Average = g.Average(r => (double)r.Rating), Count = g.Count() }));
        return new PublicUserDto(user.Id, user.FullName, user.Role, user.AvatarPath == null ? null : $"/api/users/{id}/avatar", stats?.Average, stats?.Count ?? 0);
    }
    public async Task<(Stream Stream, string ContentType)> ReadAvatarAsync(Guid id)
    {
        var user = await db.FirstAsync(db.Query<User>().Where(u => u.Id == id)) ?? throw AppException.NotFound();
        if (user.AvatarPath is null) throw AppException.NotFound();
        var type = Path.GetExtension(user.AvatarPath) switch { ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
        return (await files.OpenAsync(user.AvatarPath), type);
    }
}
