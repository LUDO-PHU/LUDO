import axios from 'axios';

const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target || {}, key);

const getPayload = (input) => {
    if (input && typeof input === 'object' && hasOwn(input, 'data') && hasOwn(input, 'status') && hasOwn(input, 'config')) {
        return input.data;
    }
    return input;
};

export const unwrapApiData = (input, fallback = null) => {
    const payload = getPayload(input);
    if (payload && typeof payload === 'object' && hasOwn(payload, 'success') && hasOwn(payload, 'data')) {
        return payload.data ?? fallback;
    }
    return payload ?? fallback;
};

export const unwrapPagedData = (input) => {
    const data = unwrapApiData(input, {});
    if (Array.isArray(data)) {
        return {
            items: data,
            totalCount: data.length,
            page: 1,
            pageSize: data.length || 1,
            totalPages: 1,
        };
    }

    const page = Number(data?.page || 1);
    const pageSize = Number(data?.pageSize || 10);
    const totalCount = Number(data?.totalItems ?? data?.totalCount ?? 0);

    return {
        items: Array.isArray(data?.items) ? data.items : [],
        totalCount,
        page,
        pageSize,
        totalPages: Number(data?.totalPages || Math.ceil(totalCount / pageSize) || 1),
    };
};

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── AUTH ──────────────────────────────────────────────────────
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// ── USERS ─────────────────────────────────────────────────────
export const userApi = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
    updateProfile: (data) => api.put('/users/profile', data),
};

// ── PRODUCTS ──────────────────────────────────────────────────
export const productApi = {
    getAll: (params) => api.get('/products', { params }),
    search: (params) => api.get('/products/search', { params }),
    getMine: (params) => api.get('/supplier/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    getImages: (id) => api.get(`/products/${id}/images`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    createSupplier: (data) => api.post('/supplier/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    updateSupplier: (id, data) => api.put(`/supplier/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`/products/${id}`),
};

// ── CATEGORIES ────────────────────────────────────────────────
export const categoryApi = {
    getAll: () => api.get('/categories'),
    search: (params) => api.get('/categories/search', { params }),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// ── ORDERS ────────────────────────────────────────────────────
export const orderApi = {
    create: (data) => api.post('/orders', data),
    checkout: (data) => api.post('/orders/checkout', data),
    getMyOrders: (params) => api.get('/orders/my-orders', { params }),
    search: (params) => api.get('/admin/orders', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
    cancel: (id, reason) => api.put(`/orders/${id}/cancel`, reason ? { cancelReason: reason } : {}),
    confirm: (id) => api.put(`/orders/${id}/confirm`),
    reject: (id, reason) => api.put(`/orders/${id}/reject`, { cancelReason: reason }),
    received: (id) => api.put(`/orders/${id}/received`),
    complete: (id) => api.put(`/orders/${id}/received`),
};

// ── RECEIPTS ──────────────────────────────────────────────────
export const receiptApi = {
    getAll: (params) => api.get('/admin/receipts', { params }),
    getMy: (params) => api.get('/supplier/receipts', { params }),
    search: (params) => api.get('/receipts/search', { params }),
    searchAdmin: (params) => api.get('/admin/receipts', { params }),
    searchSupplier: (params) => api.get('/supplier/receipts', { params }),
    getById: (id) => api.get(`/receipts/${id}`),
    create: (data) => api.post('/supplier/receipts', data),
    updateStatus: (id, status) => api.put(`/receipts/${id}/status`, { status }),
    approve: (id) => api.post(`/admin/receipts/${id}/approve`),
    reject: (id, reason) => api.post(`/admin/receipts/${id}/reject`, { cancelReason: reason }),
    cancel: (id) => api.put(`/receipts/${id}/cancel`),
};

export const supplierRequestApi = {
    searchAdmin: (params) => api.get('/admin/supplier-requests', { params }),
    create: (data) => api.post('/admin/supplier-requests', data),
    searchSupplier: (params) => api.get('/supplier/requests', { params }),
    approve: (id) => api.post(`/supplier/requests/${id}/approve`),
    reject: (id, rejectionReason) => api.post(`/supplier/requests/${id}/reject`, { rejectionReason }),
};

// ── SUPPLIERS ─────────────────────────────────────────────────
export const supplierApi = {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    toggleActive: (id) => api.patch(`/suppliers/${id}/toggle-active`),
    getMe: () => api.get('/suppliers/me'),
};

// ── CART ──────────────────────────────────────────────────────
export const cartApi = {
    getCart: () => api.get('/cart'),
    addItem: (productId, quantity = 1) => api.post('/cart/add', { productId, quantity }),
    updateItem: (productId, quantity) => api.put(`/cart/items/${productId}`, { quantity }),
    removeItem: (productId) => api.delete(`/cart/items/${productId}`),
    clearCart: () => api.delete('/cart/clear'),
};

// ── NOTIFICATIONS ─────────────────────────────────────────────
export const notificationApi = {
    getAll: () => api.get('/notifications'),
    getSupplier: () => api.get('/supplier/notifications'),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/read-all'),
};

// ── BANNERS ───────────────────────────────────────────────────
export const bannerApi = {
    getActive: (position) => api.get('/banners', { params: { position } }),
};

// ── REVIEWS ───────────────────────────────────────────────────
export const reviewApi = {
    getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
    getMyReviews: () => api.get('/reviews/me'),
    create: (data) => api.post('/reviews', data),
};

// ── DASHBOARD ─────────────────────────────────────────────────
export const dashboardApi = {
    getStats: () => api.get('/admin/dashboard'),
    getSupplierStats: () => api.get('/supplier/dashboard'),
};

export const revenueApi = {
    getAdmin: () => api.get('/admin/revenue'),
};

export default api;
