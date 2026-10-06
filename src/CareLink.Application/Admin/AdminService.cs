using CareLink.Application.Common;
using CareLink.Application.Requests;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Admin;

public sealed class AdminService(IDataStore db, ICurrentUser current, IClock clock, IAccountCache cache, IRealtimeEvents realtime, RequestService requests, IValidator<ReasonInput> reasonValidator, IValidator<ResolveInput> resolveValidator, IValidator<AdminFilter> filterValidator)
{
    private void RequireAdmin() { if (current.Role != UserRole.Admin) throw AppException.Forbidden(); }
    public async Task<DashboardDto> DashboardAsync()
    {
        RequireAdmin(); var counts = await db.ListAsync(db.Query<SupportRequest>().GroupBy(r => r.Status).Select(g => new { Status = g.Key, Count = g.Count() }));
        return new DashboardDto(await db.CountAsync(db.Query<User>()), await db.CountAsync(db.Query<User>().Where(u => u.Role == UserRole.Helper)), Enum.GetValues<RequestStatus>().ToDictionary(s => s.ToString(), s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0), await db.CountAsync(db.Query<Report>().Where(r => r.Status == ReportStatus.Pending || r.Status == ReportStatus.Reviewing)), await db.ListAsync(ReportsQuery(db.Query<Report>().OrderByDescending(r => r.CreatedAt).Take(5))));
    }
    public async Task<PageDto<AdminUserDto>> UsersAsync(AdminFilter filter)
    {
        RequireAdmin(); await filterValidator.ValidateAndThrowAsync(filter); var query = db.Query<User>();
        if (!string.IsNullOrWhiteSpace(filter.Keyword)) { var keyword = filter.Keyword.Trim(); query = query.Where(u => u.Email.Contains(keyword) || u.FullName.Contains(keyword)); }
        if (filter.Role.HasValue) query = query.Where(u => u.Role == filter.Role);
        if (!string.IsNullOrEmpty(filter.Status)) { var status = ParseStatus<UserStatus>(filter.Status); query = query.Where(u => u.Status == status); }
        return await db.PageAsync(query.OrderByDescending(u => u.CreatedAt).ThenBy(u => u.Id).Select(u => new AdminUserDto(u.Id, u.Email, u.FullName, u.Role, u.Status, u.AvatarPath == null ? null : "/api/users/" + u.Id + "/avatar", u.LockedReason, u.CreatedAt)), filter.Page, filter.PageSize);
    }
    public async Task LockAsync(Guid id, ReasonInput input, bool locked, bool deferEvents = false)
    {
        RequireAdmin(); input = input with { Reason = input.Reason.Trim() }; await reasonValidator.ValidateAndThrowAsync(input);
        var user = await db.FirstAsync(db.Query<User>().Where(u => u.Id == id)) ?? throw AppException.NotFound();
        if (id == current.Id || user.Role == UserRole.Admin) throw AppException.Forbidden();
        var status = locked ? UserStatus.Locked : UserStatus.Active;
        await db.AtomicAsync(async () =>
        {
            await db.SetAccountStatusAsync(id, status, input.Reason, clock.UtcNow); Audit(locked ? "USER_LOCKED" : "USER_UNLOCKED", "User", id, user.Status.ToString(), status.ToString(), input.Reason); await db.SaveAsync(); return true;
        });
        if (!deferEvents) { cache.Invalidate(id); await realtime.ForceLogoutAsync(id); }
    }
    public async Task HideAsync(Guid id, ReasonInput input, bool hidden, bool deferEvents = false)
    {
        RequireAdmin(); input = input with { Reason = input.Reason.Trim() }; await reasonValidator.ValidateAndThrowAsync(input);
        var request = await requests.AuthorizeAsync(id);
        await db.AtomicAsync(async () =>
        {
            var old = request.IsHidden; request.IsHidden = hidden; request.HiddenReason = hidden ? input.Reason : null; request.UpdatedAt = clock.UtcNow;
            db.Update(request); Audit(hidden ? "REQUEST_HIDDEN" : "REQUEST_UNHIDDEN", "SupportRequest", id, old.ToString(), hidden.ToString(), input.Reason); await db.SaveAsync(); return true;
        });
        if (!deferEvents) await NotifyModerationAsync(request);
    }
    public async Task<PageDto<ReportDto>> ReportsAsync(AdminFilter filter)
    {
        RequireAdmin(); await filterValidator.ValidateAndThrowAsync(filter); var query = db.Query<Report>();
        if (!string.IsNullOrEmpty(filter.Status)) { var status = ParseStatus<ReportStatus>(filter.Status); query = query.Where(r => r.Status == status); }
        if (!string.IsNullOrWhiteSpace(filter.Keyword)) { var keyword = filter.Keyword.Trim(); query = query.Where(r => r.Description.Contains(keyword) || (r.TargetType == ReportTarget.Request && r.TargetRequest!.Title.Contains(keyword)) || (r.TargetType == ReportTarget.User && r.TargetUser!.FullName.Contains(keyword))); }
        return await db.PageAsync(ReportsQuery(query.OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id)), filter.Page, filter.PageSize);
    }
    public async Task<ReportDto> ReportAsync(Guid id) { RequireAdmin(); return await db.FirstAsync(ReportsQuery(db.Query<Report>().Where(r => r.Id == id))) ?? throw AppException.NotFound(); }
    public async Task<ReportDto> ResolveAsync(Guid id, ResolveInput input)
    {
        RequireAdmin(); input = input with { AdminNote = input.AdminNote.Trim() }; await resolveValidator.ValidateAndThrowAsync(input); var report = await ReportAsync(id);
        var valid = report.Status == ReportStatus.Pending && input.Status == ReportStatus.Reviewing || report.Status == ReportStatus.Reviewing && input.Status is ReportStatus.Resolved or ReportStatus.Rejected;
        if (!valid) throw AppException.Conflict("INVALID_TRANSITION", "Báo cáo cần được xem xét trước khi giải quyết hoặc từ chối.");
        Guid? lockedId = null;
        await db.AtomicAsync(async () =>
        {
            if (!await db.TryResolveReportAsync(id, report.Status, input.Status, input.AdminNote, current.Id, clock.UtcNow)) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Báo cáo vừa được người khác xử lý.");
            if (input.Action == "HideRequest") { if (!report.TargetRequestId.HasValue) throw new AppException(400, "VALIDATION_ERROR", "Báo cáo không nhắm đến yêu cầu."); await HideAsync(report.TargetRequestId.Value, new ReasonInput(input.AdminNote), true, true); }
            if (input.Action == "LockUser")
            {
                lockedId = report.TargetUserId;
                if (!lockedId.HasValue && report.TargetRequestId.HasValue) lockedId = (await db.FirstAsync(db.Query<SupportRequest>().Where(r => r.Id == report.TargetRequestId.Value)))?.RequesterId;
                if (!lockedId.HasValue) throw AppException.NotFound(); await LockAsync(lockedId.Value, new ReasonInput(input.AdminNote), true, true);
            }
            Audit(input.Status == ReportStatus.Resolved ? "REPORT_RESOLVED" : input.Status == ReportStatus.Rejected ? "REPORT_REJECTED" : "REPORT_REVIEWING", "Report", id, report.Status.ToString(), input.Status.ToString(), input.AdminNote); await db.SaveAsync(); return true;
        });
        if (lockedId.HasValue) { cache.Invalidate(lockedId.Value); await realtime.ForceLogoutAsync(lockedId.Value); }
        if (input.Action == "HideRequest") await NotifyModerationAsync(await requests.AuthorizeAsync(report.TargetRequestId!.Value));
        return await ReportAsync(id);
    }
    private async Task NotifyModerationAsync(SupportRequest request)
    {
        await realtime.PublishAsync(request.RequesterId, "RequestStatusChanged", new { requestId = request.Id, status = request.Status });
        var session = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.RequestId == request.Id));
        if (session is not null) await realtime.PublishAsync(session.HelperId, "RequestStatusChanged", new { requestId = request.Id, status = request.Status });
    }
    public async Task<PageDto<AuditDto>> AuditAsync(AdminFilter filter)
    {
        RequireAdmin(); await filterValidator.ValidateAndThrowAsync(filter); var query = db.Query<AuditLog>();
        if (!string.IsNullOrEmpty(filter.Action)) query = query.Where(a => a.Action == filter.Action);
        if (filter.From.HasValue) query = query.Where(a => a.CreatedAt >= filter.From.Value);
        if (filter.To.HasValue) query = query.Where(a => a.CreatedAt <= filter.To.Value);
        return await db.PageAsync(query.OrderByDescending(a => a.CreatedAt).ThenBy(a => a.Id).Select(a => new AuditDto(a.Id, a.Actor.FullName, a.Action, a.EntityType, a.EntityId, a.OldValue, a.NewValue, a.Reason, a.CreatedAt)), filter.Page, filter.PageSize);
    }
    private static IQueryable<ReportDto> ReportsQuery(IQueryable<Report> query) => query.Select(r => new ReportDto(r.Id, r.ReporterId, r.Reporter.FullName, r.TargetType, r.TargetRequestId, r.TargetUserId, r.TargetType == ReportTarget.Request ? r.TargetRequest!.Title : r.TargetUser!.FullName, r.Reason, r.Description, r.Status, r.AdminNote, r.HandledBy == null ? null : r.HandledBy.FullName, r.HandledAt, r.CreatedAt));
    private void Audit(string action, string entity, Guid id, string? old, string? value, string reason) => db.Add(new AuditLog { ActorId = current.Id, Action = action, EntityType = entity, EntityId = id.ToString(), OldValue = old, NewValue = value, Reason = reason, CreatedAt = clock.UtcNow });
    private static T ParseStatus<T>(string value) where T : struct, Enum => Enum.TryParse<T>(value, true, out var status) && Enum.IsDefined(status) ? status : throw new AppException(400, "VALIDATION_ERROR", "Trạng thái lọc không hợp lệ.");
}
