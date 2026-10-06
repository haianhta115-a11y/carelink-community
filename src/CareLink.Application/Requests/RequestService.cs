using CareLink.Application.Auth;
using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Requests;

public sealed class RequestService(IDataStore db, ICurrentUser current, IClock clock, IValidator<CreateRequestInput> createValidator, IValidator<RequestFilter> filterValidator)
{
    public Task<List<CategoryDto>> CategoriesAsync() => db.ListAsync(db.Query<Category>().Where(c => c.IsActive).OrderBy(c => c.SortOrder).Select(c => new CategoryDto(c.Id, c.Name, c.Slug, c.Icon, c.GroupKey, c.Description)));
    public async Task<RequestDto> CreateAsync(CreateRequestInput input)
    {
        if (current.Role != UserRole.Requester) throw AppException.Forbidden();
        input = input with { Title = input.Title.Trim(), Description = input.Description.Trim(), Location = input.Location.Trim() };
        await createValidator.ValidateAndThrowAsync(input);
        if (!await db.AnyAsync(db.Query<Category>().Where(c => c.Id == input.CategoryId && c.IsActive))) throw new AppException(400, "VALIDATION_ERROR", "Danh mục không hợp lệ.");
        var request = new SupportRequest { Title = input.Title, Description = input.Description, Location = input.Location, CategoryId = input.CategoryId, Urgency = input.Urgency, RequesterId = current.Id, CreatedAt = clock.UtcNow, UpdatedAt = clock.UtcNow };
        await db.AtomicAsync(async () =>
        {
            db.Add(request); db.Add(new RequestStatusHistory { RequestId = request.Id, ToStatus = RequestStatus.Open, ChangedById = current.Id, ChangedAt = clock.UtcNow, Note = "Yêu cầu được tạo." });
            await db.SaveAsync(); return true;
        });
        return await GetAsync(request.Id);
    }
    public async Task<PageDto<RequestDto>> ListAsync(RequestFilter filter, bool mine = false)
    {
        await filterValidator.ValidateAndThrowAsync(filter); var userId = current.Id;
        var sessions = db.Query<SupportSession>(); var query = db.Query<SupportRequest>();
        if (current.Role != UserRole.Admin) query = query.Where(r => !r.IsHidden && (r.Status == RequestStatus.Open || r.RequesterId == userId || sessions.Any(s => s.RequestId == r.Id && s.HelperId == userId)));
        if (mine)
        {
            if (current.Role == UserRole.Admin) throw AppException.Forbidden();
            query = current.Role == UserRole.Requester ? query.Where(r => r.RequesterId == userId) : query.Where(r => sessions.Any(s => s.RequestId == r.Id && s.HelperId == userId));
        }
        var status = filter.Status ?? (!mine && current.Role == UserRole.Helper ? RequestStatus.Open : (RequestStatus?)null);
        if (status.HasValue) query = query.Where(r => r.Status == status.Value);
        if (filter.CategoryId.HasValue) query = query.Where(r => r.CategoryId == filter.CategoryId.Value);
        if (!string.IsNullOrWhiteSpace(filter.Group)) query = query.Where(r => r.Category.GroupKey == filter.Group);
        if (filter.Urgency.HasValue) query = query.Where(r => r.Urgency == filter.Urgency.Value);
        if (!string.IsNullOrWhiteSpace(filter.Keyword)) { var keyword = filter.Keyword.Trim(); query = query.Where(r => r.Title.Contains(keyword) || r.Description.Contains(keyword)); }
        if (!string.IsNullOrWhiteSpace(filter.Location)) { var location = filter.Location.Trim(); query = query.Where(r => r.Location.Contains(location)); }
        query = filter.Sort == "urgency" ? query.OrderByDescending(r => r.Urgency == Urgency.Critical ? 3 : r.Urgency == Urgency.High ? 2 : r.Urgency == Urgency.Normal ? 1 : 0).ThenByDescending(r => r.CreatedAt).ThenBy(r => r.Id) : query.OrderByDescending(r => r.CreatedAt).ThenBy(r => r.Id);
        return await db.PageAsync(Project(query), filter.Page, filter.PageSize);
    }
    public async Task<SupportRequest> AuthorizeAsync(Guid id, bool membersOnly = false)
    {
        var request = await db.FirstAsync(db.Query<SupportRequest>().Where(r => r.Id == id)) ?? throw AppException.NotFound();
        if (current.Role == UserRole.Admin) return request;
        if (request.IsHidden) throw AppException.NotFound();
        if (request.RequesterId == current.Id) return request;
        if (!membersOnly && request.Status == RequestStatus.Open) return request;
        if (await db.AnyAsync(db.Query<SupportSession>().Where(s => s.RequestId == id && s.HelperId == current.Id))) return request;
        throw AppException.Forbidden();
    }
    public async Task<RequestDto> GetAsync(Guid id)
    {
        await AuthorizeAsync(id); var dto = (await db.FirstAsync(Project(db.Query<SupportRequest>().Where(r => r.Id == id))))!;
        if (dto.SessionId.HasValue)
        {
            var helper = await db.FirstAsync(db.Query<SupportSession>().Where(s => s.Id == dto.SessionId).Select(s => new PublicUserDto(s.Helper.Id, s.Helper.FullName, s.Helper.Role, s.Helper.AvatarPath == null ? null : "/api/users/" + s.Helper.Id + "/avatar", null, 0)));
            dto = dto with { Helper = helper };
        }
        return dto;
    }
    public async Task<List<HistoryDto>> HistoryAsync(Guid id)
    {
        await AuthorizeAsync(id, true);
        return await db.ListAsync(db.Query<RequestStatusHistory>().Where(h => h.RequestId == id).OrderBy(h => h.ChangedAt).Select(h => new HistoryDto(h.Id, h.FromStatus, h.ToStatus, h.ChangedBy.FullName, h.ChangedAt, h.Note)));
    }
    private IQueryable<RequestDto> Project(IQueryable<SupportRequest> query)
    {
        var sessions = db.Query<SupportSession>();
        return query.Select(r => new RequestDto(r.Id, r.Title, r.Description, r.CategoryId, r.Category.Name, r.Category.Icon, r.Location, r.Urgency, r.Status,
            new PublicUserDto(r.RequesterId, r.Requester.FullName, r.Requester.Role, r.Requester.AvatarPath == null ? null : "/api/users/" + r.RequesterId + "/avatar", null, 0),
            r.CreatedAt, r.UpdatedAt, sessions.Where(s => s.RequestId == r.Id).Select(s => (Guid?)s.Id).FirstOrDefault(), null, r.IsHidden, current.Role == UserRole.Admin ? r.HiddenReason : null));
    }
}
