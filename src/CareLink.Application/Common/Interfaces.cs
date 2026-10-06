using CareLink.Domain;
namespace CareLink.Application.Common;

public interface IClock { DateTime UtcNow { get; } }
public interface IDataStore
{
    IQueryable<T> Query<T>() where T : class;
    Task<List<T>> ListAsync<T>(IQueryable<T> query);
    Task<T?> FirstAsync<T>(IQueryable<T> query);
    Task<int> CountAsync<T>(IQueryable<T> query);
    Task<bool> AnyAsync<T>(IQueryable<T> query);
    void Add<T>(T entity) where T : class;
    void Update<T>(T entity) where T : class;
    Task SaveAsync();
    Task<T> AtomicAsync<T>(Func<Task<T>> operation);
    Task<bool> TryTransitionAsync(Guid requestId, RequestStatus from, RequestStatus to, DateTime now, bool includeHidden = false);
    Task<int> MarkReadAsync(Guid sessionId, Guid readerId, DateTime now);
    Task<bool> LockActiveSessionAsync(Guid sessionId);
    Task UpdateProfileAsync(Guid id, string name, string? phone, string? address, DateTime now);
    Task SetAvatarAsync(Guid id, string path, DateTime now);
    Task<bool> ChangePasswordAsync(Guid id, int version, string expectedHash, string hash, DateTime now);
    Task SetAccountStatusAsync(Guid id, UserStatus status, string reason, DateTime now);
    Task<bool> TryResolveReportAsync(Guid id, ReportStatus expected, ReportStatus status, string note, Guid adminId, DateTime now);
}
public interface IPasswordHasher { string Hash(string password); bool Verify(string password, string hash); }
public interface IFileStorage
{
    Task<StoredFile> SaveImageAsync(Stream stream, long length, int maxBytes, string folder);
    Task<Stream> OpenAsync(string path);
    void Delete(string path);
}
public sealed record StoredFile(string Path, string ContentType);
public interface ICurrentUser { Guid Id { get; } UserRole Role { get; } }
public interface IAccountCache { void Invalidate(Guid id); }
public interface IRealtimeEvents
{
    Task PublishAsync(Guid userId, string eventName, object payload);
    Task ForceLogoutAsync(Guid userId);
    Task RevokeConnectionsAsync(Guid userId);
}
