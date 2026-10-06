using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Chat;
public sealed class SendMessageValidator : AbstractValidator<SendMessageInput>
{
    public SendMessageValidator()
    {
        RuleFor(x => x.Content).MaximumLength(2000).WithMessage("Tin nhắn tối đa 2.000 ký tự.");
        RuleFor(x => x).Must(x => !string.IsNullOrWhiteSpace(x.Content) || x.HasImage).WithMessage("Vui lòng nhập tin nhắn hoặc chọn ảnh.");
    }
}
public sealed class ChatService(IDataStore db, ICurrentUser current, IClock clock, IFileStorage files, IRealtimeEvents realtime, SessionService sessions, IValidator<SendMessageInput> validator)
{
    public async Task<MessagePageDto> MessagesAsync(Guid id, long? before, int limit)
    {
        await sessions.AuthorizeAsync(id);
        if (limit is < 1 or > 50 || before is <= 0) throw new AppException(400, "VALIDATION_ERROR", "Giới hạn tin nhắn cần từ 1 đến 50; cursor phải lớn hơn 0.");
        var query = db.Query<ChatMessage>().Where(m => m.SessionId == id);
        if (before.HasValue) query = query.Where(m => m.Id < before.Value);
        var items = await db.ListAsync(Project(query.OrderByDescending(m => m.Id).Take(limit + 1)));
        var more = items.Count > limit; if (more) items.RemoveAt(items.Count - 1);
        var cursor = more ? items.Last().Id : (long?)null; items.Reverse(); return new MessagePageDto(items, cursor, more);
    }
    public async Task<MessageDto> SendAsync(Guid id, string? content, Stream? image, long imageLength)
    {
        var access = await sessions.AuthorizeAsync(id); content = string.IsNullOrWhiteSpace(content) ? null : content.Trim();
        await validator.ValidateAndThrowAsync(new SendMessageInput(content, image is not null));
        if (access.Status == SessionStatus.Closed) throw AppException.Conflict("SESSION_CLOSED", "Phiên hỗ trợ đã hoàn thành.");
        var stored = image is null ? null : await files.SaveImageAsync(image, imageLength, 5 * 1024 * 1024, "chat/" + id);
        var message = new ChatMessage { SessionId = id, SenderId = current.Id, Content = content, ImagePath = stored?.Path, ImageContentType = stored?.ContentType, SentAt = clock.UtcNow };
        try
        {
            await db.AtomicAsync(async () =>
            {
                if (!await db.LockActiveSessionAsync(id)) throw AppException.Conflict("SESSION_CLOSED", "Phiên hỗ trợ đã hoàn thành.");
                db.Add(message); await db.SaveAsync(); return true;
            });
        }
        catch { if (stored is not null) files.Delete(stored.Path); throw; }
        var dto = (await db.FirstAsync(Project(db.Query<ChatMessage>().Where(m => m.Id == message.Id))))!;
        await realtime.PublishAsync(access.RequesterId, "ReceiveMessage", dto); await realtime.PublishAsync(access.HelperId, "ReceiveMessage", dto); return dto;
    }
    public async Task ReadAsync(Guid id)
    {
        var access = await sessions.AuthorizeAsync(id); var now = clock.UtcNow;
        var count = await db.MarkReadAsync(id, current.Id, now); if (count == 0) return;
        var last = await db.FirstAsync(db.Query<ChatMessage>().Where(m => m.SessionId == id).OrderByDescending(m => m.Id).Select(m => (long?)m.Id));
        var data = new { sessionId = id, readerId = current.Id, upToMessageId = last, readAt = now };
        await realtime.PublishAsync(access.RequesterId, "MessagesRead", data); await realtime.PublishAsync(access.HelperId, "MessagesRead", data);
    }
    public async Task<(Stream Stream, string ContentType)> ImageAsync(Guid id, long messageId)
    {
        await sessions.AuthorizeAsync(id);
        var message = await db.FirstAsync(db.Query<ChatMessage>().Where(m => m.SessionId == id && m.Id == messageId)) ?? throw AppException.NotFound();
        if (message.ImagePath is null) throw AppException.NotFound(); return (await files.OpenAsync(message.ImagePath), message.ImageContentType!);
    }
    private static IQueryable<MessageDto> Project(IQueryable<ChatMessage> query) => query.Select(m => new MessageDto(m.Id, m.SessionId, m.SenderId, m.Sender.FullName, m.Sender.AvatarPath == null ? null : "/api/users/" + m.SenderId + "/avatar", m.Content, m.ImagePath == null ? null : "/api/sessions/" + m.SessionId + "/messages/" + m.Id + "/image", m.SentAt, m.ReadAt));
}
