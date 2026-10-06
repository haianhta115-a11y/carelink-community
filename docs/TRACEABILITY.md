# Ma trận yêu cầu → mã nguồn → kiểm thử

| Yêu cầu | Mã nguồn chính | Xác minh |
|---|---|---|
| F01 Đăng ký | Application/Auth/AuthService.cs, AuthValidators.cs; web/src/pages/AuthPages.tsx | AuthTests.AT_01, auth.test.tsx |
| F02 JWT | Infrastructure/Auth/JwtTokenService.cs, AccountCache.cs; Api/Program.cs | AuthTests.AT_09 |
| F03 Hồ sơ | Application/Auth/ProfileService.cs; web/src/pages/ProfilePage.tsx | AuthTests.AT_08, AT_09; Playwright |
| F04 Tạo yêu cầu | Application/Requests/RequestService.cs; NewRequestPage.tsx | RequestTests.AT_02 |
| F05 Xem yêu cầu | RequestService.AuthorizeAsync/GetAsync/ListAsync; RequestDetailPage.tsx | RequestTests.AT_13, StatusTests.AT_05 |
| F06 Tìm kiếm/lọc | RequestService.ListAsync; FilterBar.tsx, RequestsPage.tsx | RequestTests.AT_03, requests.test.tsx |
| F07 Nhận hỗ trợ | RequestStatusService.AcceptAsync; SqlDataStore.TryTransitionAsync | StatusTests.AT_04, AT_12 |
| F08 Trạng thái | RequestStatusService.StartAsync; RequestActions.tsx | StatusTests.AT_05, AT_14; actions.test.ts |
| F09 Chat/ảnh/đã xem | Application/Chat/ChatService.cs, SessionService.cs; Api/Hubs/ChatHub.cs; ChatPanel.tsx | ChatTests.AT_06, AT_15; Playwright |
| F10 Hoàn thành/review | RequestStatusService.CompleteAsync; ReviewService.cs; ReviewPanel.tsx | CompletionTests.AT_07 |
| ADM-01 Tài khoản | AdminService.UsersAsync | AdminTests.AT_10 |
| ADM-02 Kiểm duyệt | AdminService.HideAsync; RequestStatusService.ForceCompleteAsync | AdminTests.Moderation_reports_and_admin_exception_are_atomic_and_audited |
| ADM-03 Báo cáo | ReportService.cs, AdminService.ResolveAsync; AdminReportDetailPage.tsx | AdminTests moderation; Playwright |
| ADM-04 Khóa/mở khóa | AdminService.LockAsync; AccountCache.cs; ConnectionRegistry | AdminTests.AT_10 |
| ADM-05 Backend policy | Api/Controllers/AdminController.cs; AdminOnly policy | AdminTests.AT_10, CatalogTests |
| Mở rộng 45 lĩnh vực | CategoryCatalog.cs, CategoryService.cs; CategoryExplorer.tsx, AdminCategoriesPage.tsx | CatalogTests; Playwright |
| Tổng quan cá nhân | CommunityService.SummaryAsync; PersonalOverview.tsx | CatalogTests; Playwright |
| NFR-SEC-01 HTTPS | Program.cs; web/nginx.conf; deploy/Caddyfile | Cấu hình production, cần máy chủ để xác minh HTTPS triển khai |
| NFR-SEC-02/03 JWT/BCrypt | JwtTokenService, BCryptPasswordHasher | AuthTests.AT_08, AT_09 |
| NFR-SEC-04 Quyền | RequestService/SessionService + AdminOnly | AT_05, AT_06, AT_10, AT_13 |
| NFR-SEC-05 Upload | LocalFileStorage.cs | ChatTests.AT_06 kiểm tra giả PNG và ảnh riêng tư |
| NFR-SEC-06 Input | FluentValidation, EF LINQ, React escaped text | AT_01, AT_02, AT_03, AT_06 |
| NFR-DATA-01/02 | CareLinkDbContext, Migrations, transaction, RowVersion | DataTests, AT_12 |
| NFR-REL-01 ProblemDetails | ExceptionMiddleware.cs, api/client.ts, locales/vi.ts | errors.test.ts; các test mã lỗi |
| NFR-REL-02 Atomicity | SqlDataStore.AtomicAsync + conditional updates | AT_12, moderation test |
| NFR-PRIV-01 | PublicUserDto, SessionService.GetAsync | AT_08, AT_06, AT_07 |
| NFR-AUD-01 | AuditLog, RequestStatusHistory, AdminService | AdminTests; timeline AT_07 |
| NFR-UI-01/02 + AT-11 | Responsive CSS, bottom nav, modal, skeleton/empty states | web/e2e/carelink.spec.ts (360/768/1280), Vitest |
| NFR-COMP-01 | React/Vite + standard browser APIs | Chrome Playwright; Edge/Firefox chưa chạy thực tế |
| NFR-LOG-01 | Serilog, exception correlationId | BootstrapTests; logs không ghi body/secret |
| NFR-MAINT-01 | Clean Architecture, TS strict, ESLint, Prettier | dotnet build, npm run build/lint |
| NFR-DATA-03 Backup | README.md, scripts/backup.sql | Tài liệu; restore thực tế cần môi trường backup |

`src/` là gốc các đường dẫn backend trong bảng. Kết quả trình duyệt nằm ở `artifacts/e2e-results.json` và ảnh chụp trong `artifacts/` sau khi chạy kiểm thử.
