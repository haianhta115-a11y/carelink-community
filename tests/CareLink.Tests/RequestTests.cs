using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Common;
using CareLink.Application.Requests;
using CareLink.Domain;
using FluentAssertions;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class RequestTests(ApiFactory factory)
{
    [Fact]
    public async Task AT_02_create_request_with_authenticated_owner_and_validation()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); var request = await requester.CreateRequestAsync();
        request.Status.Should().Be(RequestStatus.Open); request.Requester.FullName.Should().Be("Nguyễn Minh Anh");
        (await requester.PostAsJsonAsync("/api/requests", new { title = "abc", description = "short", categoryId = 1, location = "HN", urgency = "High" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var helper = await factory.LoginAsync("helper1@carelink.vn"); (await helper.PostAsJsonAsync("/api/requests", new { })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
    [Fact]
    public async Task AT_03_combined_filters_and_empty_search_follow_visibility_and_pagination()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); var keyword = "Filter" + Guid.NewGuid().ToString("N"); await requester.CreateRequestAsync(keyword);
        using var helper = await factory.LoginAsync("helper1@carelink.vn");
        var result = await helper.GetFromJsonAsync<PageDto<RequestDto>>($"/api/requests?keyword={keyword}&categoryId=1&location=H%C3%A0%20N%E1%BB%99i&urgency=High", TestJson.Options);
        result!.TotalItems.Should().Be(1); result.Items.Single().Status.Should().Be(RequestStatus.Open);
        var empty = await helper.GetFromJsonAsync<PageDto<RequestDto>>($"/api/requests?keyword={keyword}&categoryId=2", TestJson.Options); empty!.Items.Should().BeEmpty();
        (await helper.GetAsync("/api/requests?pageSize=999")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    [Fact]
    public async Task AT_13_hidden_request_and_private_history_cannot_be_accessed_by_id()
    {
        using var helper = await factory.LoginAsync("helper1@carelink.vn"); using var requester = await factory.LoginAsync("requester1@carelink.vn"); var request = await requester.CreateRequestAsync();
        (await helper.GetAsync($"/api/requests/{request.Id}/history")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await helper.GetAsync($"/api/requests/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
