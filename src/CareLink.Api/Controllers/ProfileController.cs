using CareLink.Application.Auth;
using CareLink.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace CareLink.Api.Controllers;
[ApiController, Route("api/profile"), Authorize]
public sealed class ProfileController(ProfileService profile) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> Get() => Ok(await profile.GetAsync());
    [HttpPut] public async Task<IActionResult> Update(ProfileInput input) => Ok(await profile.UpdateAsync(input));
    [HttpPut("password")] public async Task<IActionResult> Password(PasswordInput input) => Ok(await profile.ChangePasswordAsync(input));
    [HttpPut("avatar"), RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> Avatar(IFormFile image)
    {
        if (image is null) throw new AppException(400, "FILE_INVALID", "Vui lòng chọn ảnh.");
        await using var stream = image.OpenReadStream(); return Ok(await profile.AvatarAsync(stream, image.Length));
    }
}
[ApiController, Route("api/users"), Authorize]
public sealed class UsersController(ProfileService profile) : ControllerBase
{
    [HttpGet("{id:guid}/public")] public async Task<IActionResult> Public(Guid id) => Ok(await profile.PublicAsync(id));
    [HttpGet("{id:guid}/avatar")]
    public async Task<IActionResult> Avatar(Guid id)
    {
        var file = await profile.ReadAvatarAsync(id); Response.Headers.CacheControl = "private, max-age=300";
        return File(file.Stream, file.ContentType);
    }
}
