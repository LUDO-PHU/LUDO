/*
    Order flow safety script for SQL Server.
    Run this against the real BaseCoreSales database if the Orders table was created
    before ConfirmedAt, DeliveredAt, or CancelledAt existed.

    Enum values used by the current backend:
      Pending = 0
      Confirmed = 1   -- legacy, shown as Shipping
      Shipping = 2
      Delivered = 3   -- legacy, shown as Shipping
      Completed = 4
      CancelledByUser = 5   -- legacy, shown as Cancelled
      CancelledByAdmin = 6  -- legacy, shown as Cancelled
      Rejected = 7          -- legacy, shown as Cancelled
      Cancelled = 8
*/

IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[dbo].[Orders]', N'ConfirmedAt') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [ConfirmedAt] datetime2 NULL;

    IF COL_LENGTH(N'[dbo].[Orders]', N'DeliveredAt') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [DeliveredAt] datetime2 NULL;

    IF COL_LENGTH(N'[dbo].[Orders]', N'CancelledAt') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CancelledAt] datetime2 NULL;

    IF COL_LENGTH(N'[dbo].[Orders]', N'ShippingAt') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [ShippingAt] datetime2 NULL;

    IF COL_LENGTH(N'[dbo].[Orders]', N'CompletedAt') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CompletedAt] datetime2 NULL;

    IF COL_LENGTH(N'[dbo].[Orders]', N'CancelReason') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CancelReason] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_CancelReason] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'CustomerName') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CustomerName] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_CustomerName] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'CustomerPhone') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [CustomerPhone] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_CustomerPhone] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'ShippingAddress') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [ShippingAddress] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_ShippingAddress] DEFAULT N'';

    IF COL_LENGTH(N'[dbo].[Orders]', N'Note') IS NULL
        ALTER TABLE [dbo].[Orders] ADD [Note] nvarchar(max) NOT NULL CONSTRAINT [DF_Orders_Note] DEFAULT N'';

    IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'[dbo].[Orders]')
          AND c.name = N'Status'
          AND t.name IN (N'int', N'tinyint', N'smallint', N'bigint')
    )
    BEGIN
        UPDATE [dbo].[Orders]
        SET [Status] = 2,
            [ConfirmedAt] = COALESCE([ConfirmedAt], [CreatedAt]),
            [ShippingAt] = COALESCE([ShippingAt], [ConfirmedAt], [CreatedAt])
        WHERE [Status] IN (1, 3);

        UPDATE [dbo].[Orders]
        SET [Status] = 8,
            [CancelledAt] = COALESCE([CancelledAt], [CreatedAt])
        WHERE [Status] IN (5, 6, 7);
    END

    IF EXISTS (
        SELECT 1
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID(N'[dbo].[Orders]')
          AND c.name = N'Status'
          AND t.name IN (N'nvarchar', N'varchar', N'nchar', N'char')
    )
    BEGIN
        UPDATE [dbo].[Orders]
        SET [Status] = N'Shipping',
            [ConfirmedAt] = COALESCE([ConfirmedAt], [CreatedAt]),
            [ShippingAt] = COALESCE([ShippingAt], [ConfirmedAt], [CreatedAt])
        WHERE [Status] IN (N'Confirmed', N'Delivered');

        UPDATE [dbo].[Orders]
        SET [Status] = N'Cancelled',
            [CancelledAt] = COALESCE([CancelledAt], [CreatedAt])
        WHERE [Status] IN (N'CancelledByUser', N'CancelledByAdmin', N'Rejected');
    END
END
GO
