# CareLink — Kết nối để không ai bị bỏ lại phía sau

Website hỗ trợ cộng đồng tiếng Việt, React 18 + TypeScript + ASP.NET Core .NET 10 + SQL Server 2022. Có 45 lĩnh vực trong 8 nhóm, 3 vai trò, quy trình hỗ trợ hoàn chỉnh, chat SignalR, đánh giá và khu quản trị.

## Chạy local bằng một lệnh (Windows)

Máy cần .NET 10 SDK và SQL Server 2022. Môi trường đã kiểm tra dùng instance `SQLEXPRESS`, Windows Authentication.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-local.ps1 -OpenBrowser
```

- Website: **http://localhost:5173**
- Khu quản trị: **http://localhost:5173/admin**
- Swagger + Authorize Bearer: **http://localhost:5080/swagger**
- Health check kiểm tra SQL Server: `http://localhost:5080/health`
- Script tự tìm Node.js, tải bản portable nếu cần, cài dependency, build API, áp dụng migrations và seed. JWT key được tạo ngẫu nhiên trong `.local/settings.json`; không commit file này.
- Dừng: `powershell -ExecutionPolicy Bypass -File .\scripts\stop-local.ps1`. Database và ảnh đã gửi được giữ lại.
- SQL instance khác: thêm `-ConnectionString "Server=YOUR_SERVER;Database=CareLink;Integrated Security=True;TrustServerCertificate=True"`.

## Tài khoản mẫu (chỉ Development)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Người cần hỗ trợ | requester1@carelink.vn, requester2@carelink.vn, requester3@carelink.vn | Demo@12345 |
| Người hỗ trợ | helper1@carelink.vn, helper2@carelink.vn, helper3@carelink.vn | Demo@12345 |
| Quản trị | admin@carelink.vn | Admin@12345, hoặc `Seed__AdminPassword` nếu đã cấu hình |

Trang đăng nhập có nút điền thông tin mẫu. Không dùng mật khẩu Development trên máy chủ public.

## Những chức năng đã triển khai

- Landing page, 45 lĩnh vực có tìm kiếm và phân nhóm, công cụ tìm nhu cầu theo khu vực.
- Đăng ký Requester/Helper; Admin không tự đăng ký. JWT 120 phút, BCrypt cost 12, kiểm tra khóa và TokenVersion trên backend.
- Hồ sơ, avatar được xác thực bằng magic bytes, đổi mật khẩu thu hồi phiên cũ.
- Tạo yêu cầu, tìm kiếm/lọc AND, lọc nhóm lĩnh vực, phân trang, lịch sử và stepper.
- Một Helper cho mỗi yêu cầu, nhận hỗ trợ bằng conditional UPDATE + transaction + unique index. Vòng đời Open → Accepted → InProgress → Completed.
- Chat text/ảnh, cursor lịch sử, đã gửi/đã xem, reconnect và đồng bộ REST; chỉ 2 thành viên đọc được chat. Admin không đọc được chat.
- Xác nhận hoàn thành idempotent, đóng chat, đánh giá 1–5 sao, hồ sơ công khai có điểm trung bình.
- Tổng quan cá nhân, hộp thư và số tin chưa đọc.
- Admin: dashboard, tìm/lọc tài khoản, khóa/mở khóa, ẩn/hiện yêu cầu, can thiệp có lý do, xử lý báo cáo, audit log, thêm/sửa/tạm dừng lĩnh vực.
- Responsive mobile có bottom tabs; chat có tab Trò chuyện/Chi tiết.

## Public bằng GitHub

**Website public:** https://haianhta115-a11y.github.io/carelink-community/

**Kho mã nguồn:** https://github.com/haianhta115-a11y/carelink-community

GitHub Pages phục vụ 24/24 theo khả năng sẵn sàng của dịch vụ GitHub. **GitHub Pages không chạy ASP.NET, SignalR hoặc SQL Server.** Bản public chạy đầy đủ như thật trên trình duyệt (dữ liệu lưu ở trình duyệt của bạn): tự đăng ký tài khoản, đăng yêu cầu, nhận việc, chat, xác nhận hoàn thành, đánh giá, báo cáo; Admin `admin@carelink.vn` / `Admin@12345` mở `/admin` để xem dashboard, tài khoản, yêu cầu, báo cáo, audit và danh mục. Thêm/sửa danh mục bị chặn có thông báo rõ ràng. Bản đầy đủ nhiều người dùng chung một cơ sở dữ liệu (đăng ký, chat realtime, SQL Server) chạy local theo hướng dẫn bên dưới.

Khi có backend HTTPS, build với `VITE_API_URL=https://YOUR_API_HOST`; đặt CORS origin bằng địa chỉ Pages. Xem **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** để triển khai API + SQL Server với Docker và HTTPS. Main và Admin dùng cùng backend được phân quyền; frontend Admin không có secret đặc biệt.

## Docker local

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init-docker.ps1
docker compose up --build
```

Web `http://localhost:8080`, Swagger `http://localhost:5080/swagger`. Script tạo `.env` với secret ngẫu nhiên; mật khẩu Admin là `ADMIN_PASSWORD` trong file. `.env.example` chỉ có tên biến. Docker cần Linux containers và RAM phù hợp với SQL Server (khuyến nghị máy có tối thiểu 8 GB RAM).

**Trên máy thực hiện, Docker chưa được cài.** API và integration tests được chạy trên SQL Server 2022 thật qua Windows Authentication. Cấu hình Testcontainers dùng SQL Server 2022 container khi không truyền `CARELINK_TEST_SQL`.

## Kiểm tra

```powershell
$env:CARELINK_TEST_SQL="Server=.\SQLEXPRESS;Database=master;Integrated Security=True;TrustServerCertificate=True"
dotnet test CareLink.sln
```

Mỗi lần test tạo database tên `CareLinkTests_<guid>` và xóa khi kết thúc. Không dùng database chứa dữ liệu thật cho kiểm thử. Nếu bỏ biến trên, test dùng Testcontainers và yêu cầu Docker.

Trong thư mục `web`:

```text
npm ci
npm run build
npm test
npm run lint
npm run test:e2e
```

Playwright dùng Chrome đã cài; chạy `start-local.ps1` trước. Kết quả/ảnh chụp nằm ở `artifacts/`. Kiểm thử backend bao phủ AT-01..AT-10, AT-12..AT-15; AT-11 được kiểm tra bằng Playwright ở 360/768/1280px. Ma trận: **[docs/TRACEABILITY.md](docs/TRACEABILITY.md)**.

### Kết quả thực tế ngày 06/10/2026

- Backend: **18 tests pass** trên SQL Server 2022 thật; build **0 warnings / 0 errors**.
- Frontend: **9 Vitest tests pass**, production build pass, **ESLint 0 errors / 0 warnings**.
- Chrome Playwright: **2 tests pass** trong 46,3 giây: luồng đầy đủ (đăng ký, tạo/tìm/nhận yêu cầu, bắt đầu, text/ảnh, hoàn thành, đánh giá, báo cáo và Admin khóa/mở khóa) và kiểm tra GitHub Pages thật.
- 360/768/1280px: landing và 15 trang nghiệp vụ của Requester/Helper/Admin được kiểm tra, **không tràn ngang**.
- Axe trên landing đầy đủ 45 lĩnh vực: **0 vi phạm WCAG 2 A/AA và 2.1 AA được công cụ phát hiện**. Đây là kết quả tự động trên trang đã kiểm tra, không phải chứng nhận accessibility cho toàn bộ hệ thống.
- GitHub Pages build/deployment thành công, website và catalog trả **HTTP 200**; ảnh local, 45 lĩnh vực và hash route `/login` đã được mở bằng trình duyệt thật.

## Kiến trúc và quy ước

`Api → Application → Domain`; `Infrastructure → Application/Domain`. Controller mỏng, nghiệp vụ trong service, truy cập SQL qua `IDataStore`. EF Code First, UTC, enum lưu chuỗi, FK Restrict, RowVersion của yêu cầu, không API xóa cứng. API lỗi ProblemDetails kèm `code`, `errors`, `correlationId`. Frontend hiển thị tiếng Việt, thời gian Asia/Ho_Chi_Minh.

### Các quyết định đã áp dụng

- Một vai trò/tài khoản, một Helper/yêu cầu, không thanh toán/quyên góp tiền, không email OTP hoặc gửi email.
- 45 danh mục/8 nhóm được mở rộng theo yêu cầu mới, Admin được thêm/sửa/tạm dừng. Những danh mục cũ giữ nguyên ID.
- Tin nhắn/ảnh giữ không giới hạn trong MVP; cần quyết định thời hạn lưu trước khi vận hành chính thức.
- Avatar ≤2 MB, ảnh chat ≤5 MB; JPEG/PNG/WebP, GUID filenames, lưu ngoài web root.
- Contact chỉ có trong phiên Active. Tài khoản khóa và đổi mật khẩu thu hồi JWT; mở khóa không phục hồi token cũ.
- Báo cáo Pending → Reviewing → Resolved/Rejected, bước cuối có thể kèm hành động kiểm duyệt trong cùng transaction.
- API có rate limits: login/register 5/phút/IP, messages 30/phút/user, reports 10/phút/user. Test tăng giới hạn login/register để không ảnh hưởng việc kiểm tra chức năng.
- React Router 6 theo đặc tả. `npm audit` hiện báo 2 cảnh báo moderate của nhánh Router 6; đường dẫn quay lại được giới hạn nội bộ, không SSR/hydration. Không tự thay Router 7 trái stack đã chốt.

## Sao lưu

Backup DB hằng ngày, giữ 7 bản hằng ngày và 4 bản hằng tuần; sao chép sang nơi lưu trữ riêng và thử restore định kỳ. Sao lưu cả volume `uploads` cùng database. Tham khảo `scripts/backup.sql`; SQL Server Express dùng Windows Task Scheduler thay SQL Agent. Tần suất/retention là gợi ý vận hành cần chủ hệ thống xác nhận.
