IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetRoles] (
        [Id] nvarchar(450) NOT NULL,
        [Name] nvarchar(256) NULL,
        [NormalizedName] nvarchar(256) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetUsers] (
        [Id] nvarchar(128) NOT NULL,
        [DisplayName] nvarchar(80) NOT NULL,
        [HealthDataConsentAt] datetime2 NULL,
        [UserName] nvarchar(256) NULL,
        [NormalizedUserName] nvarchar(256) NULL,
        [Email] nvarchar(256) NULL,
        [NormalizedEmail] nvarchar(256) NULL,
        [EmailConfirmed] bit NOT NULL,
        [PasswordHash] nvarchar(max) NULL,
        [SecurityStamp] nvarchar(max) NULL,
        [ConcurrencyStamp] nvarchar(max) NULL,
        [PhoneNumber] nvarchar(max) NULL,
        [PhoneNumberConfirmed] bit NOT NULL,
        [TwoFactorEnabled] bit NOT NULL,
        [LockoutEnd] datetimeoffset NULL,
        [LockoutEnabled] bit NOT NULL,
        [AccessFailedCount] int NOT NULL,
        CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [Foods] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(160) NOT NULL,
        [Kcal100g] decimal(12,2) NOT NULL,
        [Protein100g] decimal(12,2) NOT NULL,
        [Carbs100g] decimal(12,2) NOT NULL,
        [Fat100g] decimal(12,2) NOT NULL,
        [Source] nvarchar(max) NOT NULL,
        [SourceUrl] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Foods] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetRoleClaims] (
        [Id] int NOT NULL IDENTITY,
        [RoleId] nvarchar(450) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetUserClaims] (
        [Id] int NOT NULL IDENTITY,
        [UserId] nvarchar(128) NOT NULL,
        [ClaimType] nvarchar(max) NULL,
        [ClaimValue] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetUserLogins] (
        [LoginProvider] nvarchar(450) NOT NULL,
        [ProviderKey] nvarchar(450) NOT NULL,
        [ProviderDisplayName] nvarchar(max) NULL,
        [UserId] nvarchar(128) NOT NULL,
        CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
        CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetUserRoles] (
        [UserId] nvarchar(128) NOT NULL,
        [RoleId] nvarchar(450) NOT NULL,
        CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
        CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [AspNetUserTokens] (
        [UserId] nvarchar(128) NOT NULL,
        [LoginProvider] nvarchar(450) NOT NULL,
        [Name] nvarchar(450) NOT NULL,
        [Value] nvarchar(max) NULL,
        CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
        CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [CoachingLinks] (
        [Id] int NOT NULL IDENTITY,
        [CoachId] nvarchar(128) NOT NULL,
        [StudentId] nvarchar(128) NOT NULL,
        [Status] nvarchar(450) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CoachingLinks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CoachingLinks_AspNetUsers_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_CoachingLinks_AspNetUsers_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [MealLogs] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] nvarchar(128) NOT NULL,
        [RecordedAt] datetime2 NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [ItemsJson] nvarchar(max) NOT NULL,
        [Kcal] decimal(12,2) NOT NULL,
        [Protein] decimal(12,2) NOT NULL,
        [RequestId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_MealLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MealLogs_AspNetUsers_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [Measurements] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] nvarchar(128) NOT NULL,
        [RecordedAt] datetime2 NOT NULL,
        [WeightKg] decimal(12,2) NOT NULL,
        [WaistCm] decimal(12,2) NULL,
        [RequestId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_Measurements] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Measurements_AspNetUsers_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [Plans] (
        [Id] int NOT NULL IDENTITY,
        [CoachId] nvarchar(128) NOT NULL,
        [StudentId] nvarchar(128) NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [Kind] nvarchar(max) NOT NULL,
        [ContentJson] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Plans] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Plans_AspNetUsers_CoachId] FOREIGN KEY ([CoachId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Plans_AspNetUsers_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE TABLE [ActivityLogs] (
        [Id] int NOT NULL IDENTITY,
        [StudentId] nvarchar(128) NOT NULL,
        [PlanId] int NOT NULL,
        [CompletedAt] datetime2 NOT NULL,
        [RequestId] uniqueidentifier NOT NULL,
        CONSTRAINT [PK_ActivityLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ActivityLogs_AspNetUsers_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ActivityLogs_Plans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [Plans] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_ActivityLogs_PlanId] ON [ActivityLogs] ([PlanId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_ActivityLogs_StudentId_CompletedAt_Id] ON [ActivityLogs] ([StudentId], [CompletedAt], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ActivityLogs_StudentId_RequestId] ON [ActivityLogs] ([StudentId], [RequestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CoachingLinks_CoachId_StudentId] ON [CoachingLinks] ([CoachId], [StudentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_CoachingLinks_StudentId_Status_Id] ON [CoachingLinks] ([StudentId], [Status], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_MealLogs_StudentId_RecordedAt_Id] ON [MealLogs] ([StudentId], [RecordedAt], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MealLogs_StudentId_RequestId] ON [MealLogs] ([StudentId], [RequestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_Measurements_StudentId_RecordedAt_Id] ON [Measurements] ([StudentId], [RecordedAt], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Measurements_StudentId_RequestId] ON [Measurements] ([StudentId], [RequestId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_Plans_CoachId_Id] ON [Plans] ([CoachId], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    CREATE INDEX [IX_Plans_StudentId_Id] ON [Plans] ([StudentId], [Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261108115819_InitialPlatform'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261108115819_InitialPlatform', N'10.0.14');
END;

COMMIT;
GO

