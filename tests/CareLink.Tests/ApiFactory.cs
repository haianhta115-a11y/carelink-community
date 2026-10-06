using CareLink.Application.Common;
using CareLink.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.MsSql;

namespace CareLink.Tests;
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private MsSqlContainer? container;
    private string connection = "";
    public string JwtKey { get; } = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    public async Task InitializeAsync()
    {
        var existing = Environment.GetEnvironmentVariable("CARELINK_TEST_SQL");
        if (string.IsNullOrWhiteSpace(existing))
        {
            container = new MsSqlBuilder().WithImage("mcr.microsoft.com/mssql/server:2022-latest").Build();
            await container.StartAsync(); existing = container.GetConnectionString();
        }
        var builder = new SqlConnectionStringBuilder(existing) { InitialCatalog = "CareLinkTests_" + Guid.NewGuid().ToString("N") };
        connection = builder.ConnectionString;
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CareLinkDbContext>();
        await db.Database.MigrateAsync();
        await SeedData.RunAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher>(), scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>());
    }
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", connection);
        builder.UseSetting("Jwt:Key", JwtKey);
        builder.UseSetting("RateLimits:login", "10000"); builder.UseSetting("RateLimits:register", "10000");
    }
    async Task IAsyncLifetime.DisposeAsync()
    {
        using (var scope = Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<CareLinkDbContext>().Database.EnsureDeletedAsync();
        await base.DisposeAsync();
        if (container is not null) await container.DisposeAsync();
    }
}
[CollectionDefinition("Database", DisableParallelization = true)]
public sealed class DatabaseCollection : ICollectionFixture<ApiFactory>;
