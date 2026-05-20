export const FALLBACK_CATEGORIES = [
    { id: 11, nameVi: 'Cáp sạc' },
    { id: 12, nameVi: 'Kính cường lực' },
    { id: 13, nameVi: 'Ốp lưng' },
    { id: 14, nameVi: 'Sạc dự phòng' },
];

export const FALLBACK_PRODUCTS = [
    {
        id: 9001,
        categoryId: 11,
        categoryNameVi: 'Cáp sạc',
        nameVi: 'Cáp sạc nhanh USB-C bọc dù',
        price: 129000,
        discountPercent: 12,
        stock: 42,
        imageUrl: '/images/products/capsacnhanh.jpg',
        description: 'Cáp sạc nhanh bền, phù hợp cho nhu cầu sử dụng hằng ngày.',
    },
    {
        id: 9002,
        categoryId: 11,
        categoryNameVi: 'Cáp sạc',
        nameVi: 'Cáp sạc đa năng 3 đầu',
        price: 99000,
        discountPercent: 0,
        stock: 36,
        imageUrl: '/images/products/capsac.jpg',
        description: 'Cáp sạc đa chuẩn cho nhiều thiết bị di động.',
    },
    {
        id: 9003,
        categoryId: 12,
        categoryNameVi: 'Kính cường lực',
        nameVi: 'Kính cường lực chống nhìn trộm',
        price: 159000,
        discountPercent: 18,
        stock: 28,
        imageUrl: '/images/products/kinhcuongluc.jpg',
        description: 'Kính cường lực trong, độ phủ tốt, chống trầy xước.',
    },
    {
        id: 9004,
        categoryId: 12,
        categoryNameVi: 'Kính cường lực',
        nameVi: 'Kính cường lực full màn hình',
        price: 139000,
        discountPercent: 10,
        stock: 31,
        imageUrl: '/images/products/kinhcuongluc2.jpg',
        description: 'Bảo vệ màn hình với bề mặt mượt và độ trong cao.',
    },
    {
        id: 9005,
        categoryId: 13,
        categoryNameVi: 'Ốp lưng',
        nameVi: 'Ốp lưng trong chống sốc',
        price: 119000,
        discountPercent: 0,
        stock: 52,
        imageUrl: '/images/products/oplung.jpg',
        description: 'Ốp lưng mỏng nhẹ, bám tay, bảo vệ cạnh máy.',
    },
    {
        id: 9006,
        categoryId: 13,
        categoryNameVi: 'Ốp lưng',
        nameVi: 'Ốp lưng MagSafe viền nhám',
        price: 189000,
        discountPercent: 15,
        stock: 24,
        imageUrl: '/images/products/oplung2.jpg',
        description: 'Ốp lưng viền nhám, tương thích sạc không dây.',
    },
    {
        id: 9007,
        categoryId: 14,
        categoryNameVi: 'Sạc dự phòng',
        nameVi: 'Sạc dự phòng 10.000mAh mini',
        price: 349000,
        discountPercent: 20,
        stock: 18,
        imageUrl: '/images/products/sacduphong.jpg',
        description: 'Pin dự phòng nhỏ gọn, đủ dùng cho cả ngày di chuyển.',
    },
];

export const FALLBACK_BANNERS = [
    { id: 1, imageUrl: '/images/products/sacduphong.jpg' },
    { id: 2, imageUrl: '/images/products/capsacnhanh.jpg' },
    { id: 3, imageUrl: '/images/products/oplung2.jpg' },
];

export const getImageUrl = (url, apiBaseUrl = 'http://localhost:5001') => {
    if (!url) return '/images/products/capsac.jpg';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/images/') || url.startsWith('/icons') || url.startsWith('/favicon')) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const formatVnd = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const finalPrice = (product) =>
    Math.round((product?.price || 0) * (1 - (product?.discountPercent || 0) / 100));
