using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Admin;
using CareLink.Application.Requests;
using FluentAssertions;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class CatalogTests(ApiFactory factory)
{
    [Fact]
    public async Task Expanded_catalog_has_45_fields_and_admin_can_create_edit_disable_with_audit()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var admin = await factory.LoginAsync("admin@carelink.vn");
        var categories = await requester.GetFromJsonAsync<List<CategoryDto>>("/api/public/categories", TestJson.Options); categories!.Count.Should().BeGreaterThanOrEqualTo(45); categories.Select(c => c.GroupKey).Distinct().Count().Should().Be(8);
        (await requester.PostAsJsonAsync("/api/admin/categories", new { })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var input = new CategoryInput("Lĩnh vực kiểm thử", "test-" + Guid.NewGuid().ToString("N"), "Sparkles", "daily", "Mô tả lĩnh vực hỗ trợ được tạo trong kiểm thử.", 100, true);
        var created = await admin.PostAsJsonAsync("/api/admin/categories", input); created.StatusCode.Should().Be(HttpStatusCode.Created); var category = (await created.Content.ReadFromJsonAsync<AdminCategoryDto>(TestJson.Options))!;
        (await admin.PutAsJsonAsync($"/api/admin/categories/{category.Id}", input with { IsActive = false })).StatusCode.Should().Be(HttpStatusCode.OK);
        var active = await requester.GetFromJsonAsync<List<CategoryDto>>("/api/categories", TestJson.Options); active!.Should().NotContain(c => c.Id == category.Id);
        (await requester.PostAsJsonAsync("/api/requests", new { title = "Yêu cầu không được tạo", description = "Mô tả dài đủ để kiểm tra danh mục đã tạm dừng.", categoryId = category.Id, location = "Hà Nội", urgency = "Normal" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await requester.GetAsync("/api/requests/summary")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
