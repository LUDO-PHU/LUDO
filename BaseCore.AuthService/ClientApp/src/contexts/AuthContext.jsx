import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.role = normalizeRole(parsedUser);
            setUser(parsedUser);
        }

        setLoading(false);
    }, []);

    const normalizeRole = (userData) => {
        const role = (userData.role || '').toLowerCase();
        if (role === 'admin') return 'admin';
        if (role === 'user' || role === 'customer') return 'user';

        // Nếu backend dùng UserType: 1 = admin, 2 = user/customer
        if (userData.userType === 1 || userData.UserType === 1) return 'admin';
        if (userData.userType === 2 || userData.UserType === 2) return 'user';

        return 'user';
    };

    const login = async (username, password) => {
        try {
            const response = await authApi.login(username, password);
            const userData = response.data;

            userData.role = normalizeRole(userData);

            localStorage.setItem('token', userData.token);
            localStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            const message = error.response?.data?.message || 'Đăng nhập thất bại';
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        setUser(null);
    };

    const isAdmin = () => user?.role === 'admin';

    const value = {
        user,
        login,
        logout,
        isAdmin,
        isAuthenticated: !!user,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
