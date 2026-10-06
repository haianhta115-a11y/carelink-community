using CareLink.Domain;
namespace CareLink.Application.Admin;
public sealed record ReasonInput(string Reason);
public sealed record ReportInput(ReportTarget TargetType, Guid? TargetRequestId, Guid? TargetUserId, ReportReason Reason, string Description);
public sealed record ResolveInput(ReportStatus Status, string AdminNote, string? Action);
public sealed record AdminUserDto(Guid Id, string Email, string FullName, UserRole Role, UserStatus Status, string? AvatarUrl, string? LockedReason, DateTime CreatedAt);
public sealed record ReportDto(Guid Id, Guid ReporterId, string ReporterName, ReportTarget TargetType, Guid? TargetRequestId, Guid? TargetUserId, string TargetName, ReportReason Reason, string Description, ReportStatus Status, string? AdminNote, string? HandledByName, DateTime? HandledAt, DateTime CreatedAt);
public sealed record AuditDto(Guid Id, string ActorName, string Action, string EntityType, string EntityId, string? OldValue, string? NewValue, string? Reason, DateTime CreatedAt);
public sealed record DashboardDto(int TotalUsers, int Helpers, Dictionary<string, int> RequestsByStatus, int PendingReports, List<ReportDto> RecentReports);
public sealed class AdminFilter
{
    public string? Keyword { get; set; }
    public UserRole? Role { get; set; }
    public string? Status { get; set; }
    public string? Action { get; set; }
    public string? Group { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
