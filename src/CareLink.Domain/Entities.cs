namespace CareLink.Domain;

public enum UserRole { Requester, Helper, Admin }
public enum UserStatus { Active, Locked }
public enum RequestStatus { Open, Accepted, InProgress, Completed }
public enum Urgency { Low, Normal, High, Critical }
public enum SessionStatus { Active, Closed }
public enum ReportTarget { Request, User }
public enum ReportReason { FakeRequest, Inappropriate, Harassment, Spam, PersonalDataLeak, Other }
public enum ReportStatus { Pending, Reviewing, Resolved, Rejected }

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public UserRole Role { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public string? LockedReason { get; set; }
    public DateTime? LockedAt { get; set; }
    public string? AvatarPath { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public int TokenVersion { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
public sealed class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Icon { get; set; } = "";
    public string GroupKey { get; set; } = "daily";
    public string Description { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
public sealed class SupportRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequesterId { get; set; }
    public User Requester { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Location { get; set; } = "";
    public Urgency Urgency { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Open;
    public bool IsHidden { get; set; }
    public string? HiddenReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
}
public sealed class SupportSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequestId { get; set; }
    public SupportRequest Request { get; set; } = null!;
    public Guid HelperId { get; set; }
    public User Helper { get; set; } = null!;
    public SessionStatus Status { get; set; } = SessionStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
public sealed class ChatMessage
{
    public long Id { get; set; }
    public Guid SessionId { get; set; }
    public SupportSession Session { get; set; } = null!;
    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string? Content { get; set; }
    public string? ImagePath { get; set; }
    public string? ImageContentType { get; set; }
    public DateTime SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
public sealed class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionId { get; set; }
    public SupportSession Session { get; set; } = null!;
    public Guid ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;
    public Guid RevieweeId { get; set; }
    public User Reviewee { get; set; } = null!;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
public sealed class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReporterId { get; set; }
    public User Reporter { get; set; } = null!;
    public ReportTarget TargetType { get; set; }
    public Guid? TargetRequestId { get; set; }
    public SupportRequest? TargetRequest { get; set; }
    public Guid? TargetUserId { get; set; }
    public User? TargetUser { get; set; }
    public ReportReason Reason { get; set; }
    public string Description { get; set; } = "";
    public ReportStatus Status { get; set; }
    public string? AdminNote { get; set; }
    public Guid? HandledById { get; set; }
    public User? HandledBy { get; set; }
    public DateTime? HandledAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
public sealed class RequestStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequestId { get; set; }
    public SupportRequest Request { get; set; } = null!;
    public RequestStatus? FromStatus { get; set; }
    public RequestStatus ToStatus { get; set; }
    public Guid ChangedById { get; set; }
    public User ChangedBy { get; set; } = null!;
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }
}
public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ActorId { get; set; }
    public User Actor { get; set; } = null!;
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}
