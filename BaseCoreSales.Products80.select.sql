USE [BaseCoreSales];
GO

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NULL
   OR OBJECT_ID(N'[dbo].[Categories]', N'U') IS NULL
   OR COL_LENGTH(N'[dbo].[Products]', N'NameVi') IS NULL
   OR COL_LENGTH(N'[dbo].[Products]', N'ImportPrice') IS NULL
   OR COL_LENGTH(N'[dbo].[Products]', N'DiscountPercent') IS NULL
   OR COL_LENGTH(N'[dbo].[Categories]', N'NameVi') IS NULL
BEGIN
    THROW 51000, N'Database BaseCoreSales chua dung schema hien tai. Hay chay BaseCoreSales.sql truoc, sau do moi chay file SELECT nay.', 1;
END;
GO

-- Lấy toàn bộ 80 linh kiện điện thoại theo 8 nhóm.
SELECT
    c.[Id] AS [CategoryId],
    c.[NameVi] AS [CategoryNameVi],
    p.[Id] AS [ProductId],
    p.[NameVi],
    p.[NameEn],
    p.[Brand],
    p.[Price],
    p.[ImportPrice],
    p.[DiscountPercent],
    p.[Stock],
    p.[Color],
    p.[Condition],
    p.[Status],
    p.[ImageUrl]
FROM [dbo].[Products] AS p
INNER JOIN [dbo].[Categories] AS c ON c.[Id] = p.[CategoryId]
WHERE p.[Id] BETWEEN 1 AND 80
ORDER BY c.[Id], p.[Id];
GO

-- Kiểm tra nhanh số lượng: cần 8 dòng, mỗi dòng 10 sản phẩm.
SELECT
    c.[Id] AS [CategoryId],
    c.[NameVi] AS [CategoryNameVi],
    COUNT(p.[Id]) AS [TotalProducts]
FROM [dbo].[Categories] AS c
LEFT JOIN [dbo].[Products] AS p ON p.[CategoryId] = c.[Id]
GROUP BY c.[Id], c.[NameVi]
ORDER BY c.[Id];
GO

-- Kiểm tra sản phẩm nào thiếu ảnh chính trong bảng ProductImages.
SELECT
    p.[Id],
    p.[NameVi],
    p.[ImageUrl]
FROM [dbo].[Products] AS p
LEFT JOIN [dbo].[ProductImages] AS pi
    ON pi.[ProductId] = p.[Id]
    AND pi.[IsPrimary] = CAST(1 AS bit)
WHERE p.[Id] BETWEEN 1 AND 80
  AND pi.[Id] IS NULL
ORDER BY p.[Id];
GO
