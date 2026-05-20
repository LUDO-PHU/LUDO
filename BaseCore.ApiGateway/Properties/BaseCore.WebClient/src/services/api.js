import axios from 'axios';

// Dùng Vite proxy: tất cả /api/* → http://localhost:5000/api/*
// Không hard-code port, tránh CORS issue
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// INTERCEPTOR 1: Tự động đính kèm Token vào Header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// INTERCEPTOR 2: Token hết hạn hoặc sai quyền → về trang Login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Token không hợp lệ hoặc đã hết hạn!');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// =============================================
// AUTH
// =============================================
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// =============================================
// USERS
// =============================================
export const userApi = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    updateProfile: (data) => api.put('/users/profile', data),
};

// =============================================
// PRODUCTS
// =============================================
export const productApi = {
    getAll: (params) => api.get('/products', { params }),
    search: (params) => api.get('/products/search', { params }),
    getMine: (params) => api.get('/products/search', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
};

// =============================================
// CATEGORIES
// =============================================
export const categoryApi = {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// =============================================
// ORDERS
// =============================================
export const orderApi = {
    create: (data) => api.post('/orders', data),
    checkout: (data) => api.post('/orders/checkout', data),
    getMyOrders: () => api.get('/orders'),
    getAll: () => api.get('/orders'),
    search: (params) => api.get('/orders/search', { params }),
    getById: (id) => api.get(`/orders/${id}`),
    updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
    // Endpoint riêng để hủy đơn (Frontend gọi)
    cancel: (id) => api.put(`/orders/${id}/cancel`),
    confirm: (id) => api.put(`/orders/${id}/confirm`),
    reject: (id, reason) => api.put(`/orders/${id}/reject`, { cancelReason: reason }),
    complete: (id) => api.put(`/orders/${id}/complete`),
};

// =============================================
// RECEIPTS
// =============================================
export const receiptApi = {
    getAll: () => api.get('/receipts'),
    getMy: (params) => api.get('/receipts/my', { params }),
    search: (params) => api.get('/receipts/search', { params }),
    create: (data) => api.post('/receipts', data),
    updateStatus: (id, status) => api.put(`/receipts/${id}/status`, { status }),
    approve: (id) => api.put(`/receipts/${id}/approve`),
    reject: (id, reason) => api.put(`/receipts/${id}/reject`, { cancelReason: reason }),
    cancel: (id) => api.put(`/receipts/${id}/cancel`),
};

// =============================================
// CART (API backend — lưu DB, không dùng localStorage)
// CartItemDto: { id, productId, productName, imageUrl, price, quantity, total }
// =============================================
export const cartApi = {
    // GET /api/cart → ApiResponse<List<CartItemDto>>
    getCart: () => api.get('/cart'),

    // POST /api/cart/add → ApiResponse<bool>
    addItem: (productId, quantity = 1) => api.post('/cart/add', { productId, quantity }),

    // PUT /api/cart/items/{productId} → ApiResponse<bool>
    updateItem: (productId, quantity) => api.put(`/cart/items/${productId}`, { quantity }),

    // DELETE /api/cart/items/{productId} → ApiResponse<bool>
    removeItem: (productId) => api.delete(`/cart/items/${productId}`),

    // DELETE /api/cart/clear → ApiResponse<bool>
    clearCart: () => api.delete('/cart/clear'),
};

// =============================================
// NOTIFICATIONS
// =============================================
export const notificationApi = {
    // GET /api/notifications → ApiResponse<List<NotificationDto>>
    getAll: () => api.get('/notifications'),

    // PATCH /api/notifications/{id}/read
    markRead: (id) => api.patch(`/notifications/${id}/read`),

    // PATCH /api/notifications/read-all
    markAllRead: () => api.patch('/notifications/read-all'),
};

// =============================================
// BANNERS
// =============================================
export const bannerApi = {
    getActive: (position) => api.get('/banners', { params: { position } }),
};

// =============================================
// REVIEWS
// =============================================
export const reviewApi = {
    getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
    getMyReviews: () => api.get('/reviews/me'),
    create: (data) => api.post('/reviews', data),
};

export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats'),
    getSupplierStats: () => api.get('/supplier/dashboard'),
};

export default api;
