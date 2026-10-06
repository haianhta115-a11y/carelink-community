using CareLink.Application.Auth;
using CareLink.Application.Common;
using CareLink.Application.Requests;
using CareLink.Domain;
namespace CareLink.Application.Chat;

public sealed class SessionService(IDataStore db, ICurrentUser current, RequestService requests, ProfileService profiles)
{
    public async Task<SessionAccess> AuthorizeAsync(Guid id)
    {
        if (current.Role == UserRole.Admin) throw AppException.Forbidden();
        var session = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.Id == id).Select(s => new SessionAccess(s.Id, s.RequestId, s.Request.RequesterId, s.HelperId, s.Status, s.Request.IsHidden))) ?? throw AppException.NotFound();
        if (session.RequesterId != current.Id && session.HelperId != current.Id) throw AppException.Forbidden();
        if (session.IsHidden) throw AppException.NotFound();
        return session;
    }
    public async Task<PageDto<SessionSummaryDto>> ListAsync(int page = 1, int pageSize = 12)
    {
        if (current.Role == UserRole.Admin) throw AppException.Forbidden();
        var id = current.Id; var messages = db.Query<ChatMessage>();
        var query = db.Query<SupportSession>().Where(s => !s.Request.IsHidden && (s.HelperId == id || s.Request.RequesterId == id)).OrderByDescending(s => messages.Where(m => m.SessionId == s.Id).OrderByDescending(m => m.Id).Select(m => (DateTime?)m.SentAt).FirstOrDefault() ?? s.CreatedAt).ThenBy(s => s.Id);
        var projected = query.Select(s => new SessionSummaryDto(s.Id, s.RequestId, s.Request.Title, s.Request.Status, s.Status,
            s.HelperId == id ? new PublicUserDto(s.Request.RequesterId, s.Request.Requester.FullName, UserRole.Requester, s.Request.Requester.AvatarPath == null ? null : "/api/users/" + s.Request.RequesterId + "/avatar", null, 0) : new PublicUserDto(s.HelperId, s.Helper.FullName, UserRole.Helper, s.Helper.AvatarPath == null ? null : "/api/users/" + s.HelperId + "/avatar", null, 0),
            messages.Where(m => m.SessionId == s.Id).OrderByDescending(m => m.Id).Select(m => m.Content ?? "Ảnh đính kèm").FirstOrDefault(),
            messages.Where(m => m.SessionId == s.Id).OrderByDescending(m => m.Id).Select(m => (DateTime?)m.SentAt).FirstOrDefault(),
            messages.Count(m => m.SessionId == s.Id && m.SenderId != id && m.ReadAt == null), s.CreatedAt));
        return await db.PageAsync(projected, page, pageSize);
    }
    public async Task<int> UnreadAsync()
    {
        if (current.Role == UserRole.Admin) return 0;
        var id = current.Id;
        return await db.CountAsync(db.Query<ChatMessage>().Where(m => m.SenderId != id && m.ReadAt == null && !m.Session.Request.IsHidden && (m.Session.HelperId == id || m.Session.Request.RequesterId == id)));
    }
    public async Task<SessionDto> GetAsync(Guid id)
    {
        var session = await AuthorizeAsync(id); var counterpartId = session.RequesterId == current.Id ? session.HelperId : session.RequesterId;
        var counterpart = await profiles.PublicAsync(counterpartId);
        var contacts = session.Status == SessionStatus.Active ? await db.FirstAsync(db.Query<User>().Where(u => u.Id == counterpartId).Select(u => new { u.Phone, u.Address })) : null;
        var created = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.Id == id));
        return new SessionDto(id, session.Status, await requests.GetAsync(session.RequestId), counterpart, contacts?.Phone, contacts?.Address, created!.CreatedAt);
    }
}
