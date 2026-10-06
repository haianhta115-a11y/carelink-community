using CareLink.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace CareLink.Api.Controllers;
[ApiController, Route("api/auth")]
public sealed class AuthController(AuthService auth, ProfileService profile) : ControllerBase
{
    [HttpPost("register"), EnableRateLimiting("register")]
    public async Task<IActionResult> Register(RegisterInput input) => StatusCode(201, await auth.RegisterAsync(input));
    [HttpPost("login"), EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginInput input) => Ok(await auth.LoginAsync(input));
    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me() => Ok(await profile.GetAsync());
}
