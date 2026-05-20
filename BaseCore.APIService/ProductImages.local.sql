USE [BaseCoreSales];
GO

-- Update product images to use files served by BaseCore.APIService/wwwroot.
-- Public URL format: http://localhost:5001/images/products/<folder>/<file>.jpg

UPDATE p
SET p.[ImageUrl] = v.[ImageUrl]
FROM [dbo].[Products] AS p
INNER JOIN (VALUES
    (1,  N'/images/products/ManHinh/MH1.jpg'),
    (2,  N'/images/products/ManHinh/MH2.jpg'),
    (3,  N'/images/products/ManHinh/MH3.jpg'),
    (4,  N'/images/products/ManHinh/MH4.jpg'),
    (5,  N'/images/products/ManHinh/MH5.jpg'),
    (6,  N'/images/products/ManHinh/MH6.jpg'),
    (7,  N'/images/products/ManHinh/MH7.jpg'),
    (8,  N'/images/products/ManHinh/MH8.jpg'),
    (9,  N'/images/products/ManHinh/MH9.jpg'),
    (10, N'/images/products/ManHinh/MH10.jpg'),

    (11, N'/images/products/PinDienThoai/PDT1.jpg'),
    (12, N'/images/products/PinDienThoai/PDT2.jpg'),
    (13, N'/images/products/PinDienThoai/PDT3.jpg'),
    (14, N'/images/products/PinDienThoai/PDT4.jpg'),
    (15, N'/images/products/PinDienThoai/PDT5.jpg'),
    (16, N'/images/products/PinDienThoai/PDT6.jpg'),
    (17, N'/images/products/PinDienThoai/PDT7.jpg'),
    (18, N'/images/products/PinDienThoai/PDT8.jpg'),
    (19, N'/images/products/PinDienThoai/PDT9.jpg'),
    (20, N'/images/products/PinDienThoai/PDT10.jpg'),

    (21, N'/images/products/VoVaSuonMay/VSM1.jpg'),
    (22, N'/images/products/VoVaSuonMay/VSM2.jpg'),
    (23, N'/images/products/VoVaSuonMay/VSM3.jpg'),
    (24, N'/images/products/VoVaSuonMay/VSM4.jpg'),
    (25, N'/images/products/VoVaSuonMay/VSM5.jpg'),
    (26, N'/images/products/VoVaSuonMay/VSM6.jpg'),
    (27, N'/images/products/VoVaSuonMay/VSM7.jpg'),
    (28, N'/images/products/VoVaSuonMay/VSM8.jpg'),
    (29, N'/images/products/VoVaSuonMay/VSM9.jpg'),
    (30, N'/images/products/VoVaSuonMay/VSM10.jpg'),

    (31, N'/images/products/CumCamera/CC1.jpg'),
    (32, N'/images/products/CumCamera/CC2.jpg'),
    (33, N'/images/products/CumCamera/CC3.jpg'),
    (34, N'/images/products/CumCamera/CC4.jpg'),
    (35, N'/images/products/CumCamera/CC5.jpg'),
    (36, N'/images/products/CumCamera/CC6.jpg'),
    (37, N'/images/products/CumCamera/CC7.jpg'),
    (38, N'/images/products/CumCamera/CC8.jpg'),
    (39, N'/images/products/CumCamera/CC9.jpg'),
    (40, N'/images/products/CumCamera/CC10.jpg'),

    (41, N'/images/products/CapChanSacVaMic/CCS1.jpg'),
    (42, N'/images/products/CapChanSacVaMic/CCS2.jpg'),
    (43, N'/images/products/CapChanSacVaMic/CCS3.jpg'),
    (44, N'/images/products/CapChanSacVaMic/CCS4.jpg'),
    (45, N'/images/products/CapChanSacVaMic/CCS5.jpg'),
    (46, N'/images/products/CapChanSacVaMic/CCS6.jpg'),
    (47, N'/images/products/CapChanSacVaMic/CCS7.jpg'),
    (48, N'/images/products/CapChanSacVaMic/CCS8.jpg'),
    (49, N'/images/products/CapChanSacVaMic/CCS9.jpg'),
    (50, N'/images/products/CapChanSacVaMic/CCS10.jpg'),

    (51, N'/images/products/MatKinhVaCamUng/MK1.jpg'),
    (52, N'/images/products/MatKinhVaCamUng/MK2.jpg'),
    (53, N'/images/products/MatKinhVaCamUng/MK3.jpg'),
    (54, N'/images/products/MatKinhVaCamUng/MK4.jpg'),
    (55, N'/images/products/MatKinhVaCamUng/MK5.jpg'),
    (56, N'/images/products/MatKinhVaCamUng/MK6.jpg'),
    (57, N'/images/products/MatKinhVaCamUng/MK7.jpg'),
    (58, N'/images/products/MatKinhVaCamUng/MK8.jpg'),
    (59, N'/images/products/MatKinhVaCamUng/MK9.jpg'),
    (60, N'/images/products/MatKinhVaCamUng/MK10.jpg'),

    (61, N'/images/products/LoaVaChuong/LC1.jpg'),
    (62, N'/images/products/LoaVaChuong/LC2.jpg'),
    (63, N'/images/products/LoaVaChuong/LC3.jpg'),
    (64, N'/images/products/LoaVaChuong/LC4.jpg'),
    (65, N'/images/products/LoaVaChuong/LC5.jpg'),
    (66, N'/images/products/LoaVaChuong/LC6.jpg'),
    (67, N'/images/products/LoaVaChuong/LC7.jpg'),
    (68, N'/images/products/LoaVaChuong/LC8.jpg'),
    (69, N'/images/products/LoaVaChuong/LC9.jpg'),
    (70, N'/images/products/LoaVaChuong/LC10.jpg'),

    (71, N'/images/products/ICvaLinhKienMain/IC1.jpg'),
    (72, N'/images/products/ICvaLinhKienMain/IC2.jpg'),
    (73, N'/images/products/ICvaLinhKienMain/IC3.jpg'),
    (74, N'/images/products/ICvaLinhKienMain/IC4.jpg'),
    (75, N'/images/products/ICvaLinhKienMain/IC5.jpg'),
    (76, N'/images/products/ICvaLinhKienMain/IC6.jpg'),
    (77, N'/images/products/ICvaLinhKienMain/IC7.jpg'),
    (78, N'/images/products/ICvaLinhKienMain/IC8.jpg'),
    (79, N'/images/products/ICvaLinhKienMain/IC9.jpg'),
    (80, N'/images/products/ICvaLinhKienMain/IC10.jpg')
) AS v([Id], [ImageUrl]) ON v.[Id] = p.[Id];
GO

SELECT [Id], [NameVi], [ImageUrl]
FROM [dbo].[Products]
WHERE [Id] BETWEEN 1 AND 80
ORDER BY [Id];
GO
