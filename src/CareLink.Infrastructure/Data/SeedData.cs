using CareLink.Application.Common;
using CareLink.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CareLink.Infrastructure.Data;
public static class SeedData
{
    public static async Task RunAsync(CareLinkDbContext db, IPasswordHasher hasher, IConfiguration config)
    {
        await CategoryCatalog.SyncAsync(db);
        if (await db.Set<User>().AnyAsync()) { await CategoryCatalog.SeedAdditionalRequestsAsync(db); return; }
        var now = DateTime.UtcNow;
        var admin = new User { Email = "admin@carelink.vn", FullName = "Quản trị CareLink", Role = UserRole.Admin, PasswordHash = hasher.Hash(config["Seed:AdminPassword"] ?? "Admin@12345"), CreatedAt = now, UpdatedAt = now };
        var names = new[] { "Nguyễn Minh Anh", "Trần Thu Hà", "Lê Hoàng Nam", "Đỗ Quang Vinh", "Tạ Hải Anh", "Đinh Hải Anh" };
        var locations = new[] { "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Huế", "Cần Thơ" };
        var hash = hasher.Hash("Demo@12345");
        var users = names.Select((name, i) => new User { Email = (i < 3 ? "requester" + (i + 1) : "helper" + (i - 2)) + "@carelink.vn", FullName = name, Role = i < 3 ? UserRole.Requester : UserRole.Helper, PasswordHash = hash, Phone = "090123456" + i, Address = "Khu dân cư, " + locations[i % 5], CreatedAt = now.AddDays(-10), UpdatedAt = now }).ToArray();
        db.Add(admin); db.AddRange(users);
        await db.SaveChangesAsync();
        var titles = new[] {
            "Cần người đồng hành đưa mẹ đi khám", "Nhờ hướng dẫn Toán lớp 9 cho em trai", "Cần đưa đón đến trung tâm phục hồi chức năng", "Nhờ mua nhu yếu phẩm cho người lớn tuổi", "Cần hỗ trợ sửa vòi nước bị rò rỉ", "Tìm người trò chuyện cùng bà cuối tuần", "Nhờ trông bé trong buổi làm thủ tục", "Cần hướng dẫn hồ sơ bảo hiểm y tế", "Cần người hỗ trợ sắp xếp đồ chuyển phòng",
            "Nhờ đưa ông đến lịch khám định kỳ", "Tìm người hướng dẫn tin học cơ bản", "Nhờ đưa đón đến lớp học cộng đồng", "Cần mua thuốc theo đơn tại hiệu thuốc", "Nhờ sửa đèn và kiểm tra ổ điện", "Cần bạn đồng hành cùng ông đi bộ", "Nhờ đọc sách cho các em nhỏ", "Cần hỗ trợ điền mẫu hồ sơ nhập học", "Tìm người cùng dọn tủ sách cộng đồng",
            "Nhờ đồng hành đi khám sức khỏe", "Cần ôn tập tiếng Anh trước kỳ thi", "Hỗ trợ di chuyển đến bến xe", "Nhờ nhận giúp bưu kiện khi đi vắng", "Cần lắp kệ sách nhỏ trong nhà", "Cần người hỗ trợ ông bà dùng điện thoại", "Nhờ hướng dẫn bé học bài buổi chiều"
        };
        var descriptions = new[] {
            "Mẹ tôi có lịch khám định kỳ nhưng tôi bận công việc. Mong tìm được một bạn có thể đồng hành, hỗ trợ đăng ký và đưa mẹ về sau buổi khám. Thời gian cụ thể sẽ trao đổi trong phiên hỗ trợ.",
            "Gia đình cần một người kiên nhẫn cùng em ôn lại kiến thức cơ bản. Mong bạn hỗ trợ khoảng một đến hai giờ vào cuối tuần. Chúng tôi sẽ chuẩn bị đầy đủ sách vở và trao đổi trước về nội dung.",
            "Tôi cần một người hỗ trợ di chuyển an toàn trong khu vực. Hành trình không quá xa và có thể linh hoạt thời gian. Rất mong nhận được sự giúp đỡ từ các bạn trong cộng đồng.",
            "Tôi đang gặp khó khăn trong việc ra ngoài và cần hỗ trợ một việc sinh hoạt hằng ngày. Danh sách và lịch hẹn sẽ được trao đổi riêng. Xin cảm ơn bạn đã dành thời gian giúp đỡ."
        };
        for (var i = 0; i < titles.Length; i++)
        {
            var status = i < 17 ? RequestStatus.Open : i < 20 ? RequestStatus.Accepted : i < 23 ? RequestStatus.InProgress : RequestStatus.Completed;
            var created = now.AddHours(-i * 4 - 1);
            var request = new SupportRequest { RequesterId = users[i % 3].Id, CategoryId = i % 9 + 1, Title = titles[i], Description = descriptions[i % 4], Location = locations[i % 5] + (i % 5 == 0 ? ", Cầu Giấy" : i % 5 == 1 ? ", Bình Thạnh" : ", khu vực trung tâm"), Urgency = (Urgency)(i % 4), Status = status, CreatedAt = created, UpdatedAt = created };
            db.Add(request); db.Add(new RequestStatusHistory { RequestId = request.Id, ToStatus = RequestStatus.Open, ChangedById = request.RequesterId, ChangedAt = created, Note = "Yêu cầu được tạo." });
            if (status != RequestStatus.Open)
            {
                request.AcceptedAt = created.AddMinutes(15);
                var session = new SupportSession { RequestId = request.Id, HelperId = users[3 + i % 3].Id, Status = status == RequestStatus.Completed ? SessionStatus.Closed : SessionStatus.Active, CreatedAt = request.AcceptedAt.Value };
                db.Add(session); db.Add(new RequestStatusHistory { RequestId = request.Id, FromStatus = RequestStatus.Open, ToStatus = RequestStatus.Accepted, ChangedById = session.HelperId, ChangedAt = session.CreatedAt, Note = "Người hỗ trợ đã nhận yêu cầu." });
                db.Add(new ChatMessage { SessionId = session.Id, SenderId = session.HelperId, Content = "Chào bạn, mình đã nhận hỗ trợ. Bạn cho mình biết thời gian thuận tiện nhé!", SentAt = created.AddMinutes(20), ReadAt = created.AddMinutes(25) });
                db.Add(new ChatMessage { SessionId = session.Id, SenderId = request.RequesterId, Content = "Cảm ơn bạn nhiều! Chiều mai khoảng 14 giờ có tiện cho bạn không?", SentAt = created.AddMinutes(26) });
                if (status is RequestStatus.InProgress or RequestStatus.Completed)
                {
                    request.StartedAt = session.StartedAt = created.AddMinutes(30);
                    db.Add(new RequestStatusHistory { RequestId = request.Id, FromStatus = RequestStatus.Accepted, ToStatus = RequestStatus.InProgress, ChangedById = session.HelperId, ChangedAt = request.StartedAt.Value });
                }
                if (status == RequestStatus.Completed)
                {
                    request.CompletedAt = session.CompletedAt = created.AddHours(2);
                    db.Add(new RequestStatusHistory { RequestId = request.Id, FromStatus = RequestStatus.InProgress, ToStatus = RequestStatus.Completed, ChangedById = request.RequesterId, ChangedAt = request.CompletedAt.Value });
                    db.Add(new Review { SessionId = session.Id, ReviewerId = request.RequesterId, RevieweeId = session.HelperId, Rating = 5, Comment = "Bạn rất nhiệt tình và chu đáo. Cảm ơn vì đã giúp gia đình mình!", CreatedAt = request.CompletedAt.Value });
                }
            }
        }
        await db.SaveChangesAsync();
        var firstRequest = await db.Set<SupportRequest>().FirstAsync();
        db.Add(new Report { ReporterId = users[3].Id, TargetType = ReportTarget.Request, TargetRequestId = firstRequest.Id, Reason = ReportReason.Other, Description = "Nhờ quản trị viên kiểm tra lại nội dung và địa điểm của yêu cầu.", Status = ReportStatus.Pending, CreatedAt = now.AddHours(-3) });
        db.Add(new Report { ReporterId = users[4].Id, TargetType = ReportTarget.User, TargetUserId = users[2].Id, Reason = ReportReason.Spam, Description = "Tài khoản đăng các nội dung có dấu hiệu lặp lại, nhờ kiểm tra.", Status = ReportStatus.Resolved, AdminNote = "Đã nhắc nhở người dùng và kiểm tra nội dung.", HandledById = admin.Id, HandledAt = now.AddHours(-1), CreatedAt = now.AddHours(-5) });
        db.Add(new AuditLog { ActorId = admin.Id, Action = "REPORT_RESOLVED", EntityType = "Report", EntityId = "seed", OldValue = "Pending", NewValue = "Resolved", Reason = "Đã kiểm tra và nhắc nhở.", CreatedAt = now.AddHours(-1) });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        await CategoryCatalog.SeedAdditionalRequestsAsync(db);
    }
}
