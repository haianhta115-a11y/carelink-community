using CareLink.Domain;
using CareLink.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
namespace CareLink.Tests;

[Collection("Database")]
public sealed class DataTests(ApiFactory factory)
{
    [Fact]
    public async Task Seed_and_schema_preserve_relational_constraints_and_all_four_states()
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<CareLinkDbContext>();
        (await db.Set<Category>().CountAsync()).Should().BeGreaterThanOrEqualTo(45);
        (await db.Set<SupportRequest>().CountAsync()).Should().BeGreaterThanOrEqualTo(25);
        (await db.Set<SupportRequest>().Select(r => r.Status).Distinct().CountAsync()).Should().Be(4);
        db.Model.FindEntityType(typeof(SupportSession))!.GetIndexes().Should().Contain(i => i.IsUnique && i.Properties.Any(p => p.Name == "RequestId"));
        db.Model.FindEntityType(typeof(SupportRequest))!.FindProperty("RowVersion")!.IsConcurrencyToken.Should().BeTrue();
    }
}
