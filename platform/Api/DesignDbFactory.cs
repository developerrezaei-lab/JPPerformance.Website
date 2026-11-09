using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace JP.Api;
// Migration generation does not need production secrets or a live database.
public sealed class DesignDbFactory : IDesignTimeDbContextFactory<AppDb>
{
    public AppDb CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<AppDb>().UseSqlServer("Server=localhost;Database=JPPerformance;Integrated Security=true;TrustServerCertificate=false").Options);
}
