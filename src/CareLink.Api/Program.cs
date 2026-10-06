using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using System.Text;
using CareLink.Api.Auth;
using CareLink.Application.Auth;
using CareLink.Application.Requests;
using CareLink.Application.Chat;
using CareLink.Application.Admin;
using CareLink.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using CareLink.Infrastructure.Auth;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using CareLink.Api.Middleware;
using CareLink.Application.Common;
using CareLink.Infrastructure;
using CareLink.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
var key = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Set Jwt__Key to a random secret of at least 32 bytes.");
if (Encoding.UTF8.GetByteCount(key) < 32) throw new InvalidOperationException("Jwt__Key must have at least 32 bytes.");
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<AuthService>(); builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<RequestService>();
builder.Services.AddScoped<CommunityService>();
builder.Services.AddScoped<RequestStatusService>();
builder.Services.AddScoped<SessionService>(); builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<ReviewService>();
builder.Services.AddScoped<AdminService>(); builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddSignalR().AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSingleton<IUserIdProvider, SubjectUserIdProvider>(); builder.Services.AddSingleton<ConnectionRegistry>(); builder.Services.AddSingleton<IRealtimeEvents, RealtimeEvents>();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterValidator>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters { ValidateIssuer = true, ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidateAudience = true, ValidAudience = builder.Configuration["Jwt:Audience"], ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30), NameClaimType = "name", RoleClaimType = "role", ValidAlgorithms = [SecurityAlgorithms.HmacSha256] };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context => { if (context.HttpContext.Request.Path.StartsWithSegments("/hubs") && context.Request.Query.TryGetValue("access_token", out var token)) context.Token = token; return Task.CompletedTask; },
        OnTokenValidated = async context =>
        {
            if (!Guid.TryParse(context.Principal?.FindFirst("sub")?.Value, out var id) || !int.TryParse(context.Principal?.FindFirst("ver")?.Value, out var version) || !await context.HttpContext.RequestServices.GetRequiredService<AccountCache>().ValidateAsync(context.HttpContext.RequestServices.GetRequiredService<CareLinkDbContext>(), id, version)) context.Fail("Session invalid.");
        },
        OnChallenge = async context => { context.HandleResponse(); context.Response.StatusCode = 401; await context.Response.WriteAsJsonAsync(new ProblemDetails { Status = 401, Title = "Bạn cần đăng nhập lại.", Extensions = { ["code"] = "UNAUTHORIZED" } }); },
        OnForbidden = async context => { context.Response.StatusCode = 403; await context.Response.WriteAsJsonAsync(new ProblemDetails { Status = 403, Title = "Bạn không có quyền thực hiện thao tác này.", Extensions = { ["code"] = "FORBIDDEN" } }); }
    };
});
builder.Services.AddAuthorization(options => options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin")));
builder.Host.UseSerilog((context, config) => config.ReadFrom.Configuration(context.Configuration).Enrich.FromLogContext().WriteTo.Console());
builder.Services.AddControllers().AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<ApiBehaviorOptions>(options => options.InvalidModelStateResponseFactory = context =>
{
    var problem = new ValidationProblemDetails(context.ModelState) { Status = 400, Title = "Dữ liệu chưa hợp lệ." };
    problem.Extensions["code"] = "VALIDATION_ERROR";
    return new BadRequestObjectResult(problem);
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "CareLink API", Version = "v1", Description = "Kết nối để không ai bị bỏ lại phía sau. Mọi thời gian ở UTC; các bộ lọc kết hợp bằng AND." });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", Description = "Nhập JWT từ /api/auth/login." });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] });
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173"]).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails { Status = 429, Title = "Bạn thao tác quá nhanh. Vui lòng chờ một phút.", Extensions = { ["code"] = "RATE_LIMITED" } }, token);
    };
    foreach (var (name, limit) in new[] { ("login", 5), ("register", 5), ("messages", 30), ("reports", 10) })
        options.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimits:" + name, limit), Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks().AddDbContextCheck<CareLinkDbContext>();
var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CareLinkDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.RunAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>(), app.Configuration);
}
app.UseMiddleware<ExceptionMiddleware>();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers.XFrameOptions = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing")) { app.UseHsts(); app.UseHttpsRedirection(); }
app.UseSerilogRequestLogging();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat", options => options.CloseOnAuthenticationExpiration = true);
app.MapHealthChecks("/health");
app.Run();
public partial class Program;
