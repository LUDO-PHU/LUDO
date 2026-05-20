USE [BaseCoreSales];
GO

-- ==============================================================================
-- 1. XÓA DỮ LIỆU CŨ VÀ RESET IDENTITY
-- ==============================================================================
DELETE FROM [dbo].[OrderDetails];
DELETE FROM [dbo].[Receipts];
DELETE FROM [dbo].[Orders];
DELETE FROM [dbo].[Products];
DELETE FROM [dbo].[Categories];
GO

DBCC CHECKIDENT ('[dbo].[OrderDetails]', RESEED, 0);
DBCC CHECKIDENT ('[dbo].[Receipts]', RESEED, 0);
DBCC CHECKIDENT ('[dbo].[Orders]', RESEED, 0);
DBCC CHECKIDENT ('[dbo].[Products]', RESEED, 0);
DBCC CHECKIDENT ('[dbo].[Categories]', RESEED, 0);
GO

-- ==============================================================================
-- 2. TẠO DANH MỤC LINH KIỆN (8 DANH MỤC)
-- ==============================================================================
SET IDENTITY_INSERT [dbo].[Categories] ON;
INSERT INTO [dbo].[Categories] ([Id], [Name], [Description]) VALUES 
(1, N'Màn hình bộ', N'Màn hình nguyên bộ zin hãng, zin ép kính, linh kiện loại 1'),
(2, N'Pin điện thoại', N'Pin dung lượng chuẩn, pin nén, pin Pisen cho iPhone, Samsung'),
(3, N'Vỏ & Sườn máy', N'Vỏ bộ, khung sườn, nắp lưng các dòng smartphone'),
(4, N'Cụm Camera', N'Camera trước, camera sau zin bóc máy'),
(5, N'Cáp chân sạc & Mic', N'Cáp đuôi sạc, cáp nối main, cụm chân sạc và mic thoại'),
(6, N'Mặt kính & Cảm ứng', N'Kính ép màn hình, kính cảm ứng các loại'),
(7, N'Loa & Chuông', N'Loa trong (loa thoại), loa ngoài (chuông), cáp loa'),
(8, N'IC & Linh kiện Main', N'IC nguồn, IC Wifi, IC Audio và các linh kiện nhỏ trên bo mạch');
SET IDENTITY_INSERT [dbo].[Categories] OFF;
GO

-- ==============================================================================
-- 3. TẠO SẢN PHẨM LINH KIỆN (80 SẢN PHẨM)
-- ==============================================================================
SET IDENTITY_INSERT [dbo].[Products] ON;
INSERT INTO [dbo].[Products] 
([Id], [Name], [Price], [ImportPrice], [OldPrice], [Stock], [ImageUrl], [Description], [Brand], [DiscountPercent], [Specifications], [Color], [Condition], [SupplierId], [Status], [ImportedAt], [CategoryId], [PointReward], [InstallmentAvailable]) 
VALUES
-- === DANH MỤC 1: MÀN HÌNH BỘ ===
(1, N'Màn hình iPhone 13 Pro Max Zin', 8500000, 7200000, 9000000, 20, '/images/products/ManHinh/MH1.jpg', N'Màn hình zin bóc máy, hiển thị sắc nét', 'Apple', 5, N'OLED, 120Hz', N'Đen', N'Zin bóc máy', 1, 1, GETDATE(), 1, 50, 1),
(2, N'Màn hình Samsung S22 Ultra Zin Hãng', 5200000, 4500000, 5800000, 15, '/images/products/ManHinh/MH2.jpg', N'Màn hình kèm khung sườn zin hãng', 'Samsung', 10, N'Dynamic AMOLED 2X', N'Đen', N'Mới 100%', 1, 1, GETDATE(), 1, 30, 1),
(3, N'Màn hình Oppo Reno8 Z Linh kiện', 1200000, 950000, 1500000, 50, '/images/products/ManHinh/MH3.jpg', N'Màn hình linh kiện loại 1, hiển thị đẹp', 'Oppo', 20, N'AMOLED', N'Đen', N'Mới', 2, 1, GETDATE(), 1, 10, 0),
(4, N'Màn hình iPhone 11 Pro Incell', 1100000, 850000, 1300000, 100, '/images/products/ManHinh/MH4.jpg', N'Màn hình Incell JK chất lượng cao', 'Apple', 15, N'LCD Incell', N'Đen', N'Mới', 2, 1, GETDATE(), 1, 5, 0),
(5, N'Màn hình Redmi Note 11 Pro 4G', 1350000, 1100000, 1600000, 30, '/images/products/ManHinh/MH5.jpg', N'Màn hình nguyên bộ zin', 'Xiaomi', 15, N'AMOLED', N'Đen', N'Mới', 1, 1, GETDATE(), 1, 10, 0),
(6, N'Màn hình iPhone X GX OLED', 950000, 750000, 1100000, 60, '/images/products/ManHinh/MH6.jpg', N'Màn hình thương hiệu GX nổi tiếng', 'Apple', 13, N'OLED Hard', N'Đen', N'Mới', 1, 1, GETDATE(), 1, 5, 0),
(7, N'Màn hình Vivo V23e Zin', 1450000, 1200000, 1700000, 25, '/images/products/ManHinh/MH7.jpg', N'Màn hình zin công ty', 'Vivo', 14, N'AMOLED', N'Đen', N'Mới', 2, 1, GETDATE(), 1, 10, 0),
(8, N'Màn hình iPhone 7 Plus Zin ép kính', 650000, 450000, 850000, 80, '/images/products/ManHinh/MH8.jpg', N'Màn hình zin, đã ép lại kính mới', 'Apple', 23, N'Retina LCD', N'Trắng/Đen', N'Đã sửa chữa', 1, 1, GETDATE(), 1, 5, 0),
(9, N'Màn hình Samsung A52 Zin', 1800000, 1550000, 2100000, 20, '/images/products/ManHinh/MH9.jpg', N'Màn hình zin sắc nét', 'Samsung', 14, N'Super AMOLED', N'Đen', N'Mới', 2, 1, GETDATE(), 1, 15, 0),
(10, N'Màn hình iPhone 12 Pro Max Zin bóc', 5500000, 4800000, 6000000, 10, '/images/products/ManHinh/MH10.jpg', N'Màn tháo máy, chưa qua sửa chữa', 'Apple', 8, N'OLED', N'Đen', N'Bóc máy', 1, 1, GETDATE(), 1, 40, 1),

-- === DANH MỤC 2: PIN ĐIỆN THOẠI ===
(11, N'Pin iPhone 11 Pisen Dung lượng cao', 650000, 420000, 850000, 100, '/images/products/PinDienThoai/PDT1.jpg', N'Bảo hành 12 tháng, an toàn cháy nổ', 'Pisen', 23, N'3500 mAh', N'Vàng', N'Mới', 1, 1, GETDATE(), 2, 5, 0),
(12, N'Pin iPhone XS Max Zin', 450000, 300000, 600000, 50, '/images/products/PinDienThoai/PDT2.jpg', N'Pin zin dung lượng chuẩn', 'Apple', 25, N'3174 mAh', N'Đen', N'Mới', 1, 1, GETDATE(), 2, 5, 0),
(13, N'Pin Samsung Note 20 Ultra Zin', 350000, 220000, 500000, 40, '/images/products/PinDienThoai/PDT3.jpg', N'Pin zin chính hãng Samsung', 'Samsung', 30, N'4500 mAh', N'Trắng', N'Mới', 2, 1, GETDATE(), 2, 5, 0),
(14, N'Pin Oppo F11 Pro Zin', 280000, 180000, 400000, 60, '/images/products/PinDienThoai/PDT4.jpg', N'Pin dung lượng 4000mAh', 'Oppo', 30, N'4000 mAh', N'Đen', N'Mới', 2, 1, GETDATE(), 2, 3, 0),
(15, N'Pin iPhone 12 Pro Max Pisen', 850000, 600000, 1050000, 30, '/images/products/PinDienThoai/PDT5.jpg', N'Pin Pisen chính hãng kèm cáp', 'Pisen', 19, N'3687 mAh', N'Vàng', N'Mới', 1, 1, GETDATE(), 2, 10, 0),
(16, N'Pin Xiaomi Poco X3 Pro Zin', 320000, 210000, 450000, 45, '/images/products/PinDienThoai/PDT6.jpg', N'Pin sạc nhanh, cầm pin tốt', 'Xiaomi', 28, N'5160 mAh', N'Đen', N'Mới', 1, 1, GETDATE(), 2, 5, 0),
(17, N'Pin Huawei Nova 3i Zin', 250000, 150000, 350000, 50, '/images/products/PinDienThoai/PDT7.jpg', N'Thay thế khi máy nhanh hết pin', 'Huawei', 28, N'3340 mAh', N'Trắng', N'Mới', 2, 1, GETDATE(), 2, 2, 0),
(18, N'Pin iPad Pro 11 inch 2020', 850000, 650000, 1100000, 20, '/images/products/PinDienThoai/PDT8.jpg', N'Pin zin cho máy tính bảng', 'Apple', 22, N'7538 mAh', N'Đen', N'Mới', 1, 1, GETDATE(), 2, 15, 0),
(19, N'Pin Vsmart Joy 3 Zin', 240000, 140000, 350000, 70, '/images/products/PinDienThoai/PDT9.jpg', N'Linh kiện thay thế chuẩn', 'Vsmart', 31, N'5000 mAh', N'Đen', N'Mới', 2, 1, GETDATE(), 2, 2, 0),
(20, N'Pin iPhone 6S dung lượng siêu cao', 350000, 200000, 500000, 150, '/images/products/PinDienThoai/PDT10.jpg', N'Pin siêu bền, dùng lâu hơn zin', 'Pisen', 30, N'2200 mAh', N'Vàng', N'Mới', 1, 1, GETDATE(), 2, 5, 0),

-- === DANH MỤC 3: VỎ & SƯỜN MÁY ===
(21, N'Vỏ iPhone 11 Pro Max Xanh Rêu', 750000, 500000, 950000, 30, '/images/products/VoVaSuonMay/VSM1.jpg', N'Vỏ đầy đủ nút, gạt rung', 'Apple', 21, N'Hợp kim nhôm', N'Xanh rêu', N'Mới', 1, 1, GETDATE(), 3, 10, 0),
(22, N'Sườn Samsung S21 Ultra', 450000, 300000, 600000, 25, '/images/products/VoVaSuonMay/VSM2.jpg', N'Sườn giữa zin hãng', 'Samsung', 25, N'Kim loại', N'Đen', N'Mới', 1, 1, GETDATE(), 3, 5, 0),
(23, N'Nắp lưng kính iPhone 12 Pro Max', 350000, 180000, 500000, 100, '/images/products/VoVaSuonMay/VSM3.jpg', N'Kính thay mặt lưng sau', 'Apple', 30, N'Kính cường lực', N'Xanh Đại Dương', N'Mới', 2, 1, GETDATE(), 3, 2, 0),
(24, N'Bộ vỏ Oppo F9 Tím', 220000, 130000, 300000, 40, '/images/products/VoVaSuonMay/VSM4.jpg', N'Gồm nắp lưng và khung sườn', 'Oppo', 26, N'Nhựa ABS', N'Tím', N'Mới', 2, 1, GETDATE(), 3, 2, 0),
(25, N'Vỏ độ iPhone XR lên 14 Pro', 1200000, 850000, 1500000, 15, '/images/products/VoVaSuonMay/VSM5.jpg', N'Vỏ độ ngoại hình cực giống', 'Apple Custom', 20, N'Độ ngoại hình', N'Tím', N'Mới', 1, 1, GETDATE(), 3, 20, 0),
(26, N'Khung sườn Apple Watch Series 6', 950000, 700000, 1200000, 10, '/images/products/VoVaSuonMay/VSM6.jpg', N'Khung nhôm zin bóc máy', 'Apple', 20, N'Nhôm 44mm', N'Xanh', N'Bóc máy', 1, 1, GETDATE(), 3, 15, 0),
(27, N'Nắp lưng Samsung S20 FE', 180000, 100000, 250000, 60, '/images/products/VoVaSuonMay/VSM7.jpg', N'Nắp lưng nhựa zin', 'Samsung', 28, N'Nhựa', N'Xanh', N'Mới', 2, 1, GETDATE(), 3, 1, 0),
(28, N'Kính lưng mặt sau iPhone 13 Pro', 290000, 150000, 450000, 80, '/images/products/VoVaSuonMay/VSM8.jpg', N'Thay thế khi kính lưng bể', 'Apple', 35, N'Kính', N'Vàng', N'Mới', 1, 1, GETDATE(), 3, 2, 0),
(29, N'Vỏ bộ Nokia 6700 Gold', 1500000, 1100000, 2000000, 5, '/images/products/VoVaSuonMay/VSM9.jpg', N'Linh kiện loại cao cấp nhất', 'Nokia', 25, N'Mạ vàng', N'Vàng', N'Mới', 2, 1, GETDATE(), 3, 30, 0),
(30, N'Vỏ khung viền iPad Air 4', 1800000, 1400000, 2200000, 8, '/images/products/VoVaSuonMay/VSM10.jpg', N'Vỏ zin cho iPad', 'Apple', 18, N'Nhôm', N'Xám', N'Mới', 1, 1, GETDATE(), 3, 25, 0),
-- === DANH MỤC 4: CỤM CAMERA ===
(31, N'Camera sau iPhone 12 Pro Max', 1850000, 1550000, 2200000, 15, '/images/products/CumCamera/CC1.jpg', N'Cụm 3 camera zin bóc máy', 'Apple', 16, N'12MP x 3', N'Gốc', N'Zin bóc', 1, 1, GETDATE(), 4, 25, 1),
(32, N'Camera sau Samsung S21 Ultra', 1450000, 1200000, 1800000, 10, '/images/products/CumCamera/CC2.jpg', N'Cụm camera chính 108MP', 'Samsung', 19, N'108MP', N'Gốc', N'Zin', 2, 1, GETDATE(), 4, 20, 1),
(33, N'Camera trước iPhone 11', 450000, 320000, 650000, 30, '/images/products/CumCamera/CC3.jpg', N'Camera selfie kèm cáp cảm biến', 'Apple', 30, N'12MP', N'Gốc', N'Mới', 1, 1, GETDATE(), 4, 5, 0),
(34, N'Cụm camera trước FaceID iPhone X', 950000, 750000, 1250000, 12, '/images/products/CumCamera/CC4.jpg', N'Dùng thay thế khi lỗi FaceID/Camera', 'Apple', 24, N'Cụm FaceID', N'Gốc', N'Zin bóc', 2, 1, GETDATE(), 4, 15, 0),
(35, N'Kính camera iPhone 14 Pro Max', 120000, 50000, 200000, 200, '/images/products/CumCamera/CC5.jpg', N'Mặt kính bảo vệ camera ngoài', 'Apple', 40, N'Sapphire Glass', N'Tím', N'Mới', 1, 1, GETDATE(), 4, 1, 0),
(36, N'Camera sau Oppo Reno7 Zin', 550000, 420000, 750000, 20, '/images/products/CumCamera/CC6.jpg', N'Camera zin độ nét cao', 'Oppo', 26, N'64MP', N'Gốc', N'Mới', 2, 1, GETDATE(), 4, 8, 0),
(37, N'Camera sau Xiaomi Redmi Note 10 Pro', 680000, 520000, 850000, 18, '/images/products/CumCamera/CC7.jpg', N'Cụm camera 108MP zin', 'Xiaomi', 20, N'108MP', N'Gốc', N'Mới', 1, 1, GETDATE(), 4, 10, 0),
(38, N'Camera trước Samsung A71', 250000, 160000, 400000, 40, '/images/products/CumCamera/CC8.jpg', N'Thay khi camera mờ, đốm', 'Samsung', 37, N'32MP', N'Gốc', N'Mới', 2, 1, GETDATE(), 4, 2, 0),
(39, N'Cụm Camera bóc máy iPhone 13', 1550000, 1300000, 1800000, 8, '/images/products/CumCamera/CC9.jpg', N'Hàng tháo máy linh kiện chuẩn', 'Apple', 14, N'12MP Dual', N'Gốc', N'Bóc máy', 1, 1, GETDATE(), 4, 20, 1),
(40, N'Mắt kính camera rời Note 20 Ultra', 95000, 35000, 150000, 100, '/images/products/CumCamera/CC10.jpg', N'Kính rời cho kỹ thuật viên', 'Samsung', 36, N'Kính', N'Đen', N'Mới', 2, 1, GETDATE(), 4, 0, 0),

-- === DANH MỤC 5: CÁP CHÂN SẠC ===
(41, N'Cụm chân sạc iPhone 12 Pro Max', 450000, 320000, 600000, 40, '/images/products/CapChanSacVaMic/CCS1.jpg', N'Thay thế khi máy không nhận sạc', 'Apple', 25, N'Cụm Zin', N'Đen', N'Mới', 1, 1, GETDATE(), 5, 5, 0),
(42, N'Cáp đuôi sạc Samsung Note 10 Plus', 280000, 180000, 450000, 50, '/images/products/CapChanSacVaMic/CCS2.jpg', N'Cáp chân sạc kèm mic thoại', 'Samsung', 37, N'USB-C', N'Gốc', N'Zin', 1, 1, GETDATE(), 5, 3, 0),
(43, N'Cụm chân sạc Oppo F1s', 120000, 65000, 200000, 100, '/images/products/CapChanSacVaMic/CCS3.jpg', N'Linh kiện sửa chữa phổ thông', 'Oppo', 40, N'Micro-USB', N'Gốc', N'Mới', 2, 1, GETDATE(), 5, 1, 0),
(44, N'Cáp nối main iPhone 11 Pro', 250000, 150000, 400000, 30, '/images/products/CapChanSacVaMic/CCS4.jpg', N'Dây cáp truyền tín hiệu main', 'Apple', 37, N'Cáp dẻo', N'Đen', N'Mới', 1, 1, GETDATE(), 5, 2, 0),
(45, N'Cáp sạc iPad Gen 8', 350000, 250000, 550000, 25, '/images/products/CapChanSacVaMic/CCS5.jpg', N'Cáp Lightning zin iPad', 'Apple', 36, N'Cáp zin', N'Gốc', N'Mới', 2, 1, GETDATE(), 5, 5, 0),
(46, N'Cụm sạc Xiaomi Redmi 9 Zin', 150000, 95000, 250000, 60, '/images/products/CapChanSacVaMic/CCS6.jpg', N'Hỗ trợ sạc nhanh đúng chuẩn', 'Xiaomi', 40, N'USB-C', N'Gốc', N'Mới', 1, 1, GETDATE(), 5, 1, 0),
(47, N'Cáp sạc Apple Watch Series 4', 450000, 300000, 650000, 15, '/images/products/CapChanSacVaMic/CCS7.jpg', N'Cáp nội bộ cho thợ sửa', 'Apple', 30, N'Cáp cảm ứng', N'Gốc', N'Mới', 2, 1, GETDATE(), 5, 5, 0),
(48, N'Cáp tai nghe chân sạc iPhone 6S', 180000, 100000, 300000, 80, '/images/products/CapChanSacVaMic/CCS8.jpg', N'Cụm gồm chân sạc, mic và tai nghe', 'Apple', 40, N'Cụm sạc', N'Trắng', N'Mới', 1, 1, GETDATE(), 5, 2, 0),
(49, N'Bo mạch sạc Vivo Y11 Zin', 140000, 80000, 250000, 45, '/images/products/CapChanSacVaMic/CCS9.jpg', N'Bo sạc linh kiện zin hãng', 'Vivo', 44, N'Micro-USB', N'Gốc', N'Mới', 2, 1, GETDATE(), 5, 1, 0),
(50, N'Cáp nút nguồn iPhone 11', 220000, 130000, 350000, 50, '/images/products/CapChanSacVaMic/CCS10.jpg', N'Cáp phím nguồn và đèn flash', 'Apple', 37, N'Cáp dẻo', N'Gốc', N'Mới', 1, 1, GETDATE(), 5, 2, 0),
-- === DANH MỤC 6: MẶT KÍNH & CẢM ỨNG ===
(51, N'Mặt kính iPhone 14 Pro Max (Ép)', 450000, 250000, 700000, 100, '/images/products/MatKinhVaCamUng/MK1.jpg', N'Kính dùng để ép khi bể kính', 'Apple', 35, N'Kính cường lực', N'Đen', N'Mới', 1, 1, GETDATE(), 6, 5, 0),
(52, N'Kính cảm ứng iPad Gen 9', 650000, 450000, 950000, 30, '/images/products/MatKinhVaCamUng/MK2.jpg', N'Cảm ứng rời cho iPad', 'Apple', 31, N'Cảm ứng', N'Trắng/Đen', N'Mới', 1, 1, GETDATE(), 6, 10, 0),
(53, N'Kính Samsung S22 Ultra (Cong)', 550000, 350000, 850000, 40, '/images/products/MatKinhVaCamUng/MK3.jpg', N'Kính cong chuẩn zin hãng', 'Samsung', 35, N'Gorilla Glass Victus', N'Đen', N'Mới', 2, 1, GETDATE(), 6, 5, 0),
(54, N'Kính cảm ứng Apple Watch Series 7', 850000, 600000, 1200000, 20, '/images/products/MatKinhVaCamUng/MK4.jpg', N'Kính kèm cảm ứng 41/45mm', 'Apple', 29, N'Ion-X Glass', N'Đen', N'Mới', 1, 1, GETDATE(), 6, 15, 0),
(55, N'Kính Oppo A94', 120000, 55000, 250000, 150, '/images/products/MatKinhVaCamUng/MK5.jpg', N'Kính ép màn hình giá sỉ', 'Oppo', 52, N'Kính cường lực', N'Đen', N'Mới', 2, 1, GETDATE(), 6, 1, 0),
(56, N'Kính cảm ứng Lenovo Tab M10', 350000, 200000, 550000, 25, '/images/products/MatKinhVaCamUng/MK6.jpg', N'Cảm ứng máy tính bảng', 'Lenovo', 36, N'Cảm ứng rời', N'Đen', N'Mới', 1, 1, GETDATE(), 6, 5, 0),
(57, N'Kính Xiaomi 12 Pro', 320000, 180000, 500000, 35, '/images/products/MatKinhVaCamUng/MK7.jpg', N'Kính ép màn cong cao cấp', 'Xiaomi', 36, N'Kính Victus', N'Đen', N'Mới', 2, 1, GETDATE(), 6, 3, 0),
(58, N'Kính cảm ứng Z Flip 3 (Màn phụ)', 450000, 300000, 700000, 15, '/images/products/MatKinhVaCamUng/MK8.jpg', N'Kính cho màn hình phụ bên ngoài', 'Samsung', 35, N'Kính', N'Đen', N'Mới', 1, 1, GETDATE(), 6, 5, 0),
(59, N'Kính Huawei P30 Pro', 250000, 150000, 450000, 30, '/images/products/MatKinhVaCamUng/MK9.jpg', N'Kính ép màn cong', 'Huawei', 44, N'Kính cường lực', N'Đen', N'Mới', 2, 1, GETDATE(), 6, 2, 0),
(60, N'Keo OCA iPhone 13 Pro Max (Xấp)', 150000, 90000, 250000, 200, '/images/products/MatKinhVaCamUng/MK10.jpg', N'Keo dán màn hình chuyên dụng', 'Generic', 40, N'OCA 250um', N'Trong suốt', N'Mới', 1, 1, GETDATE(), 6, 1, 0),

-- === DANH MỤC 7: LOA & CHUÔNG ===
(61, N'Loa trong iPhone 13 Pro Max', 350000, 250000, 550000, 50, '/images/products/LoaVaChuong/LC1.jpg', N'Loa thoại zin nghe rõ, không rè', 'Apple', 36, N'Loa thoại', N'Gốc', N'Mới', 1, 1, GETDATE(), 7, 5, 0),
(62, N'Cụm loa chuông Samsung S20 Ultra', 250000, 160000, 400000, 40, '/images/products/LoaVaChuong/LC2.jpg', N'Cụm loa ngoài (chuông)', 'Samsung', 37, N'Loa ngoài', N'Đen', N'Mới', 1, 1, GETDATE(), 7, 3, 0),
(63, N'Loa ngoài Oppo A54', 120000, 75000, 200000, 60, '/images/products/LoaVaChuong/LC3.jpg', N'Chuông báo linh kiện loại 1', 'Oppo', 40, N'Loa ngoài', N'Gốc', N'Mới', 2, 1, GETDATE(), 7, 1, 0),
(64, N'Cáp loa trong iPhone 11', 280000, 180000, 450000, 35, '/images/products/LoaVaChuong/LC4.jpg', N'Cáp loa kèm cảm biến tiệm cận', 'Apple', 37, N'Cáp cảm biến', N'Đen', N'Mới', 1, 1, GETDATE(), 7, 5, 0),
(65, N'Loa trong Samsung A51', 85000, 45000, 150000, 100, '/images/products/LoaVaChuong/LC5.jpg', N'Loa đàm thoại thay thế', 'Samsung', 43, N'Loa nhỏ', N'Gốc', N'Mới', 2, 1, GETDATE(), 7, 1, 0),
(66, N'Cụm loa chuông Redmi Note 11', 140000, 95000, 250000, 50, '/images/products/LoaVaChuong/LC6.jpg', N'Cụm loa ngoài Xiaomi zin', 'Xiaomi', 44, N'Loa ngoài', N'Đen', N'Mới', 1, 1, GETDATE(), 7, 2, 0),
(67, N'Loa trong iPhone XS Max', 190000, 120000, 350000, 60, '/images/products/LoaVaChuong/LC7.jpg', N'Loa nghe gọi chất lượng zin', 'Apple', 45, N'Loa thoại', N'Gốc', N'Mới', 1, 1, GETDATE(), 7, 2, 0),
(68, N'Loa ngoài iPad Mini 5', 320000, 220000, 500000, 20, '/images/products/LoaVaChuong/LC8.jpg', N'Cặp loa trái phải iPad Mini', 'Apple', 36, N'Dual Speaker', N'Gốc', N'Mới', 2, 1, GETDATE(), 7, 5, 0),
(69, N'Loa trong Vivo Y20', 75000, 35000, 120000, 100, '/images/products/LoaVaChuong/LC9.jpg', N'Linh kiện thay thế nhanh', 'Vivo', 37, N'Loa nhỏ', N'Gốc', N'Mới', 2, 1, GETDATE(), 7, 1, 0),
(70, N'Rung iPhone 12 Pro Max (Taptic Engine)', 550000, 400000, 750000, 25, '/images/products/LoaVaChuong/LC10.jpg', N'Cục rung zin bóc máy', 'Apple', 26, N'Taptic Engine', N'Bạc', N'Zin bóc', 1, 1, GETDATE(), 7, 10, 0),

-- === DANH MỤC 8: IC & LINH KIỆN MAIN ===
(71, N'IC Nguồn iPhone 13 Pro Max (PMU)', 850000, 650000, 1200000, 30, '/images/products/ICvaLinhKienMain/IC1.jpg', N'IC quản lý nguồn chính', 'Apple', 29, N'Chip quản lý nguồn', N'Bạc', N'Mới', 1, 1, GETDATE(), 8, 20, 0),
(72, N'IC Wifi iPhone 11', 350000, 250000, 500000, 50, '/images/products/ICvaLinhKienMain/IC2.jpg', N'Chip xử lý kết nối không dây', 'Apple', 30, N'Chip Wifi/BT', N'Bạc', N'Mới', 1, 1, GETDATE(), 8, 10, 0),
(73, N'Ổ cứng (NAND) iPhone 12 128GB', 1200000, 950000, 1600000, 20, '/images/products/ICvaLinhKienMain/IC3.jpg', N'Dùng để nâng cấp hoặc thay thế bộ nhớ', 'Apple', 25, N'128GB NAND', N'Đen', N'Mới', 2, 1, GETDATE(), 8, 30, 0),
(74, N'IC Audio iPhone 7 Plus', 150000, 90000, 250000, 100, '/images/products/ICvaLinhKienMain/IC4.jpg', N'Sửa lỗi mất âm thanh/mic', 'Apple', 40, N'Chip âm thanh', N'Đen', N'Mới', 2, 1, GETDATE(), 8, 5, 0),
(75, N'IC Sạc (U2) iPhone X', 180000, 110000, 300000, 150, '/images/products/ICvaLinhKienMain/IC5.jpg', N'Chip quản lý USB/Sạc', 'Apple', 40, N'Tristar IC', N'Trắng', N'Mới', 1, 1, GETDATE(), 8, 5, 0),
(76, N'Khay SIM iPhone 14 Pro Max', 150000, 80000, 250000, 60, '/images/products/ICvaLinhKienMain/IC6.jpg', N'Khay đựng SIM màu tím zin', 'Apple', 40, N'Nhôm CNC', N'Tím', N'Mới', 1, 1, GETDATE(), 8, 2, 0),
(77, N'Lưới loa chống bụi iPhone 12', 25000, 10000, 50000, 500, '/images/products/ICvaLinhKienMain/IC7.jpg', N'Lưới chắn bụi loa thoại', 'Apple', 50, N'Thép không gỉ', N'Đen', N'Mới', 2, 1, GETDATE(), 8, 0, 0),
(78, N'IC Đèn iPhone 8 Plus', 120000, 75000, 200000, 80, '/images/products/ICvaLinhKienMain/IC8.jpg', N'Chip điều khiển đèn màn hình', 'Apple', 40, N'Backlight IC', N'Đen', N'Mới', 1, 1, GETDATE(), 8, 3, 0),
(79, N'Cáp home vật lý iPhone 7/8', 95000, 45000, 150000, 120, '/images/products/ICvaLinhKienMain/IC9.jpg', N'Nút home vật lý (không vân tay)', 'Apple Linh kiện', 36, N'Nút bấm', N'Trắng/Đen', N'Mới', 2, 1, GETDATE(), 8, 1, 0),
(80, N'IC CPU A15 Bionic (Tháo máy)', 3500000, 2800000, 4500000, 5, '/images/products/ICvaLinhKienMain/IC10.jpg', N'Vi xử lý A15 tháo từ main icloud', 'Apple', 22, N'A15 Bionic', N'Gốc', N'Bóc máy', 1, 1, GETDATE(), 8, 100, 0);
SET IDENTITY_INSERT [dbo].[Products] OFF;
GO

-- ==============================================================================
-- 4. TẠO ĐƠN HÀNG MẪU
-- ==============================================================================
SET IDENTITY_INSERT [dbo].[Orders] ON;
INSERT INTO [dbo].[Orders] 
([Id], [UserId], [OrderDate], [TotalAmount], [Status], [CustomerName], [CustomerPhone], [ShippingAddress], [Note], [ConfirmedAt], [DeliveryFrom], [DeliveryTo])
VALUES
(1, 10, GETDATE() - 1, 9150000, 1, N'Cửa hàng sửa chữa Mobile 24h', '0909112233', N'Số 10 Võ Văn Ngân, Thủ Đức, TPHCM', N'Giao gấp trong sáng nay', GETDATE() - 1, GETDATE(), GETDATE() + 1),
(2, 11, GETDATE(), 650000, 2, N'Lê Văn Cường', '0988776655', N'789 Cách Mạng Tháng 8, TPHCM', N'', GETDATE(), GETDATE(), GETDATE() + 2);
SET IDENTITY_INSERT [dbo].[Orders] OFF;
GO

SET IDENTITY_INSERT [dbo].[OrderDetails] ON;
INSERT INTO [dbo].[OrderDetails] 
([Id], [OrderId], [ProductId], [Quantity], [UnitPrice], [ImportPrice])
VALUES
(1, 1, 1, 1, 8500000, 7200000), -- 1 Màn hình 13 Pro Max
(2, 1, 11, 1, 650000, 420000),  -- 1 Pin Pisen iPhone 11
(3, 2, 11, 1, 650000, 420000);  -- 1 Pin Pisen iPhone 11
SET IDENTITY_INSERT [dbo].[OrderDetails] OFF;
GO

SET IDENTITY_INSERT [dbo].[Receipts] ON;
INSERT INTO [dbo].[Receipts] 
([Id], [SupplierId], [ProductId], [Quantity], [ImportPrice], [ImageUrl], [Note], [Status], [CreatedAt], [ApprovedAt])
VALUES
(1, 1, 1, 20, 7200000, '', N'Nhập màn hình zin tháng 5', 1, GETDATE() - 5, GETDATE() - 4),
(2, 2, 11, 100, 420000, '', N'Nhập Pin Pisen chính ngạch', 1, GETDATE() - 5, GETDATE() - 4);
SET IDENTITY_INSERT [dbo].[Receipts] OFF;
GO