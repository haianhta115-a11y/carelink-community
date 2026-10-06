# Đưa CareLink lên mạng và vận hành liên tục

## Bản public hiện tại

Giao diện được đưa lên GitHub Pages. Người dùng đã chọn chưa có hosting backend; bản Pages hiển thị rõ trạng thái này. Không có đăng nhập giả, chat giả hoặc dữ liệu người dùng thật trên Pages. Bản đầy đủ (API/SQL/chat/Admin) chạy local và có mã nguồn để triển khai.

### Build và cập nhật Pages

Trong `web`, dùng Node 22.22 trở lên:

```powershell
$env:VITE_PUBLIC_PREVIEW="true"
$env:VITE_ROUTER_MODE="hash"
$env:VITE_SOURCE_URL="https://github.com/haianhta115-a11y/carelink-community"
npm ci
npm run build -- --base=/carelink-community/
npx gh-pages -d dist -b gh-pages
```

Ở Settings → Pages, chọn deploy từ branch `gh-pages`, thư mục `/`. Hash routing giúp đường dẫn React và nút refresh dùng được trên hosting tĩnh.

## Backend đầy đủ 24/24

GitHub Pages không chạy ASP.NET/SignalR/SQL Server. Dùng VPS/server đang chạy liên tục hoặc Azure App Service với Always On + Azure SQL. Dịch vụ free có sleep không đáp ứng yêu cầu chạy liên tục.

### VPS với Docker

1. Chuẩn bị VPS có Docker Compose, khuyến nghị ≥4 GB RAM cho API + SQL Server. Domain trỏ đến VPS; mở cổng 80/443, không mở SQL ra Internet.
2. Clone kho mã nguồn. Tạo `.env` với `SQL_PASSWORD`, `JWT_KEY` (≥32 byte ngẫu nhiên), `ADMIN_PASSWORD` riêng. Không commit `.env`.
3. Chạy Docker Compose trong repo để build các service. Trước khi nhận người dùng thật, cấu hình API ở `Production`, áp migrations bằng EF CLI hoặc migration bundle, bootstrap tài khoản Admin với BCrypt cost 12; không seed tài khoản Demo.
4. Đặt Caddy/Nginx HTTPS phía trước API. Tham khảo `deploy/Caddyfile`. Chỉ expose reverse proxy; các container DB/API trên network riêng. Cấu hình forwarded headers và origin cụ thể cho deployment thực tế.
5. Đặt `Cors__Origins__0=https://haianhta115-a11y.github.io` trong API (origin không gồm đường dẫn repo). Dùng `restart: unless-stopped`, volume SQL/uploads bền vững, kiểm tra `/health` và backup.
6. Build lại frontend với URL API thật:

```powershell
$env:VITE_API_URL="https://YOUR_API_DOMAIN"
$env:VITE_PUBLIC_PREVIEW="false"
$env:VITE_ROUTER_MODE="hash"
npm run build -- --base=/carelink-community/
npx gh-pages -d dist -b gh-pages
```

Biến `VITE_*` là thông tin public; tuyệt đối không đặt JWT signing key, SQL password hay Admin password vào biến frontend.

Khi API được cấu hình, `/login`, `/requests`, `/sessions` và `/admin` dùng cùng backend thật. AuthImage gửi Bearer để tải ảnh riêng tư; SignalR dùng JWT với origin HTTPS tương ứng.

## Azure

Đưa API lên App Service hỗ trợ .NET 10, bật Always On/WebSockets, kết nối Azure SQL bằng secret/manged identity phù hợp. Cấu hình JWT issuer/audience/key, CORS origin, migration trước phát hành và storage bền vững cho uploads. GitHub có thể làm nguồn triển khai qua Deployment Center hoặc GitHub Actions sau khi tài khoản Azure được cấp quyền.

## Xác minh sau triển khai

- HTTPS `/health` trả 200 và DB khỏe.
- Đăng ký → tạo → nhận → bắt đầu → text/ảnh/read receipt → hoàn thành → đánh giá.
- User thường gọi `/api/admin/**` trả 403; Admin không đọc chat.
- Khóa tài khoản chặn JWT cũ; backup SQL và uploads ở nơi riêng; phục hồi thử trước khi vận hành.
