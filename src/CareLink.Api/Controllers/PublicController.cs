using CareLink.Application.Requests;
using Microsoft.AspNetCore.Mvc;
namespace CareLink.Api.Controllers;

[ApiController, Route("api/public")]
public sealed class PublicController(CommunityService community, RequestService requests) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<IActionResult> Stats() => Ok(await community.StatsAsync());
    [HttpGet("categories")] public async Task<IActionResult> Categories() => Ok(await requests.CategoriesAsync());
}
