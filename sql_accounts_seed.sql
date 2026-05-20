/* Seed/reset real SQL accounts for Admin, User and one Supplier per category.
   Password for seeded accounts: 123456
   Role values in dbo.Users: Admin = 0, User = 1, Supplier = 2.
   Safe to run multiple times. */

SET NOCOUNT ON;

DECLARE @DefaultPasswordHash nvarchar(max) = N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
BEGIN
    RAISERROR('Missing table dbo.Users', 16, 1);
    RETURN;
END

IF OBJECT_ID(N'[dbo].[Suppliers]', N'U') IS NULL
BEGIN
    RAISERROR('Missing table dbo.Suppliers', 16, 1);
    RETURN;
END

IF OBJECT_ID(N'[dbo].[Categories]', N'U') IS NULL
BEGIN
    RAISERROR('Missing table dbo.Categories', 16, 1);
    RETURN;
END

IF COL_LENGTH(N'[dbo].[Suppliers]', N'CategoryId') IS NULL
    ALTER TABLE [dbo].[Suppliers] ADD [CategoryId] int NULL;

DECLARE @SeedAccounts TABLE(
    UserName nvarchar(50) NOT NULL,
    FullName nvarchar(max) NOT NULL,
    Email nvarchar(max) NOT NULL,
    Phone nvarchar(max) NOT NULL,
    Role int NOT NULL,
    IsActive bit NOT NULL
);

INSERT INTO @SeedAccounts(UserName, FullName, Email, Phone, Role, IsActive)
VALUES
(N'admin', N'System Admin', N'admin@econent.com', N'0988000000', 0, 1),
(N'user', N'User', N'user@econent.com', N'0988111111', 1, 1),
(N'ludo', N'Đỗ Phú Luận', N'ludophu@gmail.com', N'0988989999', 1, 1);

UPDATE u
SET u.FullName = seed.FullName,
    u.Email = seed.Email,
    u.Phone = seed.Phone,
    u.Role = seed.Role,
    u.IsActive = seed.IsActive,
    u.UpdatedAt = SYSUTCDATETIME()
FROM [dbo].[Users] u
INNER JOIN @SeedAccounts seed ON seed.UserName = u.UserName;

INSERT INTO [dbo].[Users]([UserName], [PasswordHash], [FullName], [Email], [Phone], [Role], [IsActive], [CreatedAt])
SELECT seed.UserName, @DefaultPasswordHash, seed.FullName, seed.Email, seed.Phone, seed.Role, seed.IsActive, SYSUTCDATETIME()
FROM @SeedAccounts seed
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Users] u WHERE u.UserName = seed.UserName);

DECLARE @SeedSuppliers TABLE(
    UserName nvarchar(50) NOT NULL,
    FullName nvarchar(max) NOT NULL,
    Email nvarchar(max) NOT NULL,
    Phone nvarchar(max) NOT NULL,
    CompanyName nvarchar(max) NOT NULL,
    CategoryId int NOT NULL
);

INSERT INTO @SeedSuppliers(UserName, FullName, Email, Phone, CompanyName, CategoryId)
VALUES
(N'supplier_screen', N'Supplier Màn hình', N'supplier_screen@econent.com', N'0988300001', N'Công ty Màn hình Econent', 1),
(N'supplier_battery', N'Supplier Pin', N'supplier_battery@econent.com', N'0988300002', N'Công ty Pin Econent', 2),
(N'supplier_case', N'Supplier Vỏ máy', N'supplier_case@econent.com', N'0988300003', N'Công ty Vỏ máy Econent', 3),
(N'supplier_camera', N'Supplier Camera', N'supplier_camera@econent.com', N'0988300004', N'Công ty Camera Econent', 4),
(N'supplier_cable', N'Supplier Cáp sạc', N'supplier_cable@econent.com', N'0988300005', N'Công ty Cáp sạc Econent', 5),
(N'supplier_glass', N'Supplier Mặt kính', N'supplier_glass@econent.com', N'0988300006', N'Công ty Mặt kính Econent', 6),
(N'supplier_speaker', N'Supplier Loa', N'supplier_speaker@econent.com', N'0988300007', N'Công ty Loa Econent', 7),
(N'supplier_chip', N'Supplier IC main', N'supplier_chip@econent.com', N'0988300008', N'Công ty IC main Econent', 8);

INSERT INTO [dbo].[Users]([UserName], [PasswordHash], [FullName], [Email], [Phone], [Role], [IsActive], [CreatedAt])
SELECT seed.UserName, @DefaultPasswordHash, seed.FullName, seed.Email, seed.Phone, 2, 1, SYSUTCDATETIME()
FROM @SeedSuppliers seed
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId)
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Users] u WHERE u.UserName = seed.UserName);

UPDATE u
SET u.FullName = seed.FullName,
    u.Email = seed.Email,
    u.Phone = seed.Phone,
    u.Role = 2,
    u.IsActive = 1,
    u.UpdatedAt = SYSUTCDATETIME()
FROM [dbo].[Users] u
INNER JOIN @SeedSuppliers seed ON seed.UserName = u.UserName
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId);

INSERT INTO [dbo].[Suppliers]([UserId], [CompanyName], [ContactName], [Email], [Phone], [Address], [CategoryId], [IsActive], [CreatedAt])
SELECT u.Id, seed.CompanyName, seed.FullName, seed.Email, seed.Phone, N'Việt Nam', seed.CategoryId, 1, SYSUTCDATETIME()
FROM @SeedSuppliers seed
INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId)
  AND NOT EXISTS (SELECT 1 FROM [dbo].[Suppliers] s WHERE s.UserId = u.Id);

UPDATE s
SET s.CompanyName = seed.CompanyName,
    s.ContactName = seed.FullName,
    s.Email = seed.Email,
    s.Phone = seed.Phone,
    s.Address = N'Việt Nam',
    s.CategoryId = seed.CategoryId,
    s.IsActive = 1,
    s.UpdatedAt = SYSUTCDATETIME()
FROM [dbo].[Suppliers] s
INNER JOIN [dbo].[Users] u ON u.Id = s.UserId
INNER JOIN @SeedSuppliers seed ON seed.UserName = u.UserName
WHERE EXISTS (SELECT 1 FROM [dbo].[Categories] c WHERE c.Id = seed.CategoryId);

UPDATE s
SET s.IsActive = 0,
    s.UpdatedAt = SYSUTCDATETIME()
FROM [dbo].[Suppliers] s
INNER JOIN [dbo].[Users] u ON u.Id = s.UserId
LEFT JOIN @SeedSuppliers seed ON seed.UserName = u.UserName
WHERE (u.UserName = N'supplier' OR u.UserName LIKE N'supplier[_]%')
  AND seed.UserName IS NULL;

UPDATE u
SET u.IsActive = 0,
    u.UpdatedAt = SYSUTCDATETIME()
FROM [dbo].[Users] u
LEFT JOIN @SeedSuppliers seed ON seed.UserName = u.UserName
WHERE (u.UserName = N'supplier' OR u.UserName LIKE N'supplier[_]%')
  AND seed.UserName IS NULL;

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    UPDATE p
    SET p.SupplierId = target.Id
    FROM [dbo].[Products] p
    INNER JOIN @SeedSuppliers seed ON seed.CategoryId = p.CategoryId
    INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
    INNER JOIN [dbo].[Suppliers] target ON target.UserId = u.Id
    WHERE p.SupplierId IS NULL OR p.SupplierId <> target.Id;
END

IF OBJECT_ID(N'[dbo].[Receipts]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    UPDATE r
    SET r.SupplierId = target.Id
    FROM [dbo].[Receipts] r
    INNER JOIN [dbo].[Products] p ON p.Id = r.ProductId
    INNER JOIN @SeedSuppliers seed ON seed.CategoryId = p.CategoryId
    INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
    INNER JOIN [dbo].[Suppliers] target ON target.UserId = u.Id
    WHERE r.SupplierId <> target.Id;
END

IF OBJECT_ID(N'[dbo].[StockBatches]', N'U') IS NOT NULL
   AND OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    UPDATE b
    SET b.SupplierId = target.Id
    FROM [dbo].[StockBatches] b
    INNER JOIN [dbo].[Products] p ON p.Id = b.ProductId
    INNER JOIN @SeedSuppliers seed ON seed.CategoryId = p.CategoryId
    INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
    INNER JOIN [dbo].[Suppliers] target ON target.UserId = u.Id
    WHERE b.SupplierId <> target.Id;
END

IF OBJECT_ID(N'[dbo].[SupplierRequests]', N'U') IS NOT NULL
BEGIN
    UPDATE sr
    SET sr.SupplierId = target.Id
    FROM [dbo].[SupplierRequests] sr
    INNER JOIN @SeedSuppliers seed ON seed.CategoryId = sr.CategoryId
    INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
    INNER JOIN [dbo].[Suppliers] target ON target.UserId = u.Id
    WHERE sr.SupplierId <> target.Id;
END

IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NOT NULL
BEGIN
    UPDATE n
    SET n.SupplierId = target.Id
    FROM [dbo].[Notifications] n
    INNER JOIN [dbo].[Suppliers] oldSupplier ON oldSupplier.Id = n.SupplierId
    INNER JOIN @SeedSuppliers seed ON seed.CategoryId = oldSupplier.CategoryId
    INNER JOIN [dbo].[Users] u ON u.UserName = seed.UserName
    INNER JOIN [dbo].[Suppliers] target ON target.UserId = u.Id
    WHERE n.SupplierId IS NOT NULL AND n.SupplierId <> target.Id;
END

SELECT u.Id, u.UserName, u.FullName, u.Email, u.Phone, u.Role, u.IsActive,
       s.Id AS SupplierId, s.CompanyName, s.CategoryId, c.NameVi AS CategoryName, s.IsActive AS SupplierActive
FROM [dbo].[Users] u
LEFT JOIN [dbo].[Suppliers] s ON s.UserId = u.Id
LEFT JOIN [dbo].[Categories] c ON c.Id = s.CategoryId
WHERE u.UserName IN (N'admin', N'user', N'ludo')
   OR u.UserName IN (SELECT UserName FROM @SeedSuppliers)
ORDER BY u.Role, u.UserName;
