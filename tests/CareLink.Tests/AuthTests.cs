using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using CareLink.Application.Auth;
using CareLink.Domain;
using CareLink.Infrastructure.Data;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
namespace CareLink.Tests;

[Collection("Database")]
public sealed class AuthTests(ApiFactory factory)
{
    private HttpClient Client() => factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
    [Fact]
    public async Task AT_01_registration_login_duplicate_and_admin_role_validation()
    {
        using var client = Client(); var email = Guid.NewGuid() + "@example.vn";
        var input = new RegisterInput("Nguyễn Kiểm Thử", email, "Test@12345", "Test@12345", UserRole.Requester, null);
        (await client.PostAsJsonAsync("/api/auth/register", input)).StatusCode.Should().Be(HttpStatusCode.Created);
        (await client.PostAsJsonAsync("/api/auth/register", input)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await client.PostAsJsonAsync("/api/auth/register", input with { Email = "admin" + email, Role = UserRole.Admin })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Test@12345" });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await login.Content.ReadFromJsonAsync<AuthDto>(TestJson.Options); auth!.User.Role.Should().Be(UserRole.Requester);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
    [Fact]
    public async Task AT_08_password_is_bcrypt_only_and_public_profile_never_contains_private_fields()
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<CareLinkDbContext>();
        var user = await db.Set<User>().SingleAsync(u => u.Email == "helper1@carelink.vn");
        user.PasswordHash.Should().StartWith("$2a$12$"); BCrypt.Net.BCrypt.Verify("Demo@12345", user.PasswordHash).Should().BeTrue();
        db.Model.FindEntityType(typeof(User))!.GetProperties().Should().NotContain(p => p.Name == "Password");
        using var client = Client(); var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = "Demo@12345" });
        var auth = (await login.Content.ReadFromJsonAsync<AuthDto>(TestJson.Options))!; client.DefaultRequestHeaders.Authorization = new("Bearer", auth.Token);
        var json = await client.GetStringAsync($"/api/users/{user.Id}/public"); json.Should().NotContain("passwordHash").And.NotContain("phone").And.NotContain("address");
    }
    [Fact]
    public async Task AT_09_missing_invalid_expired_tokens_and_password_change_revoke_previous_session()
    {
        using var client = Client(); (await client.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new("Bearer", "invalid"); (await client.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var expired = new JwtSecurityToken("CareLink", "CareLink.Web", expires: DateTime.UtcNow.AddMinutes(-2), signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(factory.JwtKey)), SecurityAlgorithms.HmacSha256));
        client.DefaultRequestHeaders.Authorization = new("Bearer", new JwtSecurityTokenHandler().WriteToken(expired)); (await client.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var email = Guid.NewGuid() + "@example.vn"; await client.PostAsJsonAsync("/api/auth/register", new RegisterInput("Người Đổi Mật Khẩu", email, "Test@12345", "Test@12345", UserRole.Helper, null));
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Test@12345" }); var old = (await login.Content.ReadFromJsonAsync<AuthDto>(TestJson.Options))!;
        client.DefaultRequestHeaders.Authorization = new("Bearer", old.Token);
        var changed = await client.PutAsJsonAsync("/api/profile/password", new PasswordInput("Test@12345", "New@12345", "New@12345")); changed.StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var updated = (await changed.Content.ReadFromJsonAsync<AuthDto>(TestJson.Options))!; client.DefaultRequestHeaders.Authorization = new("Bearer", updated.Token);
        (await client.GetAsync("/api/profile")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
