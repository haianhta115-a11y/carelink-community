using System.Net;
using System.Net.Http.Json;
using CareLink.Application.Chat;
using CareLink.Application.Requests;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.Http.Connections;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
namespace CareLink.Tests;
[Collection("Database")]
public sealed class ChatTests(ApiFactory factory)
{
    private HubConnection Hub(HttpClient client) => new HubConnectionBuilder().WithUrl("https://localhost/hubs/chat", options => { options.Transports = HttpTransportType.LongPolling; options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler(); options.AccessTokenProvider = () => Task.FromResult(client.DefaultRequestHeaders.Authorization?.Parameter); }).AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter())).Build();
    private static MultipartFormDataContent Message(string content) { var form = new MultipartFormDataContent(); form.Add(new StringContent(content), "content"); return form; }
    [Fact]
    public async Task AT_06_two_way_text_image_realtime_read_receipts_and_membership()
    {
        using var requester = await factory.LoginAsync("requester1@carelink.vn"); using var helper = await factory.LoginAsync("helper1@carelink.vn"); using var outsider = await factory.LoginAsync("helper2@carelink.vn"); using var admin = await factory.LoginAsync("admin@carelink.vn");
        var request = await requester.CreateRequestAsync(); var accepted = await helper.PostAsync($"/api/requests/{request.Id}/accept", null); var id = (await accepted.Content.ReadFromJsonAsync<AcceptedDto>(TestJson.Options))!.SessionId;
        await using var hub = Hub(requester); var delivered = new TaskCompletionSource<MessageDto>(TaskCreationOptions.RunContinuationsAsynchronously); hub.On<MessageDto>("ReceiveMessage", message => delivered.TrySetResult(message)); await hub.StartAsync();
        using var body = Message("Xin chào, mình sẵn sàng giúp bạn."); var sent = await helper.PostAsync($"/api/sessions/{id}/messages", body); sent.StatusCode.Should().Be(HttpStatusCode.OK);
        (await delivered.Task.WaitAsync(TimeSpan.FromSeconds(5))).Content.Should().Contain("Xin chào");
        using var reply = Message("Cảm ơn bạn nhiều!"); (await requester.PostAsync($"/api/sessions/{id}/messages", reply)).StatusCode.Should().Be(HttpStatusCode.OK);
        using var photo = Message("Ảnh minh họa"); photo.Add(new ByteArrayContent(Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/bWQAAAAASUVORK5CYII=")), "image", "untrusted.exe");
        var uploaded = await helper.PostAsync($"/api/sessions/{id}/messages", photo); uploaded.StatusCode.Should().Be(HttpStatusCode.OK); var image = (await uploaded.Content.ReadFromJsonAsync<MessageDto>(TestJson.Options))!;
        (await requester.GetAsync(image.ImageUrl)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await outsider.GetAsync(image.ImageUrl)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await outsider.GetAsync($"/api/sessions/{id}/messages")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.GetAsync($"/api/sessions/{id}/messages")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var illegal = Message("Không có quyền"); (await outsider.PostAsync($"/api/sessions/{id}/messages", illegal)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        await requester.PostAsync($"/api/sessions/{id}/messages/read", null);
        var messages = await helper.GetFromJsonAsync<MessagePageDto>($"/api/sessions/{id}/messages", TestJson.Options); messages!.Items.Where(m => m.SenderId == image.SenderId).Should().OnlyContain(m => m.ReadAt != null);
        (await requester.GetAsync("/api/sessions")).StatusCode.Should().Be(HttpStatusCode.OK);
        using var invalid = Message("Ảnh sai"); invalid.Add(new ByteArrayContent("<script>alert(1)</script>"u8.ToArray()), "image", "fake.png"); (await helper.PostAsync($"/api/sessions/{id}/messages", invalid)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    [Fact]
    public async Task AT_15_persisted_messages_recover_after_realtime_disconnection()
    {
        using var requester = await factory.LoginAsync("requester2@carelink.vn"); using var helper = await factory.LoginAsync("helper3@carelink.vn"); var request = await requester.CreateRequestAsync(); var accepted = await helper.PostAsync($"/api/requests/{request.Id}/accept", null); var id = (await accepted.Content.ReadFromJsonAsync<AcceptedDto>(TestJson.Options))!.SessionId;
        await using var hub = Hub(requester); await hub.StartAsync(); await hub.StopAsync();
        using var message = Message("Tin được lưu khi đối phương mất kết nối."); (await helper.PostAsync($"/api/sessions/{id}/messages", message)).StatusCode.Should().Be(HttpStatusCode.OK); await hub.StartAsync();
        var restored = await requester.GetFromJsonAsync<MessagePageDto>($"/api/sessions/{id}/messages", TestJson.Options); restored!.Items.Should().Contain(m => m.Content == "Tin được lưu khi đối phương mất kết nối.");
        await hub.StopAsync();
    }
}
