using CareLink.Application.Common;
using CareLink.Domain;
using CareLink.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
namespace CareLink.Infrastructure.Auth;

public sealed record AccountState(UserStatus Status, int Version);
public sealed class AccountCache(IMemoryCache cache) : IAccountCache
{
    private readonly ConcurrentDictionary<Guid, long> epochs = new();
    public void Invalidate(Guid id) { var old = epochs.GetOrAdd(id, 0); epochs.AddOrUpdate(id, 1, (_, version) => version + 1); cache.Remove($"account:{id}:{old}"); }
    public async Task<bool> ValidateAsync(CareLinkDbContext db, Guid id, int version)
    {
        var epoch = epochs.GetOrAdd(id, 0);
        var state = await cache.GetOrCreateAsync($"account:{id}:{epoch}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(15);
            return await db.Set<User>().AsNoTracking().Where(u => u.Id == id).Select(u => new AccountState(u.Status, u.TokenVersion)).FirstOrDefaultAsync();
        });
        return epochs.GetOrAdd(id, 0) == epoch && state is { Status: UserStatus.Active } && state.Version == version;
    }
}
