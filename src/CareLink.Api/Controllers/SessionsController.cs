using CareLink.Application.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace CareLink.Api.Controllers;
[ApiController, Route("api/sessions"), Authorize]
public sealed class SessionsController(SessionService sessions, ChatService chat, ReviewService reviews) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(int page = 1, int pageSize = 12) => Ok(await sessions.ListAsync(page, pageSize));
    [HttpGet("unread")] public async Task<IActionResult> Unread() => Ok(new { count = await sessions.UnreadAsync() });
    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id) => Ok(await sessions.GetAsync(id));
    [HttpGet("{id:guid}/messages")] public async Task<IActionResult> Messages(Guid id, long? before = null, int limit = 30) => Ok(await chat.MessagesAsync(id, before, limit));
    [HttpPost("{id:guid}/messages"), EnableRateLimiting("messages"), RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Send(Guid id, [FromForm] string? content, IFormFile? image)
    {
        await using var stream = image?.OpenReadStream(); return Ok(await chat.SendAsync(id, content, stream, image?.Length ?? 0));
    }
    [HttpPost("{id:guid}/messages/read")] public async Task<IActionResult> Read(Guid id) { await chat.ReadAsync(id); return NoContent(); }
    [HttpGet("{id:guid}/messages/{messageId:long}/image")]
    public async Task<IActionResult> Image(Guid id, long messageId) { var file = await chat.ImageAsync(id, messageId); Response.Headers.CacheControl = "private, max-age=300"; return File(file.Stream, file.ContentType); }
    [HttpGet("{id:guid}/review")] public async Task<IActionResult> Review(Guid id) => Ok(await reviews.GetAsync(id));
    [HttpPost("{id:guid}/review"), Authorize(Roles = "Requester")] public async Task<IActionResult> Review(Guid id, ReviewInput input) => StatusCode(201, await reviews.CreateAsync(id, input));
}
