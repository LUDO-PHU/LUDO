/* Supplier/Admin workflow schema patch.
   Safe to run multiple times on SQL Server. */

IF OBJECT_ID(N'[dbo].[Suppliers]', N'U') IS NOT NULL AND COL_LENGTH(N'[dbo].[Suppliers]', N'CategoryId') IS NULL
    ALTER TABLE [dbo].[Suppliers] ADD [CategoryId] int NULL;

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[dbo].[Products]', N'SupplierId') IS NULL ALTER TABLE [dbo].[Products] ADD [SupplierId] int NULL;
    IF COL_LENGTH(N'[dbo].[Products]', N'ImportPrice') IS NULL ALTER TABLE [dbo].[Products] ADD [ImportPrice] decimal(18,2) NOT NULL DEFAULT 0;
    IF COL_LENGTH(N'[dbo].[Products]', N'Specifications') IS NULL ALTER TABLE [dbo].[Products] ADD [Specifications] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Products]', N'Status') IS NULL ALTER TABLE [dbo].[Products] ADD [Status] nvarchar(max) NOT NULL DEFAULT N'InStock';
    IF COL_LENGTH(N'[dbo].[Products]', N'Brand') IS NULL ALTER TABLE [dbo].[Products] ADD [Brand] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Products]', N'Color') IS NULL ALTER TABLE [dbo].[Products] ADD [Color] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Products]', N'Condition') IS NULL ALTER TABLE [dbo].[Products] ADD [Condition] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Products]', N'UpdatedAt') IS NULL ALTER TABLE [dbo].[Products] ADD [UpdatedAt] datetime2 NULL;
END

IF OBJECT_ID(N'[dbo].[Receipts]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[dbo].[Receipts]', N'AdminId') IS NULL ALTER TABLE [dbo].[Receipts] ADD [AdminId] int NULL;
    IF COL_LENGTH(N'[dbo].[Receipts]', N'RequestId') IS NULL ALTER TABLE [dbo].[Receipts] ADD [RequestId] int NULL;
    IF COL_LENGTH(N'[dbo].[Receipts]', N'ReceiptType') IS NULL ALTER TABLE [dbo].[Receipts] ADD [ReceiptType] int NOT NULL DEFAULT 0;
    IF COL_LENGTH(N'[dbo].[Receipts]', N'Specifications') IS NULL ALTER TABLE [dbo].[Receipts] ADD [Specifications] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Receipts]', N'Note') IS NULL ALTER TABLE [dbo].[Receipts] ADD [Note] nvarchar(max) NOT NULL DEFAULT N'';
END

IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'[dbo].[Notifications]', N'SupplierId') IS NULL ALTER TABLE [dbo].[Notifications] ADD [SupplierId] int NULL;
    IF COL_LENGTH(N'[dbo].[Notifications]', N'Type') IS NULL ALTER TABLE [dbo].[Notifications] ADD [Type] nvarchar(max) NOT NULL DEFAULT N'';
    IF COL_LENGTH(N'[dbo].[Notifications]', N'RelatedId') IS NULL ALTER TABLE [dbo].[Notifications] ADD [RelatedId] int NULL;
END

IF OBJECT_ID(N'[dbo].[SupplierRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SupplierRequests](
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_SupplierRequests] PRIMARY KEY,
        [AdminId] int NOT NULL,
        [SupplierId] int NOT NULL,
        [CategoryId] int NOT NULL,
        [ProductId] int NULL,
        [RequestedProductName] nvarchar(max) NOT NULL CONSTRAINT [DF_SupplierRequests_RequestedProductName] DEFAULT N'',
        [Quantity] int NOT NULL,
        [SuggestedPrice] decimal(18,2) NOT NULL,
        [Note] nvarchar(max) NOT NULL CONSTRAINT [DF_SupplierRequests_Note] DEFAULT N'',
        [Status] int NOT NULL CONSTRAINT [DF_SupplierRequests_Status] DEFAULT 0,
        [RejectionReason] nvarchar(max) NOT NULL CONSTRAINT [DF_SupplierRequests_RejectionReason] DEFAULT N'',
        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_SupplierRequests_CreatedAt] DEFAULT SYSUTCDATETIME(),
        [UpdatedAt] datetime2 NULL
    );
END

IF OBJECT_ID(N'[dbo].[StockBatches]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[StockBatches](
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_StockBatches] PRIMARY KEY,
        [ProductId] int NOT NULL,
        [SupplierId] int NOT NULL,
        [ReceiptId] int NULL,
        [QuantityImported] int NOT NULL,
        [QuantityRemaining] int NOT NULL,
        [UnitImportPrice] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_StockBatches_CreatedAt] DEFAULT SYSUTCDATETIME()
    );
END

IF OBJECT_ID(N'[dbo].[RevenueTransactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[RevenueTransactions](
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_RevenueTransactions] PRIMARY KEY,
        [OwnerType] nvarchar(50) NOT NULL,
        [OwnerId] int NULL,
        [Amount] decimal(18,2) NOT NULL,
        [TransactionType] nvarchar(50) NOT NULL,
        [ReferenceType] nvarchar(50) NOT NULL,
        [ReferenceId] int NOT NULL,
        [Note] nvarchar(max) NOT NULL CONSTRAINT [DF_RevenueTransactions_Note] DEFAULT N'',
        [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_RevenueTransactions_CreatedAt] DEFAULT SYSUTCDATETIME()
    );
END

IF OBJECT_ID(N'[dbo].[OrderStockAllocations]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrderStockAllocations](
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_OrderStockAllocations] PRIMARY KEY,
        [OrderDetailId] int NOT NULL,
        [StockBatchId] int NOT NULL,
        [Quantity] int NOT NULL,
        [UnitImportPrice] decimal(18,2) NOT NULL
    );
END

IF OBJECT_ID(N'[dbo].[SupplierRequests]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupplierRequests_SupplierId' AND object_id = OBJECT_ID(N'[dbo].[SupplierRequests]'))
        EXEC(N'CREATE INDEX [IX_SupplierRequests_SupplierId] ON [dbo].[SupplierRequests]([SupplierId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupplierRequests_CategoryId' AND object_id = OBJECT_ID(N'[dbo].[SupplierRequests]'))
        EXEC(N'CREATE INDEX [IX_SupplierRequests_CategoryId] ON [dbo].[SupplierRequests]([CategoryId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupplierRequests_ProductId' AND object_id = OBJECT_ID(N'[dbo].[SupplierRequests]'))
        EXEC(N'CREATE INDEX [IX_SupplierRequests_ProductId] ON [dbo].[SupplierRequests]([ProductId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupplierRequests_Status' AND object_id = OBJECT_ID(N'[dbo].[SupplierRequests]'))
        EXEC(N'CREATE INDEX [IX_SupplierRequests_Status] ON [dbo].[SupplierRequests]([Status])');
END

IF OBJECT_ID(N'[dbo].[StockBatches]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockBatches_ProductId' AND object_id = OBJECT_ID(N'[dbo].[StockBatches]'))
        EXEC(N'CREATE INDEX [IX_StockBatches_ProductId] ON [dbo].[StockBatches]([ProductId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockBatches_SupplierId' AND object_id = OBJECT_ID(N'[dbo].[StockBatches]'))
        EXEC(N'CREATE INDEX [IX_StockBatches_SupplierId] ON [dbo].[StockBatches]([SupplierId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StockBatches_ReceiptId' AND object_id = OBJECT_ID(N'[dbo].[StockBatches]'))
        EXEC(N'CREATE INDEX [IX_StockBatches_ReceiptId] ON [dbo].[StockBatches]([ReceiptId])');
END

IF OBJECT_ID(N'[dbo].[RevenueTransactions]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevenueTransactions_Reference' AND object_id = OBJECT_ID(N'[dbo].[RevenueTransactions]'))
        EXEC(N'CREATE INDEX [IX_RevenueTransactions_Reference] ON [dbo].[RevenueTransactions]([ReferenceId])');
END

IF OBJECT_ID(N'[dbo].[OrderStockAllocations]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderStockAllocations_OrderDetailId' AND object_id = OBJECT_ID(N'[dbo].[OrderStockAllocations]'))
        EXEC(N'CREATE INDEX [IX_OrderStockAllocations_OrderDetailId] ON [dbo].[OrderStockAllocations]([OrderDetailId])');
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrderStockAllocations_StockBatchId' AND object_id = OBJECT_ID(N'[dbo].[OrderStockAllocations]'))
        EXEC(N'CREATE INDEX [IX_OrderStockAllocations_StockBatchId] ON [dbo].[OrderStockAllocations]([StockBatchId])');
END

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[Categories]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[Suppliers]', N'U') IS NOT NULL
BEGIN
DECLARE @DefaultPasswordHash nvarchar(max) = N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
DECLARE @SeedSuppliers TABLE(UserName nvarchar(50), FullName nvarchar(max), Email nvarchar(max), Phone nvarchar(max), CompanyName nvarchar(max), CategoryId int);
INSERT INTO @SeedSuppliers(UserName, FullName, Email, Phone, CompanyName, CategoryId)
VALUES
(N'supplier_screen', N'Supplier Màn hình', N'supplier_screen@econent.com', N'0988300001', N'Công ty Màn hình Econent', 1),
(N'supplier_battery', N'Supplier Pin', N'supplier_battery@econent.com', N'0988300002', N'Công ty Pin Econent', 2),
(N'supplier_camera', N'Supplier Camera', N'supplier_camera@econent.com', N'0988300003', N'Công ty Camera Econent', 3),
(N'supplier_case', N'Supplier Vỏ máy', N'supplier_case@econent.com', N'0988300004', N'Công ty Vỏ máy Econent', 4),
(N'supplier_cable', N'Supplier Cáp', N'supplier_cable@econent.com', N'0988300005', N'Công ty Cáp Econent', 5),
(N'supplier_speaker', N'Supplier Loa', N'supplier_speaker@econent.com', N'0988300006', N'Công ty Loa Econent', 6),
(N'supplier_mainboard', N'Supplier Mainboard', N'supplier_mainboard@econent.com', N'0988300007', N'Công ty Mainboard Econent', 7),
(N'supplier_chip', N'Supplier Chip IC', N'supplier_chip@econent.com', N'0988300008', N'Công ty Chip IC Econent', 8);

INSERT INTO [dbo].[Users]([UserName], [PasswordHash], [FullName], [Email], [Phone], [Role], [IsActive], [CreatedAt])
SELECT seed.UserName, @DefaultPasswordHash, seed.FullName, seed.Email, seed.Phone, 2, 1, SYSUTCDATETIME()
FROM @SeedSuppliers seed
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId)
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Users] u WHERE u.UserName = seed.UserName);

INSERT INTO [dbo].[Suppliers]([UserId], [CompanyName], [ContactName], [Email], [Phone], [Address], [CategoryId], [IsActive], [CreatedAt])
SELECT u.Id, seed.CompanyName, seed.FullName, seed.Email, seed.Phone, N'Việt Nam', seed.CategoryId, 1, SYSUTCDATETIME()
FROM @SeedSuppliers seed
INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId)
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Suppliers] s WHERE s.UserId = u.Id);

UPDATE s
SET s.CategoryId = seed.CategoryId
FROM [dbo].[Suppliers] s
INNER JOIN [dbo].[Users] u ON u.Id = s.UserId
INNER JOIN @SeedSuppliers seed ON seed.UserName = u.UserName
WHERE s.CategoryId IS NULL;

UPDATE s
SET s.CategoryId = 1
FROM [dbo].[Suppliers] s
WHERE s.Id = 1 AND s.CategoryId IS NULL AND EXISTS (SELECT 1 FROM [dbo].[Categories] WHERE Id = 1);

DECLARE @LegacySupplierId int = NULL;
DECLARE @ScreenSupplierId int = NULL;

SELECT TOP 1 @LegacySupplierId = s.Id
FROM [dbo].[Suppliers] s
INNER JOIN [dbo].[Users] u ON u.Id = s.UserId
WHERE u.UserName = N'supplier';

SELECT TOP 1 @ScreenSupplierId = s.Id
FROM [dbo].[Suppliers] s
INNER JOIN [dbo].[Users] u ON u.Id = s.UserId
WHERE u.UserName = N'supplier_screen';

IF @LegacySupplierId IS NOT NULL
   AND @ScreenSupplierId IS NOT NULL
   AND @LegacySupplierId <> @ScreenSupplierId
BEGIN
    IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
        UPDATE [dbo].[Products]
        SET [SupplierId] = @ScreenSupplierId
        WHERE [SupplierId] = @LegacySupplierId;

    IF OBJECT_ID(N'[dbo].[Receipts]', N'U') IS NOT NULL
        UPDATE [dbo].[Receipts]
        SET [SupplierId] = @ScreenSupplierId
        WHERE [SupplierId] = @LegacySupplierId;

    IF OBJECT_ID(N'[dbo].[StockBatches]', N'U') IS NOT NULL
        UPDATE [dbo].[StockBatches]
        SET [SupplierId] = @ScreenSupplierId
        WHERE [SupplierId] = @LegacySupplierId;

    IF OBJECT_ID(N'[dbo].[SupplierRequests]', N'U') IS NOT NULL
        UPDATE [dbo].[SupplierRequests]
        SET [SupplierId] = @ScreenSupplierId
        WHERE [SupplierId] = @LegacySupplierId;

    IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NOT NULL
        UPDATE [dbo].[Notifications]
        SET [SupplierId] = @ScreenSupplierId
        WHERE [SupplierId] = @LegacySupplierId;

    UPDATE [dbo].[Suppliers]
    SET [IsActive] = 0, [UpdatedAt] = SYSUTCDATETIME()
    WHERE [Id] = @LegacySupplierId;

    UPDATE [dbo].[Users]
    SET [IsActive] = 0, [UpdatedAt] = SYSUTCDATETIME()
    WHERE [UserName] = N'supplier';
END

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    UPDATE p
    SET p.SupplierId = s.Id
    FROM [dbo].[Products] p
    OUTER APPLY (
        SELECT TOP 1 sp.Id
        FROM [dbo].[Suppliers] sp
        WHERE sp.CategoryId = p.CategoryId AND sp.IsActive = 1
        ORDER BY sp.Id
    ) s
    WHERE s.Id IS NOT NULL
      AND (
          p.SupplierId IS NULL
          OR NOT EXISTS (
              SELECT 1 FROM [dbo].[Suppliers] currentSupplier
              WHERE currentSupplier.Id = p.SupplierId
                AND currentSupplier.CategoryId = p.CategoryId
          )
      );
END

IF OBJECT_ID(N'[dbo].[StockBatches]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[StockBatches]([ProductId], [SupplierId], [ReceiptId], [QuantityImported], [QuantityRemaining], [UnitImportPrice], [CreatedAt])
    SELECT p.Id, COALESCE(p.SupplierId, s.Id), NULL, p.Stock, p.Stock, p.ImportPrice, p.CreatedAt
    FROM [dbo].[Products] p
    OUTER APPLY (
        SELECT TOP 1 sp.Id
        FROM [dbo].[Suppliers] sp
        WHERE sp.CategoryId = p.CategoryId AND sp.IsActive = 1
        ORDER BY sp.Id
    ) s
    WHERE p.Stock > 0
      AND COALESCE(p.SupplierId, s.Id) IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM [dbo].[StockBatches] b WHERE b.ProductId = p.Id);
END
END
