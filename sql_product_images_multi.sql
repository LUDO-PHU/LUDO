IF OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ProductImages] (
        [Id] int NOT NULL IDENTITY(1,1),
        [ProductId] int NOT NULL,
        [ImageUrl] nvarchar(max) NOT NULL,
        [AltText] nvarchar(max) NOT NULL DEFAULT N'',
        [IsPrimary] bit NOT NULL DEFAULT 0,
        [SortOrder] int NOT NULL DEFAULT 0,
        [CreatedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_ProductImages] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductImages_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF COL_LENGTH(N'[dbo].[ProductImages]', N'SortOrder') IS NULL
BEGIN
    ALTER TABLE [dbo].[ProductImages]
    ADD [SortOrder] int NOT NULL CONSTRAINT [DF_ProductImages_SortOrder] DEFAULT 0;
END;
GO

IF COL_LENGTH(N'[dbo].[ProductImages]', N'CreatedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[ProductImages]
    ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_ProductImages_CreatedAt] DEFAULT SYSUTCDATETIME();
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = N'IX_ProductImages_ProductId'
      AND [object_id] = OBJECT_ID(N'[dbo].[ProductImages]')
)
BEGIN
    CREATE INDEX [IX_ProductImages_ProductId] ON [dbo].[ProductImages] ([ProductId]);
END;
GO

INSERT INTO [dbo].[ProductImages] ([ProductId], [ImageUrl], [AltText], [IsPrimary], [SortOrder], [CreatedAt])
SELECT p.[Id], p.[ImageUrl], p.[NameVi], CAST(1 AS bit), 0, SYSUTCDATETIME()
FROM [dbo].[Products] AS p
WHERE p.[ImageUrl] IS NOT NULL
  AND LTRIM(RTRIM(p.[ImageUrl])) <> N''
  AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[ProductImages] AS pi
      WHERE pi.[ProductId] = p.[Id]
        AND LOWER(pi.[ImageUrl]) = LOWER(p.[ImageUrl])
  );
GO

;WITH ranked AS (
    SELECT
        [Id],
        ROW_NUMBER() OVER (PARTITION BY [ProductId] ORDER BY [IsPrimary] DESC, [SortOrder], [Id]) AS [RowNo]
    FROM [dbo].[ProductImages]
)
UPDATE pi
SET [IsPrimary] = CASE WHEN ranked.[RowNo] = 1 THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END,
    [SortOrder] = CASE WHEN ranked.[RowNo] = 1 THEN 0 ELSE ranked.[RowNo] - 1 END
FROM [dbo].[ProductImages] AS pi
INNER JOIN ranked ON ranked.[Id] = pi.[Id];
GO
