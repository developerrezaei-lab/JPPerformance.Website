using System.Net;
using Microsoft.Extensions.Caching.Memory;
namespace JP.Api;
// Docker service DNS identifies the configured Nginx gateway. Do not trust arbitrary forwarded headers.
// Resolve on demand: API readiness must not depend on web (which waits for API readiness itself).
public sealed class TrustedProxyScheme(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IConfiguration configuration, IMemoryCache cache)
    {
        var host = configuration["Proxy:TrustedProxyHost"];
        var scheme = context.Request.Headers["X-Forwarded-Proto"].ToString();
        if (!string.IsNullOrWhiteSpace(host) && scheme is "https" or "http" && context.Connection.RemoteIpAddress is { } remote)
        {
            IPAddress[] addresses;
            try
            {
                addresses = await cache.GetOrCreateAsync("gateway-addresses:" + host, async entry => {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
                    return await Dns.GetHostAddressesAsync(host, context.RequestAborted);
                }) ?? [];
            }
            catch (System.Net.Sockets.SocketException)
            {
                context.Response.StatusCode = 503;
                await context.Response.WriteAsJsonAsync(new { title = "The sign-in gateway is temporarily unavailable. Please try again." });
                return;
            }
            if (!addresses.Any(address => address.MapToIPv6().Equals(remote.MapToIPv6())))
            {
                // A rolling deployment can replace the web container before the cached DNS entry expires.
                try { addresses = await Dns.GetHostAddressesAsync(host, context.RequestAborted); cache.Set("gateway-addresses:" + host, addresses, TimeSpan.FromSeconds(30)); }
                catch (System.Net.Sockets.SocketException) { addresses = []; }
            }
            if (addresses.Any(address => address.MapToIPv6().Equals(remote.MapToIPv6()))) context.Request.Scheme = scheme;
        }
        await next(context);
    }
}
