using System.Net.Http.Json;
using CareLink.Application.Auth;
using CareLink.Application.Requests;
using CareLink.Domain;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
namespace CareLink.Tests;
public static class ApiTestHelpers
{
    public static async Task<HttpClient> LoginAsync(this ApiFactory factory, string email)
    {
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var result = await client.PostAsJsonAsync("/api/auth/login", new { email, password = email.StartsWith("admin") ? "Admin@12345" : "Demo@12345" });
        result.EnsureSuccessStatusCode(); var auth = (await result.Content.ReadFromJsonAsync<AuthDto>(TestJson.Options))!;
        client.DefaultRequestHeaders.Authorization = new("Bearer", auth.Token); return client;
    }
    public static async Task<RequestDto> CreateRequestAsync(this HttpClient client, string? title = null)
    {
        var result = await client.PostAsJsonAsync("/api/requests", new CreateRequestInput(title ?? "Yêu cầu kiểm thử " + Guid.NewGuid().ToString("N"), "Đây là mô tả đủ chi tiết cho một yêu cầu hỗ trợ được tạo trong kiểm thử tích hợp.", 1, "Hà Nội, Cầu Giấy", Urgency.High));
        result.StatusCode.Should().Be(System.Net.HttpStatusCode.Created); return (await result.Content.ReadFromJsonAsync<RequestDto>(TestJson.Options))!;
    }
}
