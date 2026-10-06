namespace CareLink.Application.Common;
public sealed record PageDto<T>(List<T> Items, int Page, int PageSize, int TotalItems, int TotalPages);
public static class Paging
{
    public static async Task<PageDto<T>> PageAsync<T>(this IDataStore db, IQueryable<T> query, int page, int pageSize)
    {
        page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 50);
        var total = await db.CountAsync(query);
        return new PageDto<T>(await db.ListAsync(query.Skip((page - 1) * pageSize).Take(pageSize)), page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }
}
