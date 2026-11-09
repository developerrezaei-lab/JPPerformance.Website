using Microsoft.EntityFrameworkCore;
namespace JP.Api;
public static class DevelopmentSchema
{
    // SQLite is development-only. Add the new supervision table without dropping older local records.
    // Production SQL Server uses its versioned EF migration instead.
    public static Task UpgradeSqlite(AppDb db) => db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "CoachSupervisions" (
            "Id" INTEGER NOT NULL CONSTRAINT "PK_CoachSupervisions" PRIMARY KEY AUTOINCREMENT,
            "SupervisorId" TEXT NOT NULL,
            "CoachId" TEXT NOT NULL,
            CONSTRAINT "FK_CoachSupervisions_AspNetUsers_CoachId" FOREIGN KEY ("CoachId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT,
            CONSTRAINT "FK_CoachSupervisions_AspNetUsers_SupervisorId" FOREIGN KEY ("SupervisorId") REFERENCES "AspNetUsers" ("Id") ON DELETE RESTRICT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_CoachSupervisions_CoachId" ON "CoachSupervisions" ("CoachId");
        CREATE INDEX IF NOT EXISTS "IX_CoachSupervisions_SupervisorId_Id" ON "CoachSupervisions" ("SupervisorId", "Id");
        """);
}
