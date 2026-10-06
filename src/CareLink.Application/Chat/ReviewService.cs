using CareLink.Application.Common;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Chat;
public sealed record ReviewInput(int Rating, string? Comment);
public sealed record ReviewDto(Guid Id, int Rating, string? Comment, string ReviewerName, Guid RevieweeId, DateTime CreatedAt);
public sealed class ReviewValidator : AbstractValidator<ReviewInput>
{
    public ReviewValidator() { RuleFor(x => x.Rating).InclusiveBetween(1, 5).WithMessage("Đánh giá cần từ 1 đến 5 sao."); RuleFor(x => x.Comment).MaximumLength(500).WithMessage("Nhận xét tối đa 500 ký tự."); }
}
public sealed class ReviewService(IDataStore db, ICurrentUser current, IClock clock, SessionService sessions, IValidator<ReviewInput> validator)
{
    public async Task<ReviewDto?> GetAsync(Guid sessionId)
    {
        await sessions.AuthorizeAsync(sessionId); return await db.FirstAsync(Project(db.Query<Review>().Where(r => r.SessionId == sessionId)));
    }
    public async Task<ReviewDto> CreateAsync(Guid sessionId, ReviewInput input)
    {
        var session = await sessions.AuthorizeAsync(sessionId);
        if (current.Role != UserRole.Requester || session.RequesterId != current.Id) throw AppException.Forbidden();
        if (session.Status != SessionStatus.Closed) throw AppException.Conflict("INVALID_TRANSITION", "Chỉ đánh giá sau khi hoàn thành hỗ trợ.");
        input = input with { Comment = string.IsNullOrWhiteSpace(input.Comment) ? null : input.Comment.Trim() }; await validator.ValidateAndThrowAsync(input);
        if (await db.AnyAsync(db.Query<Review>().Where(r => r.SessionId == sessionId))) throw AppException.Conflict("CONCURRENCY_CONFLICT", "Bạn đã gửi đánh giá cho phiên này.");
        var review = new Review { SessionId = sessionId, ReviewerId = current.Id, RevieweeId = session.HelperId, Rating = input.Rating, Comment = input.Comment, CreatedAt = clock.UtcNow };
        db.Add(review); await db.SaveAsync();
        return (await db.FirstAsync(Project(db.Query<Review>().Where(r => r.Id == review.Id))))!;
    }
    private static IQueryable<ReviewDto> Project(IQueryable<Review> query) => query.Select(r => new ReviewDto(r.Id, r.Rating, r.Comment, r.Reviewer.FullName, r.RevieweeId, r.CreatedAt));
}
