using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace JP.Api;
public sealed class Member : IdentityUser { public string DisplayName { get; set; } = ""; public DateTime? HealthDataConsentAt { get; set; } }
public sealed class CoachingLink
{
    public int Id { get; set; }
    public string CoachId { get; set; } = "";
    public string StudentId { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
public sealed class CoachSupervision
{
    public int Id { get; set; }
    public string SupervisorId { get; set; } = "";
    public string CoachId { get; set; } = "";
}
public sealed class Measurement
{
    public int Id { get; set; }
    public string StudentId { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public decimal WeightKg { get; set; }
    public decimal? WaistCm { get; set; }
    public Guid RequestId { get; set; }
}
public sealed class TrainingPlan
{
    public int Id { get; set; }
    public string CoachId { get; set; } = "";
    public string StudentId { get; set; } = "";
    public string Title { get; set; } = "";
    public string Kind { get; set; } = "Workout";
    // Snapshot is immutable: a revised plan is a new record, preserving student history.
    public string ContentJson { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
public sealed class ActivityLog
{
    public int Id { get; set; }
    public string StudentId { get; set; } = "";
    public int PlanId { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    public Guid RequestId { get; set; }
}
public sealed class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Kcal100g { get; set; }
    public decimal Protein100g { get; set; }
    public decimal Carbs100g { get; set; }
    public decimal Fat100g { get; set; }
    public string Source { get; set; } = "";
    public string SourceUrl { get; set; } = "https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid";
}
public sealed class MealLog
{
    public int Id { get; set; }
    public string StudentId { get; set; } = "";
    public DateTime RecordedAt { get; set; }
    public string Name { get; set; } = "";
    public string ItemsJson { get; set; } = "";
    public decimal Kcal { get; set; }
    public decimal Protein { get; set; }
    public Guid RequestId { get; set; }
}
public sealed class AppDb(DbContextOptions<AppDb> options) : IdentityDbContext<Member>(options)
{
    public DbSet<CoachSupervision> CoachSupervisions => Set<CoachSupervision>();
    public DbSet<CoachingLink> CoachingLinks => Set<CoachingLink>();
    public DbSet<Measurement> Measurements => Set<Measurement>();
    public DbSet<TrainingPlan> Plans => Set<TrainingPlan>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<MealLog> MealLogs => Set<MealLog>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        foreach (var entity in b.Model.GetEntityTypes())
            foreach (var p in entity.GetProperties().Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            { p.SetPrecision(12); p.SetScale(2); }
        b.Entity<Member>().Property(x => x.Id).HasMaxLength(128);
        foreach (var entity in b.Model.GetEntityTypes())
            foreach (var property in entity.GetProperties().Where(p => p.Name is "UserId" or "CoachId" or "StudentId" or "SupervisorId")) property.SetMaxLength(128);
        b.Entity<CoachSupervision>().HasIndex(x => x.CoachId).IsUnique();
        b.Entity<CoachSupervision>().HasIndex(x => new { x.SupervisorId, x.Id });
        b.Entity<CoachSupervision>().HasOne<Member>().WithMany().HasForeignKey(x => x.CoachId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<CoachSupervision>().HasOne<Member>().WithMany().HasForeignKey(x => x.SupervisorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Member>().Property(x => x.DisplayName).HasMaxLength(80);
        b.Entity<CoachingLink>().HasIndex(x => new { x.CoachId, x.StudentId }).IsUnique();
        b.Entity<CoachingLink>().HasIndex(x => new { x.StudentId, x.Status, x.Id });
        b.Entity<Measurement>().HasIndex(x => new { x.StudentId, x.RecordedAt, x.Id });
        b.Entity<Measurement>().HasIndex(x => new { x.StudentId, x.RequestId }).IsUnique();
        b.Entity<TrainingPlan>().HasIndex(x => new { x.StudentId, x.Id });
        b.Entity<TrainingPlan>().HasIndex(x => new { x.CoachId, x.Id });
        b.Entity<ActivityLog>().HasIndex(x => new { x.StudentId, x.CompletedAt, x.Id });
        b.Entity<ActivityLog>().HasIndex(x => new { x.StudentId, x.RequestId }).IsUnique();
        b.Entity<MealLog>().HasIndex(x => new { x.StudentId, x.RecordedAt, x.Id });
        b.Entity<MealLog>().HasIndex(x => new { x.StudentId, x.RequestId }).IsUnique();
        b.Entity<Food>().Property(x => x.Name).HasMaxLength(160);
        foreach (var e in new[] { typeof(CoachingLink), typeof(Measurement), typeof(TrainingPlan), typeof(ActivityLog), typeof(MealLog) })
        {
            // روابط کاربری در دیتابیس هم محافظت می‌شوند؛ حذف حساب نیازمند فرایند کنترل‌شده است.
            b.Entity(e).HasOne(typeof(Member), null).WithMany().HasForeignKey(e == typeof(CoachingLink) || e == typeof(TrainingPlan) ? "StudentId" : "StudentId").OnDelete(DeleteBehavior.Restrict);
            if (e == typeof(CoachingLink) || e == typeof(TrainingPlan))
                b.Entity(e).HasOne(typeof(Member), null).WithMany().HasForeignKey("CoachId").OnDelete(DeleteBehavior.Restrict);
        }
        b.Entity<ActivityLog>().HasOne<TrainingPlan>().WithMany().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Restrict);
    }
}
public record MeasurementInput(DateTime RecordedAt, decimal WeightKg, decimal? WaistCm, Guid RequestId);
public record FoodPortion(int FoodId, decimal Grams);
public record MealInput(string Name, DateTime RecordedAt, FoodPortion[] Items, Guid RequestId);
public record WorkoutEntry(string ExerciseId, int Sets, int Reps, int RestSeconds);
public record PlanInput(string StudentId, string Title, string Kind, WorkoutEntry[]? Exercises, FoodPortion[]? Foods);
public record PortionSnapshot(int FoodId, string Name, decimal Grams, decimal Kcal, decimal Protein, decimal Carbs, decimal Fat, string Source);
public record MealCalculation(PortionSnapshot[] Items, decimal Kcal, decimal Protein, decimal Carbs, decimal Fat);
