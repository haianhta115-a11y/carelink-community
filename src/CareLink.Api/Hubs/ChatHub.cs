using System.Collections.Concurrent;
using CareLink.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
namespace CareLink.Api.Hubs;

[Authorize]
public sealed class ChatHub(ConnectionRegistry connections) : Hub
{
    public override Task OnConnectedAsync()
    {
        if (Guid.TryParse(Context.UserIdentifier, out var id)) connections.Add(Context.ConnectionId, id, Context.Abort);
        return base.OnConnectedAsync();
    }
    public override Task OnDisconnectedAsync(Exception? exception) { connections.Remove(Context.ConnectionId); return base.OnDisconnectedAsync(exception); }
}
public sealed class SubjectUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection) => connection.User?.FindFirst("sub")?.Value;
}
public sealed class ConnectionRegistry
{
    private readonly ConcurrentDictionary<string, (Guid UserId, Action Abort)> connections = new();
    public void Add(string connectionId, Guid userId, Action abort) => connections[connectionId] = (userId, abort);
    public void Remove(string connectionId) => connections.TryRemove(connectionId, out _);
    public void AbortUser(Guid userId) { foreach (var connection in connections.Where(p => p.Value.UserId == userId)) { connection.Value.Abort(); connections.TryRemove(connection.Key, out _); } }
}
public sealed class RealtimeEvents(IHubContext<ChatHub> hub, ConnectionRegistry connections, ILogger<RealtimeEvents> logger) : IRealtimeEvents
{
    public async Task PublishAsync(Guid userId, string eventName, object payload)
    {
        try { await hub.Clients.User(userId.ToString()).SendAsync(eventName, payload); }
        catch (Exception ex) { logger.LogWarning(ex, "Realtime delivery failed for {Event}; persisted data remains available", eventName); }
    }
    public async Task ForceLogoutAsync(Guid userId) { await PublishAsync(userId, "ForceLogout", new { }); connections.AbortUser(userId); }
    public Task RevokeConnectionsAsync(Guid userId) { connections.AbortUser(userId); return Task.CompletedTask; }
}
