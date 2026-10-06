using CareLink.Application.Common;
using CareLink.Domain;
namespace CareLink.Application.Requests;
public sealed record PublicStatsDto(int CompletedRequests, int Helpers, int OpenRequests, int Categories);
public sealed record PersonalSummaryDto(int Total, int Open, int Accepted, int InProgress, int Completed, int UnreadMessages);
public sealed class CommunityService(IDataStore db, ICurrentUser current)
{
    public async Task<PublicStatsDto> StatsAsync() => new(await db.CountAsync(db.Query<SupportRequest>().Where(r => r.Status == RequestStatus.Completed && !r.IsHidden)), await db.CountAsync(db.Query<User>().Where(u => u.Role == UserRole.Helper && u.Status == UserStatus.Active)), await db.CountAsync(db.Query<SupportRequest>().Where(r => r.Status == RequestStatus.Open && !r.IsHidden)), await db.CountAsync(db.Query<Category>().Where(c => c.IsActive)));
    public async Task<PersonalSummaryDto> SummaryAsync()
    {
        if (current.Role == UserRole.Admin) throw AppException.Forbidden(); var id = current.Id; var sessions = db.Query<SupportSession>();
        var query = db.Query<SupportRequest>().Where(r => !r.IsHidden && (current.Role == UserRole.Requester ? r.RequesterId == id : sessions.Any(s => s.RequestId == r.Id && s.HelperId == id)));
        var counts = await db.ListAsync(query.GroupBy(r => r.Status).Select(g => new { Status = g.Key, Count = g.Count() }));
        int Count(RequestStatus status) => counts.FirstOrDefault(c => c.Status == status)?.Count ?? 0;
        var unread = await db.CountAsync(db.Query<ChatMessage>().Where(m => !m.Session.Request.IsHidden && m.SenderId != id && m.ReadAt == null && (m.Session.HelperId == id || m.Session.Request.RequesterId == id)));
        return new PersonalSummaryDto(counts.Sum(c => c.Count), Count(RequestStatus.Open), Count(RequestStatus.Accepted), Count(RequestStatus.InProgress), Count(RequestStatus.Completed), unread);
    }
}
