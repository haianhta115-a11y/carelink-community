using CareLink.Application.Admin;
using CareLink.Application.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
namespace CareLink.Api.Controllers;
[ApiController, Route("api/admin"), Authorize(Policy = "AdminOnly")]
public sealed class AdminController(AdminService admin, RequestService requests, RequestStatusService statuses, CategoryService categories) : ControllerBase
{
    [HttpGet("dashboard")] public async Task<IActionResult> Dashboard() => Ok(await admin.DashboardAsync());
    [HttpGet("users")] public async Task<IActionResult> Users([FromQuery] AdminFilter filter) => Ok(await admin.UsersAsync(filter));
    [HttpPost("users/{id:guid}/lock")] public async Task<IActionResult> Lock(Guid id, ReasonInput input) { await admin.LockAsync(id, input, true); return NoContent(); }
    [HttpPost("users/{id:guid}/unlock")] public async Task<IActionResult> Unlock(Guid id, ReasonInput input) { await admin.LockAsync(id, input, false); return NoContent(); }
    [HttpGet("requests")] public async Task<IActionResult> Requests([FromQuery] RequestFilter filter) => Ok(await requests.ListAsync(filter));
    [HttpPost("requests/{id:guid}/hide")] public async Task<IActionResult> Hide(Guid id, ReasonInput input) { await admin.HideAsync(id, input, true); return NoContent(); }
    [HttpPost("requests/{id:guid}/unhide")] public async Task<IActionResult> Unhide(Guid id, ReasonInput input) { await admin.HideAsync(id, input, false); return NoContent(); }
    [HttpPost("requests/{id:guid}/status")] public async Task<IActionResult> Status(Guid id, ReasonInput input) => Ok(await statuses.ForceCompleteAsync(id, input));
    [HttpGet("reports")] public async Task<IActionResult> Reports([FromQuery] AdminFilter filter) => Ok(await admin.ReportsAsync(filter));
    [HttpGet("reports/{id:guid}")] public async Task<IActionResult> Report(Guid id) => Ok(await admin.ReportAsync(id));
    [HttpPost("reports/{id:guid}/resolve")] public async Task<IActionResult> Resolve(Guid id, ResolveInput input) => Ok(await admin.ResolveAsync(id, input));
    [HttpGet("audit-logs")] public async Task<IActionResult> Audit([FromQuery] AdminFilter filter) => Ok(await admin.AuditAsync(filter));
    [HttpGet("categories")] public async Task<IActionResult> Categories([FromQuery] AdminFilter filter) => Ok(await categories.ListAsync(filter));
    [HttpPost("categories")] public async Task<IActionResult> CreateCategory(CategoryInput input) => StatusCode(201, await categories.SaveAsync(null, input));
    [HttpPut("categories/{id:int}")] public async Task<IActionResult> UpdateCategory(int id, CategoryInput input) => Ok(await categories.SaveAsync(id, input));
}
[ApiController, Route("api/reports"), Authorize(Roles = "Requester,Helper")]
public sealed class ReportsController(ReportService reports) : ControllerBase
{
    [HttpPost, EnableRateLimiting("reports")] public async Task<IActionResult> Create(ReportInput input) => StatusCode(201, new { id = await reports.CreateAsync(input) });
}
