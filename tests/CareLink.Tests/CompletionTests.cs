using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Chat;
using CareLink.Application.Common;
using CareLink.Application.Requests;
using CareLink.Domain;
using FluentAssertions;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class CompletionTests(ApiFactory factory)
{
    [Fact]
    public async Task AT_07_owner_completes_idempotently_closed_chat_review_and_contacts_are_private()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); using var outsider = await factory.LoginAsync("requester2@carelink.vn"); var request = await requester.CreateRequestAsync();
        (await requester.PostAsync($"/api/requests/{request.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var accepted = await helper.PostAsync($"/api/requests/{request.Id}/accept", null); var id = (await accepted.Content.ReadFromJsonAsync<AcceptedDto>(TestJson.Options))!.SessionId;
        var active = await requester.GetFromJsonAsync<SessionDto>($"/api/sessions/{id}", TestJson.Options); active!.CounterpartPhone.Should().NotBeNull();
        (await requester.PostAsJsonAsync($"/api/sessions/{id}/review", new ReviewInput(5, "Chưa hoàn thành"))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        await helper.PostAsync($"/api/requests/{request.Id}/start", null);
        (await helper.PostAsync($"/api/requests/{request.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await outsider.PostAsync($"/api/requests/{request.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await requester.PostAsync($"/api/requests/{request.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await requester.PostAsync($"/api/requests/{request.Id}/complete", null)).StatusCode.Should().Be(HttpStatusCode.OK);
        var history = await requester.GetFromJsonAsync<List<HistoryDto>>($"/api/requests/{request.Id}/history", TestJson.Options); history!.Count(h => h.ToStatus == RequestStatus.Completed).Should().Be(1);
        var closed = await requester.GetFromJsonAsync<SessionDto>($"/api/sessions/{id}", TestJson.Options); closed!.Status.Should().Be(SessionStatus.Closed); closed.CounterpartPhone.Should().BeNull(); closed.CounterpartAddress.Should().BeNull();
        using var body = new MultipartFormDataContent { { new StringContent("Không thể gửi sau khi đóng"), "content" } }; (await helper.PostAsync($"/api/sessions/{id}/messages", body)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await requester.PostAsJsonAsync($"/api/sessions/{id}/review", new ReviewInput(5, "Rất nhiệt tình, cảm ơn bạn!"))).StatusCode.Should().Be(HttpStatusCode.Created);
        (await requester.PostAsJsonAsync($"/api/sessions/{id}/review", new ReviewInput(4, "Gửi lại"))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var open = await helper.GetFromJsonAsync<PageDto<RequestDto>>("/api/requests?status=Open", TestJson.Options); open!.Items.Should().NotContain(r => r.Id == request.Id);
    }
}
