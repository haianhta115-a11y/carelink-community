using CareLink.Application.Auth;
using CareLink.Domain;
namespace CareLink.Application.Requests;
public sealed record CreateRequestInput(string Title, string Description, int CategoryId, string Location, Urgency Urgency);
public sealed record CategoryDto(int Id, string Name, string Slug, string Icon, string GroupKey, string Description);
public sealed record RequestDto(Guid Id, string Title, string Description, int CategoryId, string CategoryName, string CategoryIcon, string Location, Urgency Urgency, RequestStatus Status, PublicUserDto Requester, DateTime CreatedAt, DateTime UpdatedAt, Guid? SessionId, PublicUserDto? Helper, bool IsHidden, string? HiddenReason);
public sealed record HistoryDto(Guid Id, RequestStatus? FromStatus, RequestStatus ToStatus, string ChangedByName, DateTime ChangedAt, string? Note);
public sealed class RequestFilter
{
    public string? Keyword { get; set; }
    public string? Location { get; set; }
    public int? CategoryId { get; set; }
    public string? Group { get; set; }
    public Urgency? Urgency { get; set; }
    public RequestStatus? Status { get; set; }
    public string Sort { get; set; } = "newest";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
