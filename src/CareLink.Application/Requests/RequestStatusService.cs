using CareLink.Application.Common;
using CareLink.Domain;
using CareLink.Application.Admin;
using FluentValidation;
namespace CareLink.Application.Requests;
public sealed record StatusChangeDto(Guid RequestId, Guid SessionId, RequestStatus Status);
public sealed record AcceptedDto(Guid SessionId, Guid RequestId);

public sealed class RequestStatusService(IDataStore db, ICurrentUser current, IClock clock, IRealtimeEvents realtime, RequestService requests)
{
    public async Task<AcceptedDto> AcceptAsync(Guid id)
    {
        if (current.Role != UserRole.Helper) throw AppException.Forbidden();
        var request = await db.FirstAsync(db.Query<SupportRequest>().Where(r => r.Id == id && !r.IsHidden)) ?? throw AppException.NotFound();
        var session = await db.AtomicAsync(async () =>
        {
            var now = clock.UtcNow;
            if (!await db.TryTransitionAsync(id, RequestStatus.Open, RequestStatus.Accepted, now)) throw AppException.Conflict("REQUEST_NOT_OPEN", "Yêu cầu đã có người nhận hoặc không còn mở.");
            var created = new SupportSession { RequestId = id, HelperId = current.Id, CreatedAt = now };
            db.Add(created); AddHistory(id, RequestStatus.Open, RequestStatus.Accepted, now); await db.SaveAsync(); return created;
        });
        await NotifyAsync(request.RequesterId, session, RequestStatus.Accepted); return new AcceptedDto(session.Id, id);
    }
    public async Task<RequestDto> StartAsync(Guid id)
    {
        if (current.Role != UserRole.Helper) throw AppException.Forbidden();
        var request = await requests.AuthorizeAsync(id, true);
        var session = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.RequestId == id && s.HelperId == current.Id)) ?? throw AppException.Forbidden();
        if (request.Status != RequestStatus.Accepted) throw AppException.Conflict("INVALID_TRANSITION", "Chỉ có thể bắt đầu khi yêu cầu đã được nhận.");
        await db.AtomicAsync(async () =>
        {
            var now = clock.UtcNow;
            if (!await db.TryTransitionAsync(id, RequestStatus.Accepted, RequestStatus.InProgress, now)) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Trạng thái vừa được thay đổi.");
            session.StartedAt = now; db.Update(session); AddHistory(id, RequestStatus.Accepted, RequestStatus.InProgress, now); await db.SaveAsync(); return true;
        });
        await NotifyAsync(request.RequesterId, session, RequestStatus.InProgress); return await requests.GetAsync(id);
    }
    public async Task<RequestDto> CompleteAsync(Guid id)
    {
        if (current.Role != UserRole.Requester) throw AppException.Forbidden();
        var request = await requests.AuthorizeAsync(id, true);
        if (request.RequesterId != current.Id) throw AppException.Forbidden();
        if (request.Status == RequestStatus.Completed) return await requests.GetAsync(id);
        if (request.Status != RequestStatus.InProgress) throw AppException.Conflict("INVALID_TRANSITION", "Chỉ xác nhận hoàn thành khi đang hỗ trợ.");
        var session = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.RequestId == id)) ?? throw AppException.NotFound();
        var changed = await db.AtomicAsync(async () =>
        {
            var now = clock.UtcNow;
            if (!await db.TryTransitionAsync(id, RequestStatus.InProgress, RequestStatus.Completed, now))
            {
                var latest = await db.FirstAsync(db.Query<SupportRequest>().Where(r => r.Id == id));
                if (latest?.Status == RequestStatus.Completed) return false;
                throw AppException.Conflict("CONCURRENCY_CONFLICT", "Trạng thái vừa được thay đổi.");
            }
            session.Status = SessionStatus.Closed; session.CompletedAt = now; db.Update(session);
            AddHistory(id, RequestStatus.InProgress, RequestStatus.Completed, now); await db.SaveAsync(); return true;
        });
        if (changed) await NotifyAsync(request.RequesterId, session, RequestStatus.Completed);
        return await requests.GetAsync(id);
    }
    public async Task<RequestDto> ForceCompleteAsync(Guid id, ReasonInput input)
    {
        if (current.Role != UserRole.Admin) throw AppException.Forbidden(); input = input with { Reason = input.Reason.Trim() }; await new ReasonValidator().ValidateAndThrowAsync(input);
        var request = await requests.AuthorizeAsync(id); if (request.Status is not (RequestStatus.Accepted or RequestStatus.InProgress)) throw AppException.Conflict("INVALID_TRANSITION", "Chỉ có thể can thiệp yêu cầu đã nhận hoặc đang hỗ trợ.");
        var session = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.RequestId == id)) ?? throw AppException.NotFound();
        await db.AtomicAsync(async () =>
        {
            var now = clock.UtcNow; if (!await db.TryTransitionAsync(id, request.Status, RequestStatus.Completed, now, true)) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Trạng thái vừa được cập nhật.");
            session.Status = SessionStatus.Closed; session.CompletedAt = now; db.Update(session); AddHistory(id, request.Status, RequestStatus.Completed, now, input.Reason, "ADMIN_FORCE_STATUS"); await db.SaveAsync(); return true;
        });
        await NotifyAsync(request.RequesterId, session, RequestStatus.Completed); return await requests.GetAsync(id);
    }
    private void AddHistory(Guid id, RequestStatus from, RequestStatus to, DateTime now, string? reason = null, string action = "REQUEST_STATUS_CHANGED")
    {
        db.Add(new RequestStatusHistory { RequestId = id, FromStatus = from, ToStatus = to, ChangedById = current.Id, ChangedAt = now, Note = reason });
        db.Add(new AuditLog { ActorId = current.Id, Action = action, EntityType = "SupportRequest", EntityId = id.ToString(), OldValue = from.ToString(), NewValue = to.ToString(), Reason = reason ?? "Chuyển trạng thái theo quy trình hỗ trợ.", CreatedAt = now });
    }
    private async Task NotifyAsync(Guid requesterId, SupportSession session, RequestStatus status)
    {
        var change = new StatusChangeDto(session.RequestId, session.Id, status);
        await realtime.PublishAsync(requesterId, "RequestStatusChanged", change); await realtime.PublishAsync(session.HelperId, "RequestStatusChanged", change);
    }
}
