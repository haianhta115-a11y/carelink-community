using CareLink.Application.Common;
using CareLink.Domain;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace CareLink.Infrastructure.Data;

public sealed class SqlDataStore(CareLinkDbContext db) : IDataStore
{
    public IQueryable<T> Query<T>() where T : class => db.Set<T>().AsNoTracking();
    public Task<List<T>> ListAsync<T>(IQueryable<T> query) => query.ToListAsync();
    public Task<T?> FirstAsync<T>(IQueryable<T> query) => query.FirstOrDefaultAsync();
    public Task<int> CountAsync<T>(IQueryable<T> query) => query.CountAsync();
    public Task<bool> AnyAsync<T>(IQueryable<T> query) => query.AnyAsync();
    public void Add<T>(T entity) where T : class => db.Add(entity);
    public void Update<T>(T entity) where T : class => db.Update(entity);
    public async Task SaveAsync()
    {
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw AppException.Conflict("CONCURRENCY_CONFLICT", "Thông tin vừa được cập nhật."); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw AppException.Conflict("CONCURRENCY_CONFLICT", "Dữ liệu đã tồn tại hoặc vừa được cập nhật.");
        }
        db.ChangeTracker.Clear();
    }
    public async Task<T> AtomicAsync<T>(Func<Task<T>> operation)
    {
        if (db.Database.CurrentTransaction is not null) return await operation();
        await using var transaction = await db.Database.BeginTransactionAsync();
        try { var result = await operation(); await transaction.CommitAsync(); return result; }
        catch { await transaction.RollbackAsync(); db.ChangeTracker.Clear(); throw; }
    }
    public async Task<bool> TryTransitionAsync(Guid requestId, RequestStatus from, RequestStatus to, DateTime now, bool includeHidden = false)
    {
        var query = db.Set<SupportRequest>().Where(x => x.Id == requestId && x.Status == from && (!x.IsHidden || includeHidden));
        var affected = to switch
        {
            RequestStatus.Accepted => await query.ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, to).SetProperty(x => x.AcceptedAt, now).SetProperty(x => x.UpdatedAt, now)),
            RequestStatus.InProgress => await query.ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, to).SetProperty(x => x.StartedAt, now).SetProperty(x => x.UpdatedAt, now)),
            RequestStatus.Completed => await query.ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, to).SetProperty(x => x.CompletedAt, now).SetProperty(x => x.UpdatedAt, now)),
            _ => 0
        };
        return affected == 1;
    }
    public Task<int> MarkReadAsync(Guid sessionId, Guid readerId, DateTime now) => db.Set<ChatMessage>().Where(m => m.SessionId == sessionId && m.SenderId != readerId && m.ReadAt == null).ExecuteUpdateAsync(s => s.SetProperty(m => m.ReadAt, now));
    public async Task<bool> LockActiveSessionAsync(Guid sessionId) => (await db.Database.SqlQuery<int>($"SELECT CASE WHEN [Status] = 'Active' THEN 1 ELSE 0 END AS [Value] FROM [SupportSessions] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {sessionId}").SingleOrDefaultAsync()) == 1;
    public async Task UpdateProfileAsync(Guid id, string name, string? phone, string? address, DateTime now) => await db.Set<User>().Where(u => u.Id == id && u.Status == UserStatus.Active).ExecuteUpdateAsync(s => s.SetProperty(u => u.FullName, name).SetProperty(u => u.Phone, phone).SetProperty(u => u.Address, address).SetProperty(u => u.UpdatedAt, now));
    public async Task SetAvatarAsync(Guid id, string path, DateTime now) => await db.Set<User>().Where(u => u.Id == id && u.Status == UserStatus.Active).ExecuteUpdateAsync(s => s.SetProperty(u => u.AvatarPath, path).SetProperty(u => u.UpdatedAt, now));
    public async Task<bool> ChangePasswordAsync(Guid id, int version, string expectedHash, string hash, DateTime now) => await db.Set<User>().Where(u => u.Id == id && u.Status == UserStatus.Active && u.TokenVersion == version && u.PasswordHash == expectedHash).ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, hash).SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1).SetProperty(u => u.UpdatedAt, now)) == 1;
    public async Task SetAccountStatusAsync(Guid id, UserStatus status, string reason, DateTime now) => await db.Set<User>().Where(u => u.Id == id && u.Role != UserRole.Admin).ExecuteUpdateAsync(s => s.SetProperty(u => u.Status, status).SetProperty(u => u.LockedReason, status == UserStatus.Locked ? reason : null).SetProperty(u => u.LockedAt, status == UserStatus.Locked ? now : (DateTime?)null).SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1).SetProperty(u => u.UpdatedAt, now));
    public async Task<bool> TryResolveReportAsync(Guid id, ReportStatus expected, ReportStatus status, string note, Guid adminId, DateTime now) => await db.Set<Report>().Where(r => r.Id == id && r.Status == expected).ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, status).SetProperty(r => r.AdminNote, note).SetProperty(r => r.HandledById, adminId).SetProperty(r => r.HandledAt, now)) == 1;
}
