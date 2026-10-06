using CareLink.Application.Common;
using CareLink.Infrastructure.Data;
using CareLink.Infrastructure.Services;
using CareLink.Infrastructure.Auth;
using CareLink.Application.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CareLink.Infrastructure;
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connection = config.GetConnectionString("Default") ?? throw new InvalidOperationException("Set ConnectionStrings__Default before starting CareLink.");
        services.AddDbContext<CareLinkDbContext>(options => options.UseSqlServer(connection));
        services.AddScoped<IDataStore, SqlDataStore>(); services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>(); services.AddSingleton<IFileStorage, LocalFileStorage>();
        services.AddMemoryCache(); services.AddSingleton<AccountCache>(); services.AddSingleton<IAccountCache>(s => s.GetRequiredService<AccountCache>());
        services.AddScoped<ITokenService, JwtTokenService>();
        return services;
    }
}
