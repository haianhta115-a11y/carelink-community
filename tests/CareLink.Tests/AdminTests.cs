using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Admin;
using CareLink.Application.Auth;
using CareLink.Application.Common;
using CareLink.Domain;
using FluentAssertions;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class AdminTests(ApiFactory factory)
{
    [Fact]
    public async Task AT_10_admin_lock_rejects_existing_jwt_unlock_never_revives_old_jwt_and_admin_is_protected()
    {
        using var admin = await factory.LoginAsync("admin@carelink.vn"); using var requester = await factory.LoginAsync("requester1@carelink.vn");
        (await admin.GetAsync("/api/admin/dashboard")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.GetAsync("/api/admin/reports?status=Pending")).StatusCode.Should().Be(HttpStatusCode.OK);
        foreach (var path in new[] { "/api/admin/dashboard", "/api/admin/users", "/api/admin/requests", "/api/admin/reports", "/api/admin/audit-logs" }) (await requester.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var email = "moderation" + Guid.NewGuid().ToString("N") + "@example.vn";
        var created = await requester.PostAsJsonAsync("/api/auth/register", new RegisterInput("Người kiểm thử khóa", email, "Demo@12345", "Demo@12345", UserRole.Helper, null));
        var user = (await created.Content.ReadFromJsonAsync<UserDto>(TestJson.Options))!; using var target = await factory.LoginAsync(email);
        (await target.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/admin/users/{user.Id}/lock", new ReasonInput("Vi phạm kiểm thử"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await target.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await target.PostAsJsonAsync("/api/auth/login", new { email, password = "wrongpassword" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await target.PostAsJsonAsync("/api/auth/login", new { email, password = "Demo@12345" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.PostAsJsonAsync($"/api/admin/users/{user.Id}/unlock", new ReasonInput("Đã xem xét lại"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await target.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var self = (await admin.GetFromJsonAsync<UserDto>("/api/auth/me", TestJson.Options))!;
        (await admin.PostAsJsonAsync($"/api/admin/users/{self.Id}/lock", new ReasonInput("Không được phép"))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var logs = await admin.GetFromJsonAsync<PageDto<AuditDto>>("/api/admin/audit-logs?action=USER_LOCKED", TestJson.Options); logs!.Items.Should().Contain(l => l.EntityId == user.Id.ToString());
    }
    [Fact]
    public async Task Moderation_reports_and_admin_exception_are_atomic_and_audited()
    {
        using var admin = await factory.LoginAsync("admin@carelink.vn"); using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); var request = await requester.CreateRequestAsync();
        var created = await helper.PostAsJsonAsync("/api/reports", new ReportInput(ReportTarget.Request, request.Id, null, ReportReason.Other, "Cần kiểm tra lại nội dung của yêu cầu hỗ trợ này.")); created.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await created.Content.ReadFromJsonAsync<Dictionary<string, Guid>>(); var reportId = result!["id"];
        (await admin.PostAsJsonAsync($"/api/admin/reports/{reportId}/resolve", new ResolveInput(ReportStatus.Reviewing, "Đang kiểm tra nội dung", null))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/admin/reports/{reportId}/resolve", new ResolveInput(ReportStatus.Resolved, "Ẩn nội dung để xem xét thêm", "HideRequest"))).StatusCode.Should().Be(HttpStatusCode.OK);
        (await helper.GetAsync($"/api/requests/{request.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await admin.GetAsync($"/api/requests/{request.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await admin.PostAsJsonAsync($"/api/admin/requests/{request.Id}/unhide", new ReasonInput("Đã kiểm tra, nội dung hợp lệ"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        await helper.PostAsync($"/api/requests/{request.Id}/accept", null);
        (await admin.PostAsJsonAsync($"/api/admin/requests/{request.Id}/status", new ReasonInput("Hai bên đã xác nhận qua quản trị viên"))).StatusCode.Should().Be(HttpStatusCode.OK);
        var logs = await admin.GetFromJsonAsync<PageDto<AuditDto>>("/api/admin/audit-logs?action=ADMIN_FORCE_STATUS", TestJson.Options); logs!.Items.Should().Contain(l => l.EntityId == request.Id.ToString() && l.Reason != null);
    }
}
