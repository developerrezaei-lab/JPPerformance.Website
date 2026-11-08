using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Diagnostics.HealthChecks;
namespace JP.Api;
public sealed class CacheHealth(IDistributedCache cache) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try { await cache.SetStringAsync("readiness", "ok", new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) }, cancellationToken); return HealthCheckResult.Healthy(); }
        catch (Exception) { return HealthCheckResult.Unhealthy("Cache unavailable"); }
    }
}
