const API_BASE_URL = 'http://127.0.0.1:5001';

export const getImageUrl = (url, apiBaseUrl = API_BASE_URL) => {
    if (!url) return '/images/products/capsac.jpg';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('/icons') || url.startsWith('/favicon') || url.startsWith('/banner/')) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const formatVnd = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const finalPrice = (product) =>
    Math.round((product?.price || 0) * (1 - (product?.discountPercent || 0) / 100));
