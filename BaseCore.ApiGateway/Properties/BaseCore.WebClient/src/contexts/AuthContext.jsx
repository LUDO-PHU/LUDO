import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Khôi phục session từ localStorage khi reload trang
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsAuthenticated(true);
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // Backend trả về: ApiResponse<LoginResponseDto>
            // res.data = { success: true, data: { token, expiresAt, user: AuthUserDto } }
            const res = await authApi.login(username, password);
            const body = res.data;

            if (!body?.success || !body?.data) {
                return { success: false, message: body?.message || 'Đăng nhập thất bại.' };
            }

            const { token, user: authUser } = body.data;

            if (!token || !authUser) {
                return { success: false, message: 'Dữ liệu phản hồi từ server không hợp lệ.' };
            }

            // Chuẩn hóa user object để toàn bộ Frontend dùng nhất quán:
            // authUser từ backend có: id, username, fullName, email, phone, role, userType
            const userData = {
                id: authUser.id,
                userName: authUser.username,       // dùng để hiển thị tên đăng nhập
                name: authUser.fullName || authUser.username, // dùng để hiển thị
                email: authUser.email,
                phone: authUser.phone,
                role: authUser.role,               // "Admin" | "Supplier" | "User"
                userType: authUser.userType,       // 0=User, 1=Admin, 2=Supplier
                supplierId: authUser.supplierId,
                companyName: authUser.companyName,
                tier: 'Đồng',                      // Mặc định hạng đồng (Phase 5 sẽ mở rộng)
            };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            setIsAuthenticated(true);

            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || 'Sai tài khoản hoặc mật khẩu!';
            return { success: false, message: msg };
        }
    };

    // Cập nhật thông tin user sau khi chỉnh sửa Profile
    const updateUser = (newData) => {
        const updated = { ...user, ...newData };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);