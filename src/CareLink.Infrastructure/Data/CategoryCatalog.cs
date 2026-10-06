using CareLink.Domain;
using Microsoft.EntityFrameworkCore;
namespace CareLink.Infrastructure.Data;
public static class CategoryCatalog
{
    private static readonly (string Name, string Slug, string Icon, string Group, string Description)[] Entries = [
        ("Y tế & sức khỏe", "health", "HeartPulse", "health", "Đồng hành đi khám và hỗ trợ sinh hoạt khi cần chăm sóc sức khỏe."),
        ("Học tập & gia sư", "education", "GraduationCap", "education", "Ôn tập kiến thức và cùng nhau vượt qua khó khăn trong học tập."),
        ("Đưa đón & di chuyển", "transport", "Car", "transport", "Hỗ trợ những chuyến đi cần một người đồng hành."),
        ("Mua sắm & giao hàng", "shopping", "ShoppingBag", "daily", "Giúp mua nhu yếu phẩm và nhận đồ cho người khó di chuyển."),
        ("Sửa chữa & việc nhà", "housework", "Wrench", "daily", "Cùng giải quyết những việc nhỏ trong gia đình."),
        ("Chăm sóc người cao tuổi", "elder-care", "HandHeart", "care", "Chăm sóc, trò chuyện và đồng hành cùng ông bà."),
        ("Chăm sóc trẻ em", "child-care", "Baby", "care", "Chia sẻ việc chăm sóc trẻ trong thời gian gia đình cần hỗ trợ."),
        ("Hỗ trợ thủ tục giấy tờ", "paperwork", "Files", "inclusion", "Hướng dẫn biểu mẫu và các bước làm hồ sơ cơ bản."),
        ("Khác", "other", "Sparkles", "daily", "Những nhu cầu xứng đáng được lắng nghe và sẻ chia."),
        ("Lắng nghe & hỗ trợ tinh thần", "emotional-support", "Heart", "health", "Trò chuyện, lắng nghe và chia sẻ; không thay thế tư vấn chuyên môn."),
        ("Đồng hành phục hồi sức khỏe", "recovery-companion", "Activity", "health", "Hỗ trợ sinh hoạt và đi lại theo hướng dẫn của chuyên gia."),
        ("Hỗ trợ nhận thuốc theo đơn", "medicine-pickup", "Pill", "health", "Giúp nhận thuốc có đơn, không tư vấn hay thay đổi điều trị."),
        ("Hiến máu & kết nối thông tin", "blood-donation", "Droplets", "health", "Chia sẻ thông tin hiến máu và đồng hành đến cơ sở được phép."),
        ("Đồng hành tại bệnh viện", "hospital-companion", "Hospital", "health", "Hướng dẫn khu khám, đăng ký và hỗ trợ người đi khám."),
        ("Ngoại ngữ & giao tiếp", "languages", "Languages", "education", "Luyện giao tiếp và cùng học thêm một ngôn ngữ mới."),
        ("Tin học & kỹ năng số", "digital-literacy", "Laptop", "education", "Hướng dẫn dùng máy tính, điện thoại và các công cụ số."),
        ("Hướng nghiệp & hồ sơ ứng tuyển", "career-support", "BriefcaseBusiness", "education", "Chia sẻ kinh nghiệm nghề nghiệp và góp ý CV, hồ sơ ứng tuyển."),
        ("Đọc sách & chia sẻ tri thức", "reading", "BookOpen", "education", "Đọc sách cùng nhau và lan tỏa thói quen học hỏi."),
        ("Kỹ năng sống & học nghề", "life-skills", "Lightbulb", "education", "Chia sẻ những kỹ năng thiết thực trong học tập và đời sống."),
        ("Hỗ trợ sinh viên xa nhà", "student-support", "School", "education", "Đồng hành với sinh viên trong những ngày đầu ở nơi mới."),
        ("Nấu ăn & chuẩn bị bữa ăn", "meal-preparation", "CookingPot", "daily", "Giúp chuẩn bị bữa ăn cho người đang gặp khó khăn."),
        ("Sửa điện & thiết bị gia đình", "home-electrical", "PlugZap", "daily", "Hỗ trợ công việc đơn giản; chỉ nhận việc phù hợp kỹ năng của bạn."),
        ("Sửa máy tính & điện thoại", "device-repair", "MonitorCog", "daily", "Hướng dẫn kiểm tra thiết bị và khắc phục lỗi sử dụng cơ bản."),
        ("Dọn dẹp & chuyển đồ", "moving-help", "Package", "daily", "Hỗ trợ sắp xếp, dọn dẹp và di chuyển đồ dùng."),
        ("Chăm sóc thú cưng", "pet-care", "PawPrint", "care", "Trông nom, chăm sóc và hỗ trợ thú cưng khi chủ gặp khó khăn."),
        ("Đồng hành cùng người khuyết tật", "disability-support", "Accessibility", "inclusion", "Hỗ trợ tiếp cận dịch vụ và tham gia sinh hoạt cộng đồng."),
        ("Ngôn ngữ ký hiệu & tiếp cận", "sign-language", "Hand", "inclusion", "Đồng hành giao tiếp và hỗ trợ thông tin dễ tiếp cận."),
        ("Hỗ trợ người mới chuyển đến", "newcomer-support", "MapPinned", "inclusion", "Chia sẻ thông tin khu vực, dịch vụ và sinh hoạt ở nơi mới."),
        ("Hỗ trợ dịch vụ công trực tuyến", "public-services", "FileCheck2", "inclusion", "Hướng dẫn thao tác hồ sơ điện tử, không yêu cầu mật khẩu hay OTP."),
        ("Hỗ trợ đọc & điền biểu mẫu", "form-assistance", "PenLine", "inclusion", "Giúp đọc thông tin và điền biểu mẫu theo mong muốn của người cần."),
        ("Đưa đón người có hạn chế vận động", "accessible-transport", "Bus", "transport", "Hỗ trợ di chuyển phù hợp nhu cầu tiếp cận của đối phương."),
        ("Vận chuyển đồ hỗ trợ cộng đồng", "community-delivery", "Truck", "transport", "Kết nối người giúp chuyển sách, quần áo và nhu yếu phẩm."),
        ("Đồng hành đi học & đi làm", "school-work-transport", "Bike", "transport", "Giúp kết nối những chuyến đi đến trường và nơi làm việc."),
        ("Hỗ trợ khắc phục sau thiên tai", "disaster-recovery", "CloudRain", "emergency", "Hỗ trợ hậu cần sau thiên tai theo hướng dẫn tại địa phương."),
        ("Chia sẻ nhu yếu phẩm", "essential-supplies", "Boxes", "emergency", "Kết nối sự sẻ chia vật phẩm cần thiết, không vận động quyên góp tiền."),
        ("Chỗ ở tạm & thông tin nơi trú", "temporary-shelter", "House", "emergency", "Chia sẻ thông tin nơi trú và đồng hành liên hệ đơn vị phù hợp."),
        ("Hỗ trợ gia đình gặp khó khăn", "family-support", "Users", "care", "Cùng chia sẻ các việc thiết thực khi gia đình cần thêm bàn tay."),
        ("Chăm sóc người đang hồi phục", "home-recovery-care", "HeartHandshake", "care", "Hỗ trợ sinh hoạt tại nhà; không thay thế nhân viên y tế."),
        ("Dọn vệ sinh cộng đồng", "community-cleanup", "Trash2", "environment", "Cùng làm sạch không gian sống và khu vực chung."),
        ("Trồng cây & chăm sóc cây xanh", "tree-care", "TreePine", "environment", "Chăm sóc cây và góp phần làm xanh khu dân cư."),
        ("Tái sử dụng & phân loại rác", "recycling", "Recycle", "environment", "Chia sẻ cách phân loại, tái sử dụng và giảm rác thải."),
        ("Sách & đồ dùng học tập", "learning-supplies", "NotebookPen", "education", "Kết nối người có thể chia sẻ sách và vật dụng học tập."),
        ("Quần áo & vật dụng cần thiết", "clothing-supplies", "Shirt", "emergency", "Sẻ chia đồ dùng còn tốt với những người đang cần."),
        ("Hoạt động tình nguyện địa phương", "local-volunteering", "Handshake", "environment", "Đồng hành tổ chức những công việc có ích cho cộng đồng."),
        ("Hỗ trợ bảo vệ động vật", "animal-support", "Dog", "care", "Kết nối chăm sóc và hỗ trợ động vật cần sự quan tâm.")
    ];
    public static async Task SyncAsync(CareLinkDbContext db)
    {
        var existing = await db.Set<Category>().ToDictionaryAsync(c => c.Id);
        for (var i = 0; i < Entries.Length; i++)
        {
            var item = Entries[i];
            if (!existing.TryGetValue(i + 1, out var category))
                db.Add(new Category { Id = i + 1, Name = item.Name, Slug = item.Slug, Icon = item.Icon, GroupKey = item.Group, Description = item.Description, SortOrder = i, IsActive = true });
            else if (string.IsNullOrEmpty(category.Description)) { category.Description = item.Description; category.GroupKey = item.Group; }
        }
        await db.SaveChangesAsync(); db.ChangeTracker.Clear();
    }
    public static async Task SeedAdditionalRequestsAsync(CareLinkDbContext db)
    {
        var requesters = await db.Set<User>().Where(u => u.Role == UserRole.Requester).OrderBy(u => u.Email).Take(3).ToListAsync(); if (requesters.Count == 0) return;
        var existing = (await db.Set<SupportRequest>().Select(r => r.Id).ToListAsync()).ToHashSet();
        var titles = new[] { "Mong tìm một người lắng nghe sau tuần khó khăn", "Nhờ đồng hành đến buổi phục hồi chức năng", "Cần nhận giúp thuốc theo đơn cho mẹ", "Tìm người cùng đi hiến máu tại bệnh viện", "Nhờ hướng dẫn đăng ký khám tại bệnh viện", "Tìm bạn luyện giao tiếp tiếng Anh cuối tuần", "Nhờ hướng dẫn ông bà sử dụng điện thoại", "Mong được góp ý CV cho lần ứng tuyển đầu tiên", "Nhờ đọc sách cùng các em ở tủ sách khu phố", "Tìm người hướng dẫn kỹ năng nấu ăn cơ bản", "Cần người hướng dẫn sinh viên mới đến Hà Nội", "Nhờ chuẩn bị bữa ăn khi đang hồi phục", "Cần kiểm tra đèn trong phòng bị chập chờn", "Nhờ kiểm tra máy tính học tập bị chậm", "Cần hỗ trợ chuyển sách và sắp xếp phòng", "Nhờ chăm sóc mèo trong thời gian đi khám", "Nhờ đồng hành cùng người hạn chế vận động", "Tìm người hỗ trợ giao tiếp bằng ngôn ngữ ký hiệu", "Cần hướng dẫn các dịch vụ tại nơi mới chuyển đến", "Nhờ hướng dẫn nộp hồ sơ trực tuyến", "Nhờ đọc và điền biểu mẫu theo hướng dẫn", "Cần chuyến đi phù hợp cho người dùng xe lăn", "Nhờ chuyển sách đến lớp học cộng đồng", "Tìm người đồng hành đến lớp học buổi tối", "Cần hỗ trợ dọn dẹp sau mưa ngập", "Nhờ kết nối vật phẩm cần thiết cho gia đình", "Cần thông tin nơi trú tạm tại địa phương", "Nhờ chia sẻ việc nhà khi gia đình gặp khó khăn", "Cần giúp sinh hoạt trong giai đoạn hồi phục", "Tìm người cùng dọn vệ sinh con hẻm cuối tuần", "Nhờ hỗ trợ chăm sóc cây ở khu sinh hoạt chung", "Cần hướng dẫn phân loại rác trong gia đình", "Tìm sách lớp 6 và đồ dùng học tập còn tốt", "Nhờ kết nối quần áo ấm cho người đang cần", "Cần người hỗ trợ buổi sinh hoạt cộng đồng", "Nhờ chăm sóc động vật đang chờ được nhận nuôi" };
        var locations = new[] { "Hà Nội, Cầu Giấy", "TP. Hồ Chí Minh, Bình Thạnh", "Đà Nẵng, Hải Châu", "Huế, Phú Hội", "Cần Thơ, Ninh Kiều" };
        for (var i = 0; i < titles.Length; i++)
        {
            var seedId = new Guid("ca000000-0000-4000-8000-" + (i + 10).ToString("D12"));
            if (existing.Contains(seedId)) continue;
            var item = Entries[i + 9]; var created = DateTime.UtcNow.AddHours(-i * 2 - 1);
            var request = new SupportRequest { Id = seedId, RequesterId = requesters[i % requesters.Count].Id, CategoryId = i + 10, Title = titles[i], Description = item.Description + " Gia đình mong tìm được một bạn có thể dành thời gian đồng hành. Chúng tôi sẽ trao đổi riêng về thời gian, địa điểm và các lưu ý để sự giúp đỡ phù hợp và an toàn. Xin cảm ơn bạn đã quan tâm.", Location = locations[i % 5], Urgency = item.Group == "emergency" ? Urgency.High : Urgency.Normal, CreatedAt = created, UpdatedAt = created };
            db.Add(request); db.Add(new RequestStatusHistory { RequestId = request.Id, ToStatus = RequestStatus.Open, ChangedById = request.RequesterId, ChangedAt = created, Note = "Yêu cầu mẫu cho lĩnh vực cộng đồng." });
        }
        await db.SaveChangesAsync(); db.ChangeTracker.Clear();
    }
}
