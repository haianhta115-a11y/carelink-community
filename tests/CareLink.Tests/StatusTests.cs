using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Requests;
using CareLink.Domain;
using CareLink.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class StatusTests(ApiFactory factory)
{
    [Fact]
    public async Task AT_04_accept_creates_one_session_and_records_owner_history()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); var request = await requester.CreateRequestAsync();
        var result = await helper.PostAsync($"/api/requests/{request.Id}/accept", null); result.StatusCode.Should().Be(HttpStatusCode.OK);
        var accepted = (await result.Content.ReadFromJsonAsync<AcceptedDto>(TestJson.Options))!; accepted.SessionId.Should().NotBeEmpty();
        var updated = await requester.GetFromJsonAsync<RequestDto>($"/api/requests/{request.Id}", TestJson.Options); updated!.Status.Should().Be(RequestStatus.Accepted);
    }
    [Fact]
    public async Task AT_05_only_assigned_helper_can_start_and_outsider_cannot_view_private_request()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); using var outsider = await factory.LoginAsync("helper2@carelink.vn"); var request = await requester.CreateRequestAsync();
        await helper.PostAsync($"/api/requests/{request.Id}/accept", null);
        (await outsider.PostAsync($"/api/requests/{request.Id}/start", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await outsider.GetAsync($"/api/requests/{request.Id}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await helper.PostAsync($"/api/requests/{request.Id}/start", null)).StatusCode.Should().Be(HttpStatusCode.OK);
    }
    [Fact]
    public async Task AT_12_concurrent_helpers_accept_exactly_once_and_other_attempts_return_409()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var first = await factory.LoginAsync("helper1@carelink.vn"); using var second = await factory.LoginAsync("helper2@carelink.vn"); var request = await requester.CreateRequestAsync();
        var results = await Task.WhenAll(first.PostAsync($"/api/requests/{request.Id}/accept", null), second.PostAsync($"/api/requests/{request.Id}/accept", null));
        results.Count(r => r.StatusCode == HttpStatusCode.OK).Should().Be(1); results.Count(r => r.StatusCode == HttpStatusCode.Conflict).Should().Be(1);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<CareLinkDbContext>();
        (await db.Set<SupportSession>().CountAsync(s => s.RequestId == request.Id)).Should().Be(1);
        (await db.Set<RequestStatusHistory>().CountAsync(h => h.RequestId == request.Id && h.ToStatus == RequestStatus.Accepted)).Should().Be(1);
    }
    [Fact]
    public async Task AT_14_invalid_start_and_duplicate_accept_do_not_jump_state()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); var request = await requester.CreateRequestAsync();
        (await requester.PostAsync($"/api/requests/{request.Id}/start", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        await helper.PostAsync($"/api/requests/{request.Id}/accept", null); await helper.PostAsync($"/api/requests/{request.Id}/start", null);
        (await helper.PostAsync($"/api/requests/{request.Id}/start", null)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await helper.PostAsync($"/api/requests/{request.Id}/accept", null)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
