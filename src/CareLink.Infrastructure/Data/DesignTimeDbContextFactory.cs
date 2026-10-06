using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace CareLink.Infrastructure.Data;
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<CareLinkDbContext>
{
    public CareLinkDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Default") ?? throw new InvalidOperationException("Set ConnectionStrings__Default to apply migrations.");
        return new CareLinkDbContext(new DbContextOptionsBuilder<CareLinkDbContext>().UseSqlServer(connection).Options);
    }
}
