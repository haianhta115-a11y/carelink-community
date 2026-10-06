using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Admin;
public sealed record CategoryInput(string Name, string Slug, string Icon, string GroupKey, string Description, int SortOrder, bool IsActive);
public sealed record AdminCategoryDto(int Id, string Name, string Slug, string Icon, string GroupKey, string Description, int SortOrder, bool IsActive);
public sealed class CategoryValidator : AbstractValidator<CategoryInput>
{
    public static readonly string[] Groups = ["health", "education", "daily", "care", "transport", "inclusion", "emergency", "environment"];
    public CategoryValidator()
    {
        RuleFor(x => x.Name).Length(2, 80).WithMessage("Tên lĩnh vực cần từ 2 đến 80 ký tự.");
        RuleFor(x => x.Slug).Length(2, 80).Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$").WithMessage("Mã lĩnh vực dùng chữ thường, số và dấu gạch nối.");
        RuleFor(x => x.Icon).Length(2, 40).Matches("^[A-Za-z]+[0-9]?$").WithMessage("Tên biểu tượng chưa hợp lệ.");
        RuleFor(x => x.GroupKey).Must(Groups.Contains).WithMessage("Vui lòng chọn một nhóm lĩnh vực hợp lệ.");
        RuleFor(x => x.Description).Length(10, 200).WithMessage("Mô tả lĩnh vực cần từ 10 đến 200 ký tự."); RuleFor(x => x.SortOrder).InclusiveBetween(0, 10000);
    }
}
public sealed class CategoryService(IDataStore db, ICurrentUser current, IClock clock, IValidator<CategoryInput> validator, IValidator<AdminFilter> filterValidator)
{
    private void RequireAdmin() { if (current.Role != UserRole.Admin) throw AppException.Forbidden(); }
    public async Task<PageDto<AdminCategoryDto>> ListAsync(AdminFilter filter)
    {
        RequireAdmin(); await filterValidator.ValidateAndThrowAsync(filter); var query = db.Query<Category>();
        if (!string.IsNullOrWhiteSpace(filter.Keyword)) query = query.Where(c => c.Name.Contains(filter.Keyword) || c.Description.Contains(filter.Keyword));
        if (!string.IsNullOrWhiteSpace(filter.Group)) query = query.Where(c => c.GroupKey == filter.Group);
        return await db.PageAsync(Project(query.OrderBy(c => c.SortOrder).ThenBy(c => c.Id)), filter.Page, filter.PageSize);
    }
    public async Task<AdminCategoryDto> SaveAsync(int? id, CategoryInput input)
    {
        RequireAdmin(); input = input with { Name = input.Name.Trim(), Slug = input.Slug.Trim().ToLowerInvariant(), Description = input.Description.Trim() }; await validator.ValidateAndThrowAsync(input);
        if (await db.AnyAsync(db.Query<Category>().Where(c => c.Slug == input.Slug && c.Id != id))) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Mã lĩnh vực này đã được sử dụng.");
        var category = id.HasValue ? await db.FirstAsync(db.Query<Category>().Where(c => c.Id == id)) ?? throw AppException.NotFound() : new Category { Id = await db.FirstAsync(db.Query<Category>().OrderByDescending(c => c.Id).Select(c => c.Id)) + 1 };
        category.Name = input.Name; category.Slug = input.Slug; category.Icon = input.Icon; category.GroupKey = input.GroupKey; category.Description = input.Description; category.SortOrder = input.SortOrder; category.IsActive = input.IsActive;
        if (id.HasValue) db.Update(category); else db.Add(category);
        db.Add(new AuditLog { ActorId = current.Id, Action = id.HasValue ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", EntityType = "Category", EntityId = category.Id.ToString(), NewValue = category.Name, Reason = "Cập nhật lĩnh vực và trạng thái hoạt động.", CreatedAt = clock.UtcNow });
        await db.SaveAsync(); return (await db.FirstAsync(Project(db.Query<Category>().Where(c => c.Id == category.Id))))!;
    }
    private static IQueryable<AdminCategoryDto> Project(IQueryable<Category> query) => query.Select(c => new AdminCategoryDto(c.Id, c.Name, c.Slug, c.Icon, c.GroupKey, c.Description, c.SortOrder, c.IsActive));
}
