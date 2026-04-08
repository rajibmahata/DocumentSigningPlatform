using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace DocumentSigning.Infrastructure.Persistence;

/// <summary>
/// Used only by EF Core design-time tooling (dotnet ef migrations add / database update).
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(
            "Server=RAJIB;Database=DocumentSigningDb;User Id=sa;Password=rajib;TrustServerCertificate=True;",
            sql => sql.MigrationsAssembly("DocumentSigning.Infrastructure"));

        return new AppDbContext(optionsBuilder.Options);
    }
}
