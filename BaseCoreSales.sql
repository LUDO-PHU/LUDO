USE [master];
GO

IF DB_ID(N'BaseCoreSales') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [BaseCoreSales]');
END;
GO

USE [BaseCoreSales];
GO

DECLARE @DropForeignKeys nvarchar(max) = N'';

SELECT @DropForeignKeys = @DropForeignKeys
    + N'ALTER TABLE '
    + QUOTENAME(SCHEMA_NAME(t.[schema_id])) + N'.' + QUOTENAME(t.[name])
    + N' DROP CONSTRAINT ' + QUOTENAME(fk.[name]) + N';' + CHAR(13)
FROM [sys].[foreign_keys] AS fk
INNER JOIN [sys].[tables] AS t ON t.[object_id] = fk.[parent_object_id];

IF @DropForeignKeys <> N''
BEGIN
    EXEC [sys].[sp_executesql] @DropForeignKeys;
END;
GO

IF OBJECT_ID(N'[dbo].[Reviews]', N'U') IS NOT NULL DROP TABLE [dbo].[Reviews];
IF OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NOT NULL DROP TABLE [dbo].[ProductImages];
IF OBJECT_ID(N'[dbo].[OrderDetails]', N'U') IS NOT NULL DROP TABLE [dbo].[OrderDetails];
IF OBJECT_ID(N'[dbo].[Receipts]', N'U') IS NOT NULL DROP TABLE [dbo].[Receipts];
IF OBJECT_ID(N'[dbo].[CartItems]', N'U') IS NOT NULL DROP TABLE [dbo].[CartItems];
IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NOT NULL DROP TABLE [dbo].[Notifications];
IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL DROP TABLE [dbo].[Orders];
IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL DROP TABLE [dbo].[Products];
IF OBJECT_ID(N'[dbo].[Suppliers]', N'U') IS NOT NULL DROP TABLE [dbo].[Suppliers];
IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL DROP TABLE [dbo].[Users];
IF OBJECT_ID(N'[dbo].[Categories]', N'U') IS NOT NULL DROP TABLE [dbo].[Categories];
IF OBJECT_ID(N'[dbo].[__EFMigrationsHistory]', N'U') IS NOT NULL DROP TABLE [dbo].[__EFMigrationsHistory];
GO

CREATE TABLE [dbo].[__EFMigrationsHistory] (
    [MigrationId] nvarchar(150) NOT NULL,
    [ProductVersion] nvarchar(32) NOT NULL,
    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
);
GO

CREATE TABLE [dbo].[Categories] (
    [Id] int NOT NULL IDENTITY(1,1),
    [NameVi] nvarchar(255) NOT NULL,
    [NameEn] nvarchar(255) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [dbo].[Users] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserName] nvarchar(50) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [FullName] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Phone] nvarchar(max) NOT NULL,
    [Role] int NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [dbo].[Suppliers] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserId] int NOT NULL,
    [CompanyName] nvarchar(max) NOT NULL,
    [ContactName] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Phone] nvarchar(max) NOT NULL,
    [Address] nvarchar(max) NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Suppliers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Suppliers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [dbo].[Notifications] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserId] int NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Message] nvarchar(max) NOT NULL,
    [IsRead] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notifications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[Orders] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserId] int NOT NULL,
    [OrderCode] nvarchar(max) NOT NULL,
    [CustomerName] nvarchar(max) NOT NULL,
    [CustomerPhone] nvarchar(max) NOT NULL,
    [ShippingAddress] nvarchar(max) NOT NULL,
    [Note] nvarchar(max) NOT NULL,
    [TotalAmount] decimal(18,2) NOT NULL,
    [TotalImportCost] decimal(18,2) NOT NULL,
    [Profit] decimal(18,2) NOT NULL,
    [Status] int NOT NULL,
    [CancelReason] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ConfirmedAt] datetime2 NULL,
    [ShippingAt] datetime2 NULL,
    [DeliveredAt] datetime2 NULL,
    [CompletedAt] datetime2 NULL,
    [CancelledAt] datetime2 NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Orders_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [dbo].[Products] (
    [Id] int NOT NULL IDENTITY(1,1),
    [NameVi] nvarchar(255) NOT NULL,
    [NameEn] nvarchar(max) NOT NULL,
    [DescriptionVi] nvarchar(max) NOT NULL,
    [DescriptionEn] nvarchar(max) NOT NULL,
    [Specifications] nvarchar(max) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    [ImportPrice] decimal(18,2) NOT NULL,
    [DiscountPercent] decimal(5,2) NOT NULL,
    [Stock] int NOT NULL,
    [ImageUrl] nvarchar(max) NOT NULL,
    [CategoryId] int NOT NULL,
    [Brand] nvarchar(max) NOT NULL,
    [Color] nvarchar(max) NOT NULL,
    [Condition] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [SupplierId] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Products_Categories_CategoryId] FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[Categories] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Products_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [dbo].[Suppliers] ([Id]) ON DELETE SET NULL
);
GO

CREATE TABLE [dbo].[CartItems] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserId] int NOT NULL,
    [ProductId] int NOT NULL,
    [Quantity] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_CartItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CartItems_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_CartItems_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[OrderDetails] (
    [Id] int NOT NULL IDENTITY(1,1),
    [OrderId] int NOT NULL,
    [ProductId] int NOT NULL,
    [Quantity] int NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    [UnitImportPrice] decimal(18,2) NOT NULL,
    [DiscountPercent] decimal(5,2) NOT NULL,
    [FinalPrice] decimal(18,2) NOT NULL,
    [TotalPrice] decimal(18,2) NOT NULL,
    [TotalImportCost] decimal(18,2) NOT NULL,
    [Profit] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_OrderDetails] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OrderDetails_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrderDetails_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [dbo].[ProductImages] (
    [Id] int NOT NULL IDENTITY(1,1),
    [ProductId] int NOT NULL,
    [ImageUrl] nvarchar(max) NOT NULL,
    [AltText] nvarchar(max) NOT NULL,
    [IsPrimary] bit NOT NULL,
    [SortOrder] int NOT NULL DEFAULT 0,
    [CreatedAt] datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_ProductImages] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProductImages_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[Receipts] (
    [Id] int NOT NULL IDENTITY(1,1),
    [ReceiptCode] nvarchar(max) NOT NULL,
    [SupplierId] int NOT NULL,
    [ProductId] int NOT NULL,
    [Quantity] int NOT NULL,
    [ImportPrice] decimal(18,2) NOT NULL,
    [TotalImportAmount] decimal(18,2) NOT NULL,
    [ImageUrl] nvarchar(max) NOT NULL,
    [Content] nvarchar(max) NOT NULL,
    [FromAddress] nvarchar(max) NOT NULL,
    [ToAddress] nvarchar(max) NOT NULL,
    [Status] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ConfirmedAt] datetime2 NULL,
    [ShippingAt] datetime2 NULL,
    [DeliveredAt] datetime2 NULL,
    [CancelledAt] datetime2 NULL,
    [CancelReason] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Receipts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Receipts_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Receipts_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [dbo].[Suppliers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [dbo].[Reviews] (
    [Id] int NOT NULL IDENTITY(1,1),
    [UserId] int NOT NULL,
    [ProductId] int NOT NULL,
    [OrderId] int NOT NULL,
    [Rating] int NOT NULL,
    [Comment] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Reviews] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Reviews_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [dbo].[Orders] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Reviews_Products_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Reviews_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION
);
GO

SET IDENTITY_INSERT [dbo].[Users] ON;
INSERT INTO [dbo].[Users] ([Id], [UserName], [PasswordHash], [FullName], [Email], [Phone], [Role], [IsActive], [CreatedAt], [UpdatedAt])
VALUES
    (1, N'admin', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'System Admin', N'admin@econent.com', N'0988000000', 0, CAST(1 AS bit), SYSUTCDATETIME(), NULL),
    (2, N'user', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Test User', N'user@econent.com', N'0988111111', 1, CAST(1 AS bit), SYSUTCDATETIME(), NULL),
    (3, N'supplier', N'8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', N'Supplier Demo', N'supplier@econent.com', N'0988222222', 2, CAST(1 AS bit), SYSUTCDATETIME(), NULL);
SET IDENTITY_INSERT [dbo].[Users] OFF;
GO

SET IDENTITY_INSERT [dbo].[Suppliers] ON;
INSERT INTO [dbo].[Suppliers] ([Id], [UserId], [CompanyName], [ContactName], [Email], [Phone], [Address], [IsActive], [CreatedAt], [UpdatedAt])
VALUES
    (1, 3, N'BaseCore Phone Parts', N'Kho linh kiện BaseCore', N'supplier@econent.com', N'0988222222', N'Hà Nội, Việt Nam', CAST(1 AS bit), SYSUTCDATETIME(), NULL);
SET IDENTITY_INSERT [dbo].[Suppliers] OFF;
GO

SET IDENTITY_INSERT [dbo].[Categories] ON;
INSERT INTO [dbo].[Categories] ([Id], [NameVi], [NameEn], [Description], [IsActive])
VALUES
    (1, N'Màn hình bộ', N'Display Assemblies', N'Màn hình nguyên bộ zin hãng, zin ép kính và linh kiện loại 1.', CAST(1 AS bit)),
    (2, N'Pin điện thoại', N'Phone Batteries', N'Pin dung lượng chuẩn, pin dung lượng cao và pin zin cho điện thoại, máy tính bảng.', CAST(1 AS bit)),
    (3, N'Vỏ & Sườn máy', N'Housings and Frames', N'Vỏ bộ, khung sườn, nắp lưng và kính lưng các dòng thiết bị.', CAST(1 AS bit)),
    (4, N'Cụm Camera', N'Camera Modules', N'Camera trước, camera sau, cụm FaceID và kính camera thay thế.', CAST(1 AS bit)),
    (5, N'Cáp chân sạc & Mic', N'Charging Flex and Microphones', N'Cáp đuôi sạc, cụm chân sạc, bo sạc, mic và cáp nút nguồn.', CAST(1 AS bit)),
    (6, N'Mặt kính & Cảm ứng', N'Glass and Touch Panels', N'Mặt kính ép, kính cảm ứng rời và vật tư ép kính.', CAST(1 AS bit)),
    (7, N'Loa & Chuông', N'Speakers and Vibrators', N'Loa trong, loa ngoài, cụm loa chuông, cáp loa và rung.', CAST(1 AS bit)),
    (8, N'IC & Linh kiện Main', N'IC and Mainboard Components', N'IC nguồn, IC wifi, NAND, IC audio và linh kiện nhỏ trên main.', CAST(1 AS bit));
SET IDENTITY_INSERT [dbo].[Categories] OFF;
GO

DECLARE @CreatedAt datetime2 = SYSUTCDATETIME();

SET IDENTITY_INSERT [dbo].[Products] ON;
INSERT INTO [dbo].[Products]
    ([Id], [NameVi], [NameEn], [DescriptionVi], [DescriptionEn], [Specifications], [Price], [ImportPrice], [DiscountPercent], [Stock], [ImageUrl], [CategoryId], [Brand], [Color], [Condition], [Status], [SupplierId], [CreatedAt], [UpdatedAt])
VALUES
    (1, N'Màn hình iPhone 13 Pro Max Zin', N'Original iPhone 13 Pro Max Display Assembly', N'Màn hình zin bóc máy, hiển thị sắc nét, cảm ứng ổn định.', N'Original pulled display assembly with sharp image quality and stable touch.', N'OLED, 120Hz, bảo hành 12 tháng', 8500000, 7200000, 5, 20, N'/images/products/ManHinh/MH1.jpg', 1, N'Apple', N'Đen', N'Zin bóc máy', N'Active', 1, @CreatedAt, NULL),
    (2, N'Màn hình Samsung S22 Ultra Zin Hãng', N'Original Samsung S22 Ultra Display Assembly', N'Màn hình kèm khung sườn zin hãng, màu chuẩn.', N'Original Samsung display assembly with frame.', N'Dynamic AMOLED 2X, cong cạnh', 5200000, 4500000, 10, 15, N'/images/products/ManHinh/MH2.jpg', 1, N'Samsung', N'Đen', N'Mới 100%', N'Active', 1, @CreatedAt, NULL),
    (3, N'Màn hình Oppo Reno8 Z Linh kiện', N'Oppo Reno8 Z Replacement Display', N'Màn hình linh kiện loại 1, hiển thị đẹp, dùng thay thế sửa chữa.', N'Grade A replacement display for Oppo Reno8 Z.', N'AMOLED, linh kiện loại 1', 1200000, 950000, 20, 50, N'/images/products/ManHinh/MH3.jpg', 1, N'Oppo', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (4, N'Màn hình iPhone 11 Pro Incell', N'iPhone 11 Pro Incell Display', N'Màn hình Incell chất lượng cao, phù hợp sửa chữa phổ thông.', N'High quality Incell replacement display.', N'LCD Incell, bảo hành 6 tháng', 1100000, 850000, 15, 100, N'/images/products/ManHinh/MH4.jpg', 1, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (5, N'Màn hình Redmi Note 11 Pro 4G', N'Redmi Note 11 Pro 4G Display Assembly', N'Màn hình nguyên bộ cho Redmi Note 11 Pro 4G.', N'Replacement display assembly for Redmi Note 11 Pro 4G.', N'AMOLED, nguyên bộ', 1350000, 1100000, 15, 30, N'/images/products/ManHinh/MH5.jpg', 1, N'Xiaomi', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (6, N'Màn hình iPhone X GX OLED', N'iPhone X GX OLED Display', N'Màn hình GX OLED màu đẹp, cảm ứng mượt.', N'GX OLED replacement display for iPhone X.', N'OLED Hard, thương hiệu GX', 950000, 750000, 13, 60, N'/images/products/ManHinh/MH6.jpg', 1, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (7, N'Màn hình Vivo V23e Zin', N'Original Vivo V23e Display', N'Màn hình zin công ty cho Vivo V23e.', N'Original replacement display for Vivo V23e.', N'AMOLED, zin công ty', 1450000, 1200000, 14, 25, N'/images/products/ManHinh/MH7.jpg', 1, N'Vivo', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (8, N'Màn hình iPhone 7 Plus Zin ép kính', N'iPhone 7 Plus Original Refurbished Display', N'Màn hình zin đã ép lại kính mới, hiển thị ổn định.', N'Original refurbished display with replaced front glass.', N'Retina LCD, zin ép kính', 650000, 450000, 23, 80, N'/images/products/ManHinh/MH8.jpg', 1, N'Apple', N'Trắng/Đen', N'Đã sửa chữa', N'Active', 1, @CreatedAt, NULL),
    (9, N'Màn hình Samsung A52 Zin', N'Original Samsung A52 Display', N'Màn hình zin sắc nét cho Samsung A52.', N'Original replacement display for Samsung A52.', N'Super AMOLED, zin', 1800000, 1550000, 14, 20, N'/images/products/ManHinh/MH9.jpg', 1, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (10, N'Màn hình iPhone 12 Pro Max Zin bóc', N'Pulled Original iPhone 12 Pro Max Display', N'Màn tháo máy, chưa qua sửa chữa.', N'Pulled original display, never repaired.', N'OLED, zin bóc máy', 5500000, 4800000, 8, 10, N'/images/products/ManHinh/MH10.jpg', 1, N'Apple', N'Đen', N'Bóc máy', N'Active', 1, @CreatedAt, NULL),

    (11, N'Pin iPhone 11 Pisen Dung lượng cao', N'Pisen High Capacity iPhone 11 Battery', N'Pin Pisen dung lượng cao, bảo hành 12 tháng.', N'Pisen high capacity battery with 12 month warranty.', N'3500 mAh, bảo vệ sạc', 650000, 420000, 23, 100, N'/images/products/PinDienThoai/PDT1.jpg', 2, N'Pisen', N'Vàng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (12, N'Pin iPhone XS Max Zin', N'Original iPhone XS Max Battery', N'Pin zin dung lượng chuẩn cho iPhone XS Max.', N'Original standard capacity battery for iPhone XS Max.', N'3174 mAh, zin', 450000, 300000, 25, 50, N'/images/products/PinDienThoai/PDT2.jpg', 2, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (13, N'Pin Samsung Note 20 Ultra Zin', N'Original Samsung Note 20 Ultra Battery', N'Pin zin chính hãng Samsung Note 20 Ultra.', N'Original Samsung Note 20 Ultra battery.', N'4500 mAh, zin hãng', 350000, 220000, 30, 40, N'/images/products/PinDienThoai/PDT3.jpg', 2, N'Samsung', N'Trắng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (14, N'Pin Oppo F11 Pro Zin', N'Original Oppo F11 Pro Battery', N'Pin dung lượng chuẩn cho Oppo F11 Pro.', N'Original battery for Oppo F11 Pro.', N'4000 mAh, zin', 280000, 180000, 30, 60, N'/images/products/PinDienThoai/PDT4.jpg', 2, N'Oppo', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (15, N'Pin iPhone 12 Pro Max Pisen', N'Pisen iPhone 12 Pro Max Battery', N'Pin Pisen chính hãng kèm cáp bảo vệ.', N'Genuine Pisen replacement battery.', N'3687 mAh, Pisen', 850000, 600000, 19, 30, N'/images/products/PinDienThoai/PDT5.jpg', 2, N'Pisen', N'Vàng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (16, N'Pin Xiaomi Poco X3 Pro Zin', N'Original Xiaomi Poco X3 Pro Battery', N'Pin sạc nhanh, cầm pin tốt cho Poco X3 Pro.', N'Original high endurance battery for Poco X3 Pro.', N'5160 mAh, hỗ trợ sạc nhanh', 320000, 210000, 28, 45, N'/images/products/PinDienThoai/PDT6.jpg', 2, N'Xiaomi', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (17, N'Pin Huawei Nova 3i Zin', N'Original Huawei Nova 3i Battery', N'Pin thay thế khi máy nhanh hết pin, tụt phần trăm.', N'Original replacement battery for Huawei Nova 3i.', N'3340 mAh, zin', 250000, 150000, 28, 50, N'/images/products/PinDienThoai/PDT7.jpg', 2, N'Huawei', N'Trắng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (18, N'Pin iPad Pro 11 inch 2020', N'iPad Pro 11 inch 2020 Battery', N'Pin zin cho iPad Pro 11 inch 2020.', N'Replacement battery for iPad Pro 11 inch 2020.', N'7538 mAh, tablet battery', 850000, 650000, 22, 20, N'/images/products/PinDienThoai/PDT8.jpg', 2, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (19, N'Pin Vsmart Joy 3 Zin', N'Original Vsmart Joy 3 Battery', N'Linh kiện thay thế chuẩn cho Vsmart Joy 3.', N'Original replacement battery for Vsmart Joy 3.', N'5000 mAh, zin', 240000, 140000, 31, 70, N'/images/products/PinDienThoai/PDT9.jpg', 2, N'Vsmart', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (20, N'Pin iPhone 6S dung lượng siêu cao', N'Super High Capacity iPhone 6S Battery', N'Pin dung lượng siêu cao, dùng lâu hơn pin zin.', N'Super high capacity replacement battery for iPhone 6S.', N'2200 mAh, dung lượng cao', 350000, 200000, 30, 150, N'/images/products/PinDienThoai/PDT10.jpg', 2, N'Pisen', N'Vàng', N'Mới', N'Active', 1, @CreatedAt, NULL),

    (21, N'Vỏ iPhone 11 Pro Max Xanh Rêu', N'Moss Green iPhone 11 Pro Max Housing', N'Vỏ đầy đủ nút, gạt rung, khay sim.', N'Complete housing with buttons and SIM tray.', N'Hợp kim nhôm, full bộ', 750000, 500000, 21, 30, N'/images/products/VoVaSuonMay/VSM1.jpg', 3, N'Apple', N'Xanh rêu', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (22, N'Sườn Samsung S21 Ultra', N'Samsung S21 Ultra Middle Frame', N'Sườn giữa zin hãng cho Samsung S21 Ultra.', N'Original middle frame for Samsung S21 Ultra.', N'Kim loại, sườn giữa', 450000, 300000, 25, 25, N'/images/products/VoVaSuonMay/VSM2.jpg', 3, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (23, N'Nắp lưng kính iPhone 12 Pro Max', N'iPhone 12 Pro Max Rear Glass', N'Kính thay mặt lưng sau cho iPhone 12 Pro Max.', N'Rear glass replacement for iPhone 12 Pro Max.', N'Kính cường lực mặt sau', 350000, 180000, 30, 100, N'/images/products/VoVaSuonMay/VSM3.jpg', 3, N'Apple', N'Xanh đại dương', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (24, N'Bộ vỏ Oppo F9 Tím', N'Purple Oppo F9 Housing Set', N'Gồm nắp lưng và khung sườn Oppo F9.', N'Housing set with back cover and frame.', N'Nhựa ABS, bộ vỏ', 220000, 130000, 26, 40, N'/images/products/VoVaSuonMay/VSM4.jpg', 3, N'Oppo', N'Tím', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (25, N'Vỏ độ iPhone XR lên 14 Pro', N'iPhone XR to 14 Pro Conversion Housing', N'Vỏ độ ngoại hình iPhone XR lên phong cách 14 Pro.', N'Conversion housing for iPhone XR to 14 Pro style.', N'Vỏ độ ngoại hình', 1200000, 850000, 20, 15, N'/images/products/VoVaSuonMay/VSM5.jpg', 3, N'Apple Custom', N'Tím', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (26, N'Khung sườn Apple Watch Series 6', N'Apple Watch Series 6 Frame', N'Khung nhôm zin bóc máy cho Apple Watch Series 6.', N'Pulled aluminum frame for Apple Watch Series 6.', N'Nhôm 44mm, zin bóc', 950000, 700000, 20, 10, N'/images/products/VoVaSuonMay/VSM6.jpg', 3, N'Apple', N'Xanh', N'Bóc máy', N'Active', 1, @CreatedAt, NULL),
    (27, N'Nắp lưng Samsung S20 FE', N'Samsung S20 FE Back Cover', N'Nắp lưng nhựa zin cho Samsung S20 FE.', N'Original rear cover for Samsung S20 FE.', N'Nhựa, zin', 180000, 100000, 28, 60, N'/images/products/VoVaSuonMay/VSM7.jpg', 3, N'Samsung', N'Xanh', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (28, N'Kính lưng mặt sau iPhone 13 Pro', N'iPhone 13 Pro Rear Glass', N'Kính lưng thay thế khi mặt sau bị bể.', N'Rear glass replacement for iPhone 13 Pro.', N'Kính mặt lưng', 290000, 150000, 35, 80, N'/images/products/VoVaSuonMay/VSM8.jpg', 3, N'Apple', N'Vàng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (29, N'Vỏ bộ Nokia 6700 Gold', N'Nokia 6700 Gold Housing Set', N'Linh kiện vỏ bộ Nokia 6700 Gold loại cao cấp.', N'Premium Nokia 6700 Gold housing set.', N'Mạ vàng, full bộ', 1500000, 1100000, 25, 5, N'/images/products/VoVaSuonMay/VSM9.jpg', 3, N'Nokia', N'Vàng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (30, N'Vỏ khung viền iPad Air 4', N'iPad Air 4 Housing Frame', N'Vỏ khung viền zin cho iPad Air 4.', N'Replacement housing frame for iPad Air 4.', N'Nhôm, khung viền', 1800000, 1400000, 18, 8, N'/images/products/VoVaSuonMay/VSM10.jpg', 3, N'Apple', N'Xám', N'Mới', N'Active', 1, @CreatedAt, NULL),

    (31, N'Camera sau iPhone 12 Pro Max', N'iPhone 12 Pro Max Rear Camera', N'Cụm 3 camera sau zin bóc máy.', N'Pulled original triple rear camera module.', N'12MP x 3, zin bóc', 1850000, 1550000, 16, 15, N'/images/products/CumCamera/CC1.jpg', 4, N'Apple', N'Gốc', N'Zin bóc', N'Active', 1, @CreatedAt, NULL),
    (32, N'Camera sau Samsung S21 Ultra', N'Samsung S21 Ultra Rear Camera', N'Cụm camera chính 108MP cho Samsung S21 Ultra.', N'Rear camera module for Samsung S21 Ultra.', N'108MP, cụm camera sau', 1450000, 1200000, 19, 10, N'/images/products/CumCamera/CC2.jpg', 4, N'Samsung', N'Gốc', N'Zin', N'Active', 1, @CreatedAt, NULL),
    (33, N'Camera trước iPhone 11', N'iPhone 11 Front Camera', N'Camera selfie kèm cáp cảm biến.', N'Front camera with sensor flex for iPhone 11.', N'12MP, camera trước', 450000, 320000, 30, 30, N'/images/products/CumCamera/CC3.jpg', 4, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (34, N'Cụm camera trước FaceID iPhone X', N'iPhone X Front Camera FaceID Assembly', N'Cụm camera trước FaceID thay thế khi lỗi FaceID hoặc camera.', N'Front camera FaceID assembly for iPhone X.', N'Cụm FaceID, zin bóc', 950000, 750000, 24, 12, N'/images/products/CumCamera/CC4.jpg', 4, N'Apple', N'Gốc', N'Zin bóc', N'Active', 1, @CreatedAt, NULL),
    (35, N'Kính camera iPhone 14 Pro Max', N'iPhone 14 Pro Max Camera Lens Glass', N'Mặt kính bảo vệ camera ngoài cho iPhone 14 Pro Max.', N'Camera lens glass for iPhone 14 Pro Max.', N'Sapphire glass, kính camera', 120000, 50000, 40, 200, N'/images/products/CumCamera/CC5.jpg', 4, N'Apple', N'Tím', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (36, N'Camera sau Oppo Reno7 Zin', N'Original Oppo Reno7 Rear Camera', N'Camera sau zin độ nét cao cho Oppo Reno7.', N'Original rear camera module for Oppo Reno7.', N'64MP, zin', 550000, 420000, 26, 20, N'/images/products/CumCamera/CC6.jpg', 4, N'Oppo', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (37, N'Camera sau Xiaomi Redmi Note 10 Pro', N'Xiaomi Redmi Note 10 Pro Rear Camera', N'Cụm camera 108MP zin cho Redmi Note 10 Pro.', N'Rear camera module for Redmi Note 10 Pro.', N'108MP, cụm camera sau', 680000, 520000, 20, 18, N'/images/products/CumCamera/CC7.jpg', 4, N'Xiaomi', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (38, N'Camera trước Samsung A71', N'Samsung A71 Front Camera', N'Camera trước thay khi camera mờ hoặc đốm.', N'Front camera replacement for Samsung A71.', N'32MP, camera trước', 250000, 160000, 37, 40, N'/images/products/CumCamera/CC8.jpg', 4, N'Samsung', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (39, N'Cụm Camera bóc máy iPhone 13', N'Pulled iPhone 13 Camera Module', N'Hàng tháo máy, linh kiện chuẩn cho iPhone 13.', N'Pulled original camera module for iPhone 13.', N'12MP Dual, bóc máy', 1550000, 1300000, 14, 8, N'/images/products/CumCamera/CC9.jpg', 4, N'Apple', N'Gốc', N'Bóc máy', N'Active', 1, @CreatedAt, NULL),
    (40, N'Mắt kính camera rời Note 20 Ultra', N'Note 20 Ultra Camera Lens Glass', N'Kính camera rời cho kỹ thuật viên sửa chữa.', N'Separate camera lens glass for Note 20 Ultra.', N'Kính camera rời', 95000, 35000, 36, 100, N'/images/products/CumCamera/CC10.jpg', 4, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),

    (41, N'Cụm chân sạc iPhone 12 Pro Max', N'iPhone 12 Pro Max Charging Port Assembly', N'Cụm chân sạc thay khi máy không nhận sạc.', N'Charging port assembly for iPhone 12 Pro Max.', N'Cụm sạc zin, kèm mic', 450000, 320000, 25, 40, N'/images/products/CapChanSacVaMic/CCS1.jpg', 5, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (42, N'Cáp đuôi sạc Samsung Note 10 Plus', N'Samsung Note 10 Plus Charging Flex', N'Cáp chân sạc kèm mic thoại cho Note 10 Plus.', N'Charging flex with microphone for Note 10 Plus.', N'USB-C, cáp đuôi sạc', 280000, 180000, 37, 50, N'/images/products/CapChanSacVaMic/CCS2.jpg', 5, N'Samsung', N'Gốc', N'Zin', N'Active', 1, @CreatedAt, NULL),
    (43, N'Cụm chân sạc Oppo F1s', N'Oppo F1s Charging Port Assembly', N'Linh kiện sửa chữa phổ thông cho Oppo F1s.', N'Charging port assembly for Oppo F1s.', N'Micro-USB, cụm sạc', 120000, 65000, 40, 100, N'/images/products/CapChanSacVaMic/CCS3.jpg', 5, N'Oppo', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (44, N'Cáp nối main iPhone 11 Pro', N'iPhone 11 Pro Mainboard Flex Cable', N'Dây cáp truyền tín hiệu main iPhone 11 Pro.', N'Mainboard interconnect flex cable for iPhone 11 Pro.', N'Cáp dẻo nối main', 250000, 150000, 37, 30, N'/images/products/CapChanSacVaMic/CCS4.jpg', 5, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (45, N'Cáp sạc iPad Gen 8', N'iPad Gen 8 Charging Flex', N'Cáp Lightning zin cho iPad Gen 8.', N'Charging flex for iPad Gen 8.', N'Cáp zin, Lightning', 350000, 250000, 36, 25, N'/images/products/CapChanSacVaMic/CCS5.jpg', 5, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (46, N'Cụm sạc Xiaomi Redmi 9 Zin', N'Original Xiaomi Redmi 9 Charging Board', N'Cụm sạc Redmi 9 hỗ trợ sạc nhanh đúng chuẩn.', N'Original charging board for Xiaomi Redmi 9.', N'USB-C, bo sạc zin', 150000, 95000, 40, 60, N'/images/products/CapChanSacVaMic/CCS6.jpg', 5, N'Xiaomi', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (47, N'Cáp sạc Apple Watch Series 4', N'Apple Watch Series 4 Charging Flex', N'Cáp nội bộ cho Apple Watch Series 4.', N'Internal charging flex for Apple Watch Series 4.', N'Cáp cảm ứng/sạc', 450000, 300000, 30, 15, N'/images/products/CapChanSacVaMic/CCS7.jpg', 5, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (48, N'Cáp tai nghe chân sạc iPhone 6S', N'iPhone 6S Charging and Headphone Flex', N'Cụm gồm chân sạc, mic và tai nghe iPhone 6S.', N'Charging, microphone and headphone flex for iPhone 6S.', N'Cụm sạc, jack tai nghe', 180000, 100000, 40, 80, N'/images/products/CapChanSacVaMic/CCS8.jpg', 5, N'Apple', N'Trắng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (49, N'Bo mạch sạc Vivo Y11 Zin', N'Original Vivo Y11 Charging Board', N'Bo sạc linh kiện zin hãng cho Vivo Y11.', N'Original charging board for Vivo Y11.', N'Micro-USB, bo sạc', 140000, 80000, 44, 45, N'/images/products/CapChanSacVaMic/CCS9.jpg', 5, N'Vivo', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (50, N'Cáp nút nguồn iPhone 11', N'iPhone 11 Power Button Flex', N'Cáp phím nguồn và đèn flash iPhone 11.', N'Power button and flash flex for iPhone 11.', N'Cáp dẻo phím nguồn', 220000, 130000, 37, 50, N'/images/products/CapChanSacVaMic/CCS10.jpg', 5, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),

    (51, N'Mặt kính iPhone 14 Pro Max (Ép)', N'iPhone 14 Pro Max Front Glass', N'Kính dùng để ép khi bể mặt kính iPhone 14 Pro Max.', N'Front glass for refurbishing iPhone 14 Pro Max screens.', N'Kính cường lực, ép kính', 450000, 250000, 35, 100, N'/images/products/MatKinhVaCamUng/MK1.jpg', 6, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (52, N'Kính cảm ứng iPad Gen 9', N'iPad Gen 9 Touch Glass', N'Cảm ứng rời cho iPad Gen 9.', N'Touch glass replacement for iPad Gen 9.', N'Cảm ứng rời', 650000, 450000, 31, 30, N'/images/products/MatKinhVaCamUng/MK2.jpg', 6, N'Apple', N'Trắng/Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (53, N'Kính Samsung S22 Ultra (Cong)', N'Samsung S22 Ultra Curved Glass', N'Kính cong chuẩn zin hãng cho Samsung S22 Ultra.', N'Curved front glass for Samsung S22 Ultra.', N'Gorilla Glass Victus, kính cong', 550000, 350000, 35, 40, N'/images/products/MatKinhVaCamUng/MK3.jpg', 6, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (54, N'Kính cảm ứng Apple Watch Series 7', N'Apple Watch Series 7 Touch Glass', N'Kính kèm cảm ứng cho Apple Watch Series 7.', N'Touch glass for Apple Watch Series 7.', N'Ion-X Glass, 41/45mm', 850000, 600000, 29, 20, N'/images/products/MatKinhVaCamUng/MK4.jpg', 6, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (55, N'Kính Oppo A94', N'Oppo A94 Front Glass', N'Kính ép màn hình Oppo A94.', N'Front glass for Oppo A94 screen refurbishing.', N'Kính cường lực', 120000, 55000, 52, 150, N'/images/products/MatKinhVaCamUng/MK5.jpg', 6, N'Oppo', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (56, N'Kính cảm ứng Lenovo Tab M10', N'Lenovo Tab M10 Touch Glass', N'Cảm ứng máy tính bảng Lenovo Tab M10.', N'Touch glass replacement for Lenovo Tab M10.', N'Cảm ứng rời tablet', 350000, 200000, 36, 25, N'/images/products/MatKinhVaCamUng/MK6.jpg', 6, N'Lenovo', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (57, N'Kính Xiaomi 12 Pro', N'Xiaomi 12 Pro Front Glass', N'Kính ép màn cong cao cấp cho Xiaomi 12 Pro.', N'Curved front glass for Xiaomi 12 Pro.', N'Kính Victus, màn cong', 320000, 180000, 36, 35, N'/images/products/MatKinhVaCamUng/MK7.jpg', 6, N'Xiaomi', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (58, N'Kính cảm ứng Z Flip 3 (Màn phụ)', N'Z Flip 3 Cover Screen Touch Glass', N'Kính cho màn hình phụ bên ngoài Z Flip 3.', N'Cover screen touch glass for Z Flip 3.', N'Kính màn phụ', 450000, 300000, 35, 15, N'/images/products/MatKinhVaCamUng/MK8.jpg', 6, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (59, N'Kính Huawei P30 Pro', N'Huawei P30 Pro Front Glass', N'Kính ép màn cong cho Huawei P30 Pro.', N'Curved front glass for Huawei P30 Pro.', N'Kính cường lực cong', 250000, 150000, 44, 30, N'/images/products/MatKinhVaCamUng/MK9.jpg', 6, N'Huawei', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (60, N'Keo OCA iPhone 13 Pro Max', N'iPhone 13 Pro Max OCA Adhesive', N'Keo dán màn hình chuyên dụng cho iPhone 13 Pro Max.', N'OCA adhesive for iPhone 13 Pro Max screen refurbishing.', N'OCA 250um, trong suốt', 150000, 90000, 40, 200, N'/images/products/MatKinhVaCamUng/MK10.jpg', 6, N'Generic', N'Trong suốt', N'Mới', N'Active', 1, @CreatedAt, NULL),

    (61, N'Loa trong iPhone 13 Pro Max', N'iPhone 13 Pro Max Ear Speaker', N'Loa thoại zin nghe rõ, không rè.', N'Ear speaker replacement for iPhone 13 Pro Max.', N'Loa thoại, zin', 350000, 250000, 36, 50, N'/images/products/LoaVaChuong/LC1.jpg', 7, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (62, N'Cụm loa chuông Samsung S20 Ultra', N'Samsung S20 Ultra Loudspeaker Assembly', N'Cụm loa ngoài, chuông báo cho Samsung S20 Ultra.', N'Loudspeaker assembly for Samsung S20 Ultra.', N'Loa ngoài, cụm chuông', 250000, 160000, 37, 40, N'/images/products/LoaVaChuong/LC2.jpg', 7, N'Samsung', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (63, N'Loa ngoài Oppo A54', N'Oppo A54 Loudspeaker', N'Loa chuông linh kiện loại 1 cho Oppo A54.', N'Loudspeaker replacement for Oppo A54.', N'Loa ngoài', 120000, 75000, 40, 60, N'/images/products/LoaVaChuong/LC3.jpg', 7, N'Oppo', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (64, N'Cáp loa trong iPhone 11', N'iPhone 11 Ear Speaker Flex', N'Cáp loa kèm cảm biến tiệm cận iPhone 11.', N'Ear speaker flex with proximity sensor for iPhone 11.', N'Cáp cảm biến loa trong', 280000, 180000, 37, 35, N'/images/products/LoaVaChuong/LC4.jpg', 7, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (65, N'Loa trong Samsung A51', N'Samsung A51 Ear Speaker', N'Loa đàm thoại thay thế cho Samsung A51.', N'Ear speaker replacement for Samsung A51.', N'Loa nhỏ', 85000, 45000, 43, 100, N'/images/products/LoaVaChuong/LC5.jpg', 7, N'Samsung', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (66, N'Cụm loa chuông Redmi Note 11', N'Redmi Note 11 Loudspeaker Assembly', N'Cụm loa ngoài Xiaomi Redmi Note 11 zin.', N'Loudspeaker assembly for Redmi Note 11.', N'Loa ngoài, cụm chuông', 140000, 95000, 44, 50, N'/images/products/LoaVaChuong/LC6.jpg', 7, N'Xiaomi', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (67, N'Loa trong iPhone XS Max', N'iPhone XS Max Ear Speaker', N'Loa nghe gọi chất lượng zin cho iPhone XS Max.', N'Ear speaker replacement for iPhone XS Max.', N'Loa thoại', 190000, 120000, 45, 60, N'/images/products/LoaVaChuong/LC7.jpg', 7, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (68, N'Loa ngoài iPad Mini 5', N'iPad Mini 5 Loudspeaker', N'Cặp loa trái phải iPad Mini 5.', N'Loudspeaker set for iPad Mini 5.', N'Dual Speaker', 320000, 220000, 36, 20, N'/images/products/LoaVaChuong/LC8.jpg', 7, N'Apple', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (69, N'Loa trong Vivo Y20', N'Vivo Y20 Ear Speaker', N'Linh kiện loa trong thay thế nhanh cho Vivo Y20.', N'Ear speaker replacement for Vivo Y20.', N'Loa nhỏ', 75000, 35000, 37, 100, N'/images/products/LoaVaChuong/LC9.jpg', 7, N'Vivo', N'Gốc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (70, N'Rung iPhone 12 Pro Max', N'iPhone 12 Pro Max Taptic Engine', N'Cục rung zin bóc máy cho iPhone 12 Pro Max.', N'Pulled original vibration motor for iPhone 12 Pro Max.', N'Taptic Engine, zin bóc', 550000, 400000, 26, 25, N'/images/products/LoaVaChuong/LC10.jpg', 7, N'Apple', N'Bạc', N'Zin bóc', N'Active', 1, @CreatedAt, NULL),

    (71, N'IC Nguồn iPhone 13 Pro Max', N'iPhone 13 Pro Max Power IC', N'IC quản lý nguồn chính cho iPhone 13 Pro Max.', N'Power management IC for iPhone 13 Pro Max.', N'PMU, chip quản lý nguồn', 850000, 650000, 29, 30, N'/images/products/ICvaLinhKienMain/IC1.jpg', 8, N'Apple', N'Bạc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (72, N'IC Wifi iPhone 11', N'iPhone 11 WiFi IC', N'Chip xử lý kết nối không dây cho iPhone 11.', N'Wireless connectivity IC for iPhone 11.', N'WiFi/Bluetooth IC', 350000, 250000, 30, 50, N'/images/products/ICvaLinhKienMain/IC2.jpg', 8, N'Apple', N'Bạc', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (73, N'Ổ cứng (NAND) iPhone 12 128GB', N'iPhone 12 128GB NAND Storage', N'Dùng để nâng cấp hoặc thay thế bộ nhớ iPhone 12.', N'128GB NAND storage replacement for iPhone 12.', N'128GB NAND', 1200000, 950000, 25, 20, N'/images/products/ICvaLinhKienMain/IC3.jpg', 8, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (74, N'IC Audio iPhone 7 Plus', N'iPhone 7 Plus Audio IC', N'Sửa lỗi mất âm thanh, mất mic trên iPhone 7 Plus.', N'Audio IC for iPhone 7 Plus sound and microphone repairs.', N'Chip âm thanh', 150000, 90000, 40, 100, N'/images/products/ICvaLinhKienMain/IC4.jpg', 8, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (75, N'IC Sạc (U2) iPhone X', N'iPhone X U2 Charging IC', N'Chip quản lý USB và sạc cho iPhone X.', N'USB and charging management IC for iPhone X.', N'Tristar IC, U2', 180000, 110000, 40, 150, N'/images/products/ICvaLinhKienMain/IC5.jpg', 8, N'Apple', N'Trắng', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (76, N'Khay SIM iPhone 14 Pro Max', N'iPhone 14 Pro Max SIM Tray', N'Khay SIM màu tím zin cho iPhone 14 Pro Max.', N'Purple SIM tray for iPhone 14 Pro Max.', N'Nhôm CNC', 150000, 80000, 40, 60, N'/images/products/ICvaLinhKienMain/IC6.jpg', 8, N'Apple', N'Tím', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (77, N'Lưới loa chống bụi iPhone 12', N'iPhone 12 Speaker Dust Mesh', N'Lưới chắn bụi loa thoại cho iPhone 12.', N'Speaker dust mesh for iPhone 12.', N'Thép không gỉ, lưới loa', 25000, 10000, 50, 500, N'/images/products/ICvaLinhKienMain/IC7.jpg', 8, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (78, N'IC Đèn iPhone 8 Plus', N'iPhone 8 Plus Backlight IC', N'Chip điều khiển đèn màn hình iPhone 8 Plus.', N'Backlight IC for iPhone 8 Plus.', N'Backlight IC', 120000, 75000, 40, 80, N'/images/products/ICvaLinhKienMain/IC8.jpg', 8, N'Apple', N'Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (79, N'Cáp home vật lý iPhone 7/8', N'iPhone 7/8 Physical Home Button Flex', N'Nút home vật lý thay thế, không hỗ trợ vân tay.', N'Physical home button flex without Touch ID support.', N'Nút bấm, cáp home', 95000, 45000, 36, 120, N'/images/products/ICvaLinhKienMain/IC9.jpg', 8, N'Apple Linh kiện', N'Trắng/Đen', N'Mới', N'Active', 1, @CreatedAt, NULL),
    (80, N'IC CPU A15 Bionic (Tháo máy)', N'Pulled A15 Bionic CPU IC', N'Vi xử lý A15 tháo từ main, dùng cho kỹ thuật main chuyên sâu.', N'Pulled A15 Bionic processor for advanced board repairs.', N'A15 Bionic, tháo máy', 3500000, 2800000, 22, 5, N'/images/products/ICvaLinhKienMain/IC10.jpg', 8, N'Apple', N'Gốc', N'Bóc máy', N'Active', 1, @CreatedAt, NULL);
SET IDENTITY_INSERT [dbo].[Products] OFF;
GO

INSERT INTO [dbo].[ProductImages] ([ProductId], [ImageUrl], [AltText], [IsPrimary], [SortOrder], [CreatedAt])
SELECT [Id], [ImageUrl], [NameVi], CAST(1 AS bit), 0, SYSUTCDATETIME()
FROM [dbo].[Products]
WHERE [Id] BETWEEN 1 AND 80
ORDER BY [Id];
GO

CREATE INDEX [IX_CartItems_ProductId] ON [dbo].[CartItems] ([ProductId]);
CREATE INDEX [IX_CartItems_UserId] ON [dbo].[CartItems] ([UserId]);
CREATE INDEX [IX_Notifications_UserId] ON [dbo].[Notifications] ([UserId]);
CREATE INDEX [IX_OrderDetails_OrderId] ON [dbo].[OrderDetails] ([OrderId]);
CREATE INDEX [IX_OrderDetails_ProductId] ON [dbo].[OrderDetails] ([ProductId]);
CREATE INDEX [IX_Orders_UserId] ON [dbo].[Orders] ([UserId]);
CREATE INDEX [IX_ProductImages_ProductId] ON [dbo].[ProductImages] ([ProductId]);
CREATE INDEX [IX_Products_CategoryId] ON [dbo].[Products] ([CategoryId]);
CREATE INDEX [IX_Products_SupplierId] ON [dbo].[Products] ([SupplierId]);
CREATE INDEX [IX_Receipts_ProductId] ON [dbo].[Receipts] ([ProductId]);
CREATE INDEX [IX_Receipts_SupplierId] ON [dbo].[Receipts] ([SupplierId]);
CREATE INDEX [IX_Reviews_OrderId] ON [dbo].[Reviews] ([OrderId]);
CREATE INDEX [IX_Reviews_ProductId] ON [dbo].[Reviews] ([ProductId]);
CREATE INDEX [IX_Reviews_UserId] ON [dbo].[Reviews] ([UserId]);
CREATE INDEX [IX_Suppliers_UserId] ON [dbo].[Suppliers] ([UserId]);
CREATE UNIQUE INDEX [IX_Users_UserName] ON [dbo].[Users] ([UserName]);
GO

INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260513090754_InitialCreate', N'8.0.8');
GO

-- Script lấy toàn bộ 80 linh kiện điện thoại theo 8 nhóm.
SELECT
    c.[Id] AS [CategoryId],
    c.[NameVi] AS [CategoryNameVi],
    p.[Id] AS [ProductId],
    p.[NameVi],
    p.[Brand],
    p.[Price],
    p.[ImportPrice],
    p.[DiscountPercent],
    p.[Stock],
    p.[ImageUrl]
FROM [dbo].[Products] AS p
INNER JOIN [dbo].[Categories] AS c ON c.[Id] = p.[CategoryId]
WHERE p.[Id] BETWEEN 1 AND 80
ORDER BY c.[Id], p.[Id];
GO

-- Kiểm tra mỗi nhóm có đúng 10 sản phẩm.
SELECT
    c.[Id] AS [CategoryId],
    c.[NameVi] AS [CategoryNameVi],
    COUNT(p.[Id]) AS [TotalProducts]
FROM [dbo].[Categories] AS c
LEFT JOIN [dbo].[Products] AS p ON p.[CategoryId] = c.[Id]
GROUP BY c.[Id], c.[NameVi]
ORDER BY c.[Id];
GO
