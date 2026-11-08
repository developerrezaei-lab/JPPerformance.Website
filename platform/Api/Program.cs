using System.Security.Claims;
using System.Text.Json;
using System.Threading.RateLimiting;
using JP.Api;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

if (args.Contains("--healthcheck")) {
    using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    try { var response = await client.GetAsync("http://127.0.0.1:8080/readyz"); Environment.Exit(response.IsSuccessStatusCode ? 0 : 1); }
    catch { Environment.Exit(1); }
    return;
}
var builder = WebApplication.CreateBuilder(args);
var sqlite = builder.Configuration.GetValue<bool>("Database:UseSqlite");
if (sqlite && !builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
    throw new InvalidOperationException("SQLite is for development/tests only. Production requires SQL Server.");
builder.Services.AddDbContext<AppDb>(o => {
    var connection = builder.Configuration.GetConnectionString("Database") ?? (sqlite ? "Data Source=data/platform.db" : throw new InvalidOperationException("ConnectionStrings__Database is required."));
    if (sqlite) o.UseSqlite(connection); else o.UseSqlServer(connection, sql => sql.EnableRetryOnFailure(3));
});
builder.Services.AddIdentityApiEndpoints<Member>(o => {
    o.Password.RequiredLength = 12;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    o.User.RequireUniqueEmail = true;
}).AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDb>();
builder.Services.ConfigureApplicationCookie(o => {
    o.Cookie.Name = "jp.member"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing") ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = TimeSpan.FromHours(8); o.SlidingExpiration = true;
});
builder.Services.Configure<Microsoft.AspNetCore.Authentication.BearerToken.BearerTokenOptions>(IdentityConstants.BearerScheme, o => {
    o.BearerTokenExpiration = TimeSpan.FromMinutes(20); o.RefreshTokenExpiration = TimeSpan.FromDays(7);
});
builder.Services.AddAntiforgery(o => {
    o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "jp.csrf"; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing") ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});
var protection = builder.Services.AddDataProtection().SetApplicationName("JPPerformance.Platform.v1");
var keyPath = builder.Configuration["DataProtection:Path"];
if (!string.IsNullOrWhiteSpace(keyPath)) protection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));
if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing") && string.IsNullOrWhiteSpace(keyPath))
    throw new InvalidOperationException("Persistent DataProtection__Path is required in production.");
var redis = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redis)) {
    if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing")) throw new InvalidOperationException("ConnectionStrings__Redis is required in production.");
    builder.Services.AddDistributedMemoryCache();
} else builder.Services.AddStackExchangeRedisCache(o => { o.Configuration = redis; o.InstanceName = "jp-platform:"; });
builder.Services.AddAuthorization();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks().AddDbContextCheck<AppDb>().AddCheck<CacheHealth>("cache");
builder.Services.AddRateLimiter(o => {
    o.RejectionStatusCode = 429;
    // Login attempts are also locked by account in Identity, independent of IP.
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = builder.Environment.IsEnvironment("Testing") ? 2000 : 120, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddPolicy("api", ctx => RateLimitPartition.GetTokenBucketLimiter(ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anonymous", _ => new TokenBucketRateLimiterOptions { TokenLimit = 120, TokensPerPeriod = 120, ReplenishmentPeriod = TimeSpan.FromMinutes(1), AutoReplenishment = true, QueueLimit = 0 }));
});
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 64 * 1024);
var app = builder.Build();
app.UseExceptionHandler();
app.Use(async (ctx, next) => {
    try { await next(); }
    catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteExtendedErrorCode: 2067 } || e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 }) {
        ctx.Response.StatusCode = 409;
        await ctx.Response.WriteAsJsonAsync(new { title = "This record already exists. Refresh to see the saved result." });
    }
});
app.Use(async (ctx, next) => {
    ctx.Response.Headers.CacheControl = "no-store";
    ctx.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});
app.UseAuthentication();
app.Use(async (ctx, next) => {
    if (ctx.Request.Path == "/api/v1/auth/register" && app.Environment.IsProduction() && !app.Configuration.GetValue<bool>("Membership:AllowPublicRegistration")) {
        var users = ctx.RequestServices.GetRequiredService<UserManager<Member>>();
        if (!await HasRole(ctx.User, "Admin", users)) { ctx.Response.StatusCode = 403; await ctx.Response.WriteAsJsonAsync(new { title = "Public registration is not open yet." }); return; }
    }
    await next();
});
app.UseAuthorization();
app.UseRateLimiter();
app.Use(async (ctx, next) => {
    if (ctx.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method)) {
        // Mobile clients use a validated bearer token. The mere presence of a header cannot bypass CSRF.
        var bearer = ctx.Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? await ctx.AuthenticateAsync(IdentityConstants.BearerScheme) : null;
        if (bearer?.Succeeded != true) {
            try { await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx); }
            catch (AntiforgeryValidationException) { ctx.Response.StatusCode = 400; await ctx.Response.WriteAsJsonAsync(new { title = "Session verification expired. Refresh the page and try again." }); return; }
        }
    }
    await next();
});
app.MapGet("/healthz", () => Results.Ok(new { status = "alive" }));
app.MapHealthChecks("/readyz");
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing")) app.MapOpenApi("/api/openapi/{documentName}.json");
var api = app.MapGroup("/api/v1").RequireRateLimiting("api");
api.MapGet("/auth/csrf", (HttpContext ctx, IAntiforgery csrf) => Results.Ok(new { token = csrf.GetAndStoreTokens(ctx).RequestToken }));
// Microsoft's Identity endpoints support HttpOnly web cookies and opaque bearer + refresh tokens for mobile.
api.MapGroup("/auth").RequireRateLimiting("auth").MapIdentityApi<Member>();
api.MapPost("/auth/logout", async (HttpContext ctx) => { await ctx.SignOutAsync(IdentityConstants.ApplicationScheme); return Results.NoContent(); }).RequireAuthorization();
api.MapGet("/me", async (ClaimsPrincipal p, UserManager<Member> users) => {
    var user = await users.GetUserAsync(p);
    return user is null ? Results.Unauthorized() : Results.Ok(new { user.Id, user.Email, user.DisplayName, user.HealthDataConsentAt, roles = await users.GetRolesAsync(user) });
}).RequireAuthorization();
api.MapPut("/me", async (ProfileInput input, ClaimsPrincipal p, UserManager<Member> users) => {
    if (string.IsNullOrWhiteSpace(input.DisplayName) || input.DisplayName.Length > 80) return Invalid("Enter a display name of 1–80 characters.");
    var user = await users.GetUserAsync(p); if (user is null) return Results.Unauthorized();
    user.DisplayName = input.DisplayName.Trim();
    if (input.HealthDataConsent) user.HealthDataConsentAt ??= DateTime.UtcNow; await users.UpdateAsync(user); return Results.NoContent();
}).RequireAuthorization();
api.MapGet("/catalog/exercises", async (IDistributedCache cache, IWebHostEnvironment env, CancellationToken ct) => {
    var json = await cache.GetStringAsync("exercises:v1", ct);
    if (json is null) { json = await File.ReadAllTextAsync(Path.Combine(env.ContentRootPath, "Catalog/exercises.json"), ct); await cache.SetStringAsync("exercises:v1", json, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1) }, ct); }
    return Results.Content(json, "application/json");
});
api.MapGet("/catalog/foods", async (string? q, int? after, int? take, AppDb db, CancellationToken ct) => {
    if (q?.Length > 100) return Invalid("Search is limited to 100 characters.");
    var query = db.Foods.AsNoTracking().Where(x => x.Id > (after ?? 0));
    if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Name.Contains(q));
    return Results.Ok(await query.OrderBy(x => x.Id).Take(Math.Clamp(take ?? 30, 1, 100)).ToArrayAsync(ct));
});
api.MapPost("/nutrition/calculate", async (FoodPortion[] portions, AppDb db, CancellationToken ct) => {
    var result = await Calculate(portions, db, ct); return result is null ? Invalid("Choose 1–30 known foods, each between 0 and 5,000 grams.") : Results.Ok(result);
});
var member = api.MapGroup("").RequireAuthorization();
member.AddEndpointFilter(async (context, next) => {
    var path = context.HttpContext.Request.Path.Value ?? "";
    if (HttpMethods.IsPost(context.HttpContext.Request.Method) && (path.EndsWith("/measurements") || path.EndsWith("/meals"))) {
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDb>();
        var id = UserId(context.HttpContext.User);
        if (!await db.Users.AnyAsync(x => x.Id == id && x.HealthDataConsentAt != null)) return Invalid("Please give explicit health-data consent in your member profile first.");
    }
    return await next(context);
});
member.MapPost("/measurements", async (MeasurementInput input, ClaimsPrincipal p, AppDb db, CancellationToken ct) => {
    if (input.RequestId == Guid.Empty || input.WeightKg < 20 || input.WeightKg > 400 || input.WaistCm is < 30 or > 250 || !ValidDate(input.RecordedAt)) return Invalid("Check date, weight (20–400 kg) and optional waist (30–250 cm).");
    var id = UserId(p);
    var existing = await db.Measurements.FirstOrDefaultAsync(x => x.StudentId == id && x.RequestId == input.RequestId, ct);
    if (existing is not null) return Results.Ok(existing);
    var entity = new Measurement { StudentId = id, RecordedAt = input.RecordedAt.ToUniversalTime(), WeightKg = input.WeightKg, WaistCm = input.WaistCm, RequestId = input.RequestId };
    db.Add(entity); await db.SaveChangesAsync(ct); return Results.Ok(entity);
});
member.MapGet("/progress", async (string? studentId, int? days, ClaimsPrincipal p, UserManager<Member> users, AppDb db, CancellationToken ct) => {
    var target = studentId ?? UserId(p);
    if (!await CanRead(p, target, users, db, ct)) return Results.NotFound();
    var from = DateTime.UtcNow.AddDays(-Math.Clamp(days ?? 90, 7, 366));
    var measurements = await db.Measurements.AsNoTracking().Where(x => x.StudentId == target && x.RecordedAt >= from).OrderByDescending(x => x.RecordedAt).ThenByDescending(x => x.Id).Take(1000).Select(x => new { x.Id, x.RecordedAt, x.WeightKg, x.WaistCm }).ToArrayAsync(ct);
    var workouts = await db.ActivityLogs.AsNoTracking().Where(x => x.StudentId == target && x.CompletedAt >= from).OrderByDescending(x => x.Id).Take(1000).Select(x => new { x.Id, x.PlanId, x.CompletedAt }).ToArrayAsync(ct);
    var meals = await db.MealLogs.AsNoTracking().Where(x => x.StudentId == target && x.RecordedAt >= from).OrderByDescending(x => x.Id).Take(1000).Select(x => new { x.Id, x.RecordedAt, x.Name, x.Kcal, x.Protein }).ToArrayAsync(ct);
    return Results.Ok(new { measurements = measurements.OrderBy(x => x.RecordedAt).ThenBy(x => x.Id), workouts, meals, days = Math.Clamp(days ?? 90, 7, 366), limitPerSeries = 1000 });
});
member.MapGet("/links", async (int? before, ClaimsPrincipal p, AppDb db, CancellationToken ct) => {
    var id = UserId(p);
    return Results.Ok(await (from l in db.CoachingLinks.AsNoTracking() join c in db.Users on l.CoachId equals c.Id join s in db.Users on l.StudentId equals s.Id where (l.CoachId == id || l.StudentId == id) && l.Id < (before ?? int.MaxValue) orderby l.Id descending select new { l.Id, l.CoachId, l.StudentId, l.Status, coachName = c.DisplayName == "" ? c.Email : c.DisplayName, studentName = s.DisplayName == "" ? s.Email : s.DisplayName }).Take(100).ToArrayAsync(ct));
});
member.MapPost("/links", async (InviteInput input, ClaimsPrincipal p, UserManager<Member> users, AppDb db, CancellationToken ct) => {
    if (!await HasRole(p, "Coach", users)) return Results.Forbid();
    var student = await users.FindByEmailAsync(input.Email ?? ""); var id = UserId(p);
    if (student is null || student.Id == id) return Invalid("Ask the student to register first, then check their email address.");
    var link = await db.CoachingLinks.FirstOrDefaultAsync(x => x.CoachId == id && x.StudentId == student.Id, ct);
    if (link is not null) return Results.Conflict(new { title = "A relationship already exists. The student can manage it in their dashboard." });
    link = new CoachingLink { CoachId = id, StudentId = student.Id }; db.Add(link); await db.SaveChangesAsync(ct); return Results.Ok(new { link.Id });
});
member.MapPut("/links/{id:int}", async (int id, LinkInput input, ClaimsPrincipal p, AppDb db, CancellationToken ct) => {
    var own = UserId(p); var link = await db.CoachingLinks.FirstOrDefaultAsync(x => x.Id == id && x.StudentId == own, ct);
    if (link is null) return Results.NotFound();
    if (input.Status is not ("Active" or "Declined" or "Revoked")) return Invalid("Choose Active, Declined or Revoked.");
    link.Status = input.Status; await db.SaveChangesAsync(ct); return Results.NoContent();
});
member.MapGet("/plans", async (string? studentId, int? after, int? take, ClaimsPrincipal p, UserManager<Member> users, AppDb db, CancellationToken ct) => {
    var target = studentId ?? UserId(p);
    if (!await CanRead(p, target, users, db, ct)) return Results.NotFound();
    return Results.Ok(await db.Plans.AsNoTracking().Where(x => x.StudentId == target && x.Id > (after ?? 0)).OrderBy(x => x.Id).Take(Math.Clamp(take ?? 50, 1, 100)).ToArrayAsync(ct));
});
member.MapPost("/plans", async (PlanInput input, ClaimsPrincipal p, UserManager<Member> users, AppDb db, IWebHostEnvironment env, CancellationToken ct) => {
    if (!await HasRole(p, "Coach", users)) return Results.Forbid();
    var own = UserId(p);
    if (!await db.CoachingLinks.AnyAsync(x => x.CoachId == own && x.StudentId == input.StudentId && x.Status == "Active", ct)) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Length > 120) return Invalid("Give the plan a title of 1–120 characters.");
    string content;
    if (input.Kind == "Workout") {
        var exercises = input.Exercises;
        if (exercises is null || exercises.Length is < 1 or > 30 || exercises.Any(x => x is null || x.Sets is < 1 or > 10 || x.Reps is < 1 or > 100 || x.RestSeconds is < 0 or > 600)) return Invalid("Add 1–30 exercises with valid sets, repetitions and rest.");
        using var catalog = JsonDocument.Parse(await File.ReadAllTextAsync(Path.Combine(env.ContentRootPath, "Catalog/exercises.json"), ct));
        var known = catalog.RootElement.EnumerateArray().Select(x => x.GetProperty("id").GetString()).ToHashSet();
        if (exercises.Any(x => !known.Contains(x.ExerciseId))) return Invalid("Unknown exercise.");
        content = JsonSerializer.Serialize(exercises, JsonSerializerOptions.Web);
    } else if (input.Kind == "Nutrition") {
        var calculated = await Calculate(input.Foods, db, ct); if (calculated is null) return Invalid("Choose valid food portions.");
        content = JsonSerializer.Serialize(calculated, JsonSerializerOptions.Web);
    } else return Invalid("Choose Workout or Nutrition.");
    var plan = new TrainingPlan { CoachId = own, StudentId = input.StudentId, Title = input.Title.Trim(), Kind = input.Kind, ContentJson = content };
    db.Add(plan); await db.SaveChangesAsync(ct); return Results.Ok(plan);
});
member.MapPost("/plans/{id:int}/complete", async (int id, RequestInput input, ClaimsPrincipal p, AppDb db, CancellationToken ct) => {
    if (input.RequestId == Guid.Empty) return Invalid("A request ID is required.");
    var own = UserId(p);
    if (!await db.Plans.AnyAsync(x => x.Id == id && x.StudentId == own && x.Kind == "Workout", ct)) return Results.NotFound();
    if (await db.ActivityLogs.AnyAsync(x => x.StudentId == own && x.RequestId == input.RequestId, ct)) return Results.NoContent();
    db.Add(new ActivityLog { StudentId = own, PlanId = id, RequestId = input.RequestId }); await db.SaveChangesAsync(ct); return Results.NoContent();
});
member.MapPost("/meals", async (MealInput input, ClaimsPrincipal p, AppDb db, CancellationToken ct) => {
    if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Length > 100 || !ValidDate(input.RecordedAt) || input.RequestId == Guid.Empty) return Invalid("Check the meal name and date.");
    var own = UserId(p);
    if (await db.MealLogs.AnyAsync(x => x.StudentId == own && x.RequestId == input.RequestId, ct)) return Results.NoContent();
    var result = await Calculate(input.Items, db, ct); if (result is null) return Invalid("Choose valid food portions.");
    db.Add(new MealLog { StudentId = own, Name = input.Name.Trim(), RecordedAt = input.RecordedAt.ToUniversalTime(), RequestId = input.RequestId, ItemsJson = JsonSerializer.Serialize(result, JsonSerializerOptions.Web), Kcal = result.Kcal, Protein = result.Protein });
    await db.SaveChangesAsync(ct); return Results.NoContent();
});
member.MapGet("/admin/members", async (string? q, int? after, ClaimsPrincipal p, UserManager<Member> users, AppDb db, CancellationToken ct) => {
    if (!await HasRole(p, "Admin", users)) return Results.Forbid();
    if (q?.Length > 100) return Invalid("Search is limited to 100 characters.");
    var query = db.Users.AsNoTracking(); if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Email != null && x.Email.Contains(q));
    var page = await query.OrderBy(x => x.Id).Skip(Math.Clamp(after ?? 0, 0, 1000000)).Take(30).ToArrayAsync(ct);
    var result = new List<object>(); foreach (var u in page) result.Add(new { u.Id, u.Email, u.DisplayName, roles = await users.GetRolesAsync(u) });
    return Results.Ok(result);
});
member.MapPut("/admin/members/{id}/coach", async (string id, CoachInput input, ClaimsPrincipal p, UserManager<Member> users) => {
    if (!await HasRole(p, "Admin", users)) return Results.Forbid();
    var user = await users.FindByIdAsync(id); if (user is null) return Results.NotFound();
    var isCoach = await users.IsInRoleAsync(user, "Coach");
    if (input.Enabled && !isCoach) await users.AddToRoleAsync(user, "Coach");
    else if (!input.Enabled && isCoach) await users.RemoveFromRoleAsync(user, "Coach");
    await users.UpdateSecurityStampAsync(user); return Results.NoContent();
});
using (var scope = app.Services.CreateScope()) {
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    if (sqlite) { Directory.CreateDirectory("data"); await db.Database.EnsureCreatedAsync(); }
    if (args.Contains("--migrate")) { if (!sqlite) await db.Database.MigrateAsync(); await SeedCatalog(db); return; }
    // Production schema is migrated explicitly before startup, never by every replica.
    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Coach", "Admin" }) if (!await roles.RoleExistsAsync(role)) await roles.CreateAsync(new IdentityRole(role));
    if (sqlite) await SeedCatalog(db);
    if (args.Contains("--bootstrap-admin")) {
        var email = builder.Configuration["Bootstrap:Email"] ?? throw new InvalidOperationException("Bootstrap__Email required.");
        var password = builder.Configuration["Bootstrap:Password"] ?? throw new InvalidOperationException("Bootstrap__Password required.");
        var users = scope.ServiceProvider.GetRequiredService<UserManager<Member>>();
        if (await users.GetUsersInRoleAsync("Admin") is { Count: > 0 }) throw new InvalidOperationException("An administrator already exists. Bootstrap is one-time only.");
        var u = await users.FindByEmailAsync(email);
        if (u is not null) throw new InvalidOperationException("Use a new admin email, not an existing public account.");
        u = new Member { UserName = email, Email = email, DisplayName = "Platform administrator" };
        var created = await users.CreateAsync(u, password); if (!created.Succeeded) throw new InvalidOperationException(string.Join("; ", created.Errors.Select(e => e.Description)));
        await users.AddToRoleAsync(u, "Admin"); return;
    }
}
app.Run();

static string UserId(ClaimsPrincipal p) => p.FindFirstValue(ClaimTypes.NameIdentifier)!;
static IResult Invalid(string message) => Results.Problem(message, statusCode: 400, title: "Please check your input");
static bool ValidDate(DateTime date) => date.Kind != DateTimeKind.Unspecified && date <= DateTime.UtcNow.AddMinutes(5) && date >= DateTime.UtcNow.AddYears(-2);
static async Task<bool> HasRole(ClaimsPrincipal p, string role, UserManager<Member> users) {
    var user = await users.GetUserAsync(p); return user is not null && await users.IsInRoleAsync(user, role);
}
static async Task<bool> CanRead(ClaimsPrincipal p, string target, UserManager<Member> users, AppDb db, CancellationToken ct) {
    var own = UserId(p);
    return target == own || (await HasRole(p, "Coach", users) && await db.CoachingLinks.AnyAsync(x => x.CoachId == own && x.StudentId == target && x.Status == "Active", ct));
}
static async Task<MealCalculation?> Calculate(FoodPortion[]? portions, AppDb db, CancellationToken ct) {
    if (portions is null || portions.Length is < 1 or > 30 || portions.Any(x => x is null || x.Grams <= 0 || x.Grams > 5000)) return null;
    var ids = portions.Select(x => x.FoodId).Distinct().ToArray(); var foods = await db.Foods.AsNoTracking().Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
    if (foods.Count != ids.Length) return null;
    var items = portions.Select(p => { var f = foods[p.FoodId]; var factor = p.Grams / 100m; return new PortionSnapshot(f.Id, f.Name, p.Grams, decimal.Round(f.Kcal100g * factor, 2), decimal.Round(f.Protein100g * factor, 2), decimal.Round(f.Carbs100g * factor, 2), decimal.Round(f.Fat100g * factor, 2), f.Source); }).ToArray();
    return new MealCalculation(items, items.Sum(x => x.Kcal), items.Sum(x => x.Protein), items.Sum(x => x.Carbs), items.Sum(x => x.Fat));
}
static async Task SeedCatalog(AppDb db) {
    if (await db.Foods.AnyAsync()) return;
    var foods = JsonSerializer.Deserialize<Food[]>(await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Catalog/foods.json")), JsonSerializerOptions.Web)!;
    db.Foods.AddRange(foods); await db.SaveChangesAsync();
}
public record ProfileInput(string DisplayName, bool HealthDataConsent);
public record InviteInput(string Email);
public record LinkInput(string Status);
public record RequestInput(Guid RequestId);
public record CoachInput(bool Enabled);
public partial class Program { }
