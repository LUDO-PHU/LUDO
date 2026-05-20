export const readValue = (source, ...keys) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

export const formatVnd = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export const finalPrice = (product) =>
    Math.round((Number(product?.price || 0)) * (1 - Number(product?.discountPercent || 0) / 100));

export const getProductImages = (product) => {
    const rawImages = readValue(product, 'images', 'Images', 'productImages', 'ProductImages') || [];
    const urls = [];

    const pushUrl = (url) => {
        const value = typeof url === 'string' ? url.trim() : '';
        if (value && !urls.some(item => item.toLowerCase() === value.toLowerCase())) {
            urls.push(value);
        }
    };

    const mainImage = readValue(product, 'mainImage', 'MainImage', 'productMainImage', 'ProductMainImage', 'imageUrl', 'ImageUrl');
    pushUrl(mainImage);

    if (Array.isArray(rawImages)) {
        rawImages
            .slice()
            .sort((a, b) => Number(Boolean(b.isPrimary ?? b.IsPrimary)) - Number(Boolean(a.isPrimary ?? a.IsPrimary))
                || Number(a.sortOrder ?? a.SortOrder ?? 0) - Number(b.sortOrder ?? b.SortOrder ?? 0))
            .forEach(image => pushUrl(readValue(image, 'imageUrl', 'ImageUrl')));
    }

    return urls;
};

export const getMainImage = (product) =>
    readValue(product, 'mainImage', 'MainImage', 'productMainImage', 'ProductMainImage', 'imageUrl', 'ImageUrl') || getProductImages(product)[0] || '';

export const PRODUCT_STATUS = {
    Active: { label: 'Đang bán', badge: 'badge-completed' },
    OutOfStock: { label: 'Hết hàng', badge: 'badge-pending' },
    Inactive: { label: 'Ngừng hoạt động', badge: 'badge-cancelled' },
    Incoming: { label: 'Đang nhập', badge: 'badge-shipping' },
};

export const ORDER_STATUS = {
    Pending: { label: 'Chờ xác nhận', badge: 'badge-pending' },
    Shipping: { label: 'Đang giao', badge: 'badge-shipping' },
    Completed: { label: 'Giao thành công', badge: 'badge-completed' },
    Cancelled: { label: 'Đã hủy', badge: 'badge-cancelled' },
};

export const RECEIPT_STATUS = {
    PendingAdminReview: { label: 'Chờ quản trị duyệt', badge: 'badge-pending' },
    ApprovedByAdmin: { label: 'Quản trị đã nhận', badge: 'badge-completed' },
    RejectedByAdmin: { label: 'Quản trị từ chối', badge: 'badge-rejected' },
    CancelledBySupplier: { label: 'Nhà cung cấp đã hủy', badge: 'badge-cancelled' },
};

export const REQUEST_STATUS = {
    Pending: { label: 'Chờ nhà cung cấp xử lý', badge: 'badge-pending' },
    ApprovedBySupplier: { label: 'Nhà cung cấp đã duyệt', badge: 'badge-shipping' },
    RejectedBySupplier: { label: 'Nhà cung cấp từ chối', badge: 'badge-rejected' },
    ReceiptCreated: { label: 'Đã tạo biên lai', badge: 'badge-shipping' },
    Completed: { label: 'Hoàn tất', badge: 'badge-completed' },
    Cancelled: { label: 'Đã hủy', badge: 'badge-cancelled' },
};

export const roleLabel = (userType) => {
    if (Number(userType) === 1) return 'Quản trị viên';
    if (Number(userType) === 2) return 'Nhà cung cấp';
    return 'Khách hàng';
};

export const activeLabel = (isActive) => isActive ? 'Đang hoạt động' : 'Ngừng hoạt động';
