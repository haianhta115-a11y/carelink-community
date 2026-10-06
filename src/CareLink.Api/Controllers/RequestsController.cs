using CareLink.Application.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace CareLink.Api.Controllers;
[ApiController, Route("api/requests"), Authorize]
public sealed class RequestsController(RequestService requests, RequestStatusService statuses, CommunityService community) : ControllerBase
{
    [HttpPost, Authorize(Roles = "Requester")] public async Task<IActionResult> Create(CreateRequestInput input) { var result = await requests.CreateAsync(input); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpGet] public async Task<IActionResult> List([FromQuery] RequestFilter filter) => Ok(await requests.ListAsync(filter));
    [HttpGet("mine"), Authorize(Roles = "Requester,Helper")] public async Task<IActionResult> Mine([FromQuery] RequestFilter filter) => Ok(await requests.ListAsync(filter, true));
    [HttpGet("summary"), Authorize(Roles = "Requester,Helper")] public async Task<IActionResult> Summary() => Ok(await community.SummaryAsync());
    [HttpGet("{id:guid}")] public async Task<IActionResult> Get(Guid id) => Ok(await requests.GetAsync(id));
    [HttpGet("{id:guid}/history")] public async Task<IActionResult> History(Guid id) => Ok(await requests.HistoryAsync(id));
    [HttpPost("{id:guid}/accept"), Authorize(Roles = "Helper")] public async Task<IActionResult> Accept(Guid id) => Ok(await statuses.AcceptAsync(id));
    [HttpPost("{id:guid}/start"), Authorize(Roles = "Helper")] public async Task<IActionResult> Start(Guid id) => Ok(await statuses.StartAsync(id));
    [HttpPost("{id:guid}/complete"), Authorize(Roles = "Requester")] public async Task<IActionResult> Complete(Guid id) => Ok(await statuses.CompleteAsync(id));
}
[ApiController, Route("api/categories"), Authorize]
public sealed class CategoriesController(RequestService requests) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List() => Ok(await requests.CategoriesAsync());
}
