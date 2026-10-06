using CareLink.Application.Common;
using CareLink.Application.Requests;
using CareLink.Domain;
using FluentValidation;
namespace CareLink.Application.Admin;
public sealed class ReportService(IDataStore db, ICurrentUser current, IClock clock, RequestService requests, IValidator<ReportInput> validator)
{
    public async Task<Guid> CreateAsync(ReportInput input)
    {
        if (current.Role == UserRole.Admin) throw AppException.Forbidden();
        input = input with { Description = input.Description.Trim() }; await validator.ValidateAndThrowAsync(input);
        if (input.TargetType == ReportTarget.Request) await requests.AuthorizeAsync(input.TargetRequestId!.Value);
        else if (!await db.AnyAsync(db.Query<User>().Where(u => u.Id == input.TargetUserId))) throw AppException.NotFound();
        var report = new Report { ReporterId = current.Id, TargetType = input.TargetType, TargetRequestId = input.TargetRequestId, TargetUserId = input.TargetUserId, Reason = input.Reason, Description = input.Description, Status = ReportStatus.Pending, CreatedAt = clock.UtcNow };
        db.Add(report); await db.SaveAsync(); return report.Id;
    }
}
