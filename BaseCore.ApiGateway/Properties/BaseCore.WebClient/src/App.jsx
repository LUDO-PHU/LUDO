import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

import ProtectedRoute from './components/ProtectedRoute';
import CustomerLayout from './components/CustomerLayout';
import AdminLayout from './components/AdminLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Receipts from './pages/Receipts';
import Categories from './pages/Categories';
import Users from './pages/Users';

// Pages Customer
import CustomerHome from './pages/customer/Home';
import ProductDetail from './pages/customer/ProductDetail';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import MyOrders from './pages/customer/MyOrders';
import Profile from './pages/customer/Profile';

const PublicRoute = ({ children }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) return null;

    if (isAuthenticated) {
        return <Navigate to={(user?.userType === 1 || user?.userType === 2) ? "/admin" : "/customer/home"} replace />;
    }
    return children;
};

export default function App() {
    return (
        <Router>
            <ToastProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<Navigate to="/customer/home" replace />} />
                        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

                        <Route path="/admin" element={<ProtectedRoute roles={[1, 2]}><AdminLayout /></ProtectedRoute>}>
                            <Route index element={<Dashboard />} />
                            <Route path="products" element={<Products />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="receipts" element={<Receipts />} />

                            <Route path="categories" element={<Categories />} />
                            <Route path="users" element={<Users />} />
                        </Route>

                        <Route path="/customer" element={<CustomerLayout />}>
                            <Route index element={<CustomerHome />} />
                            <Route path="home" element={<CustomerHome />} />
                            <Route path="products/:id" element={<ProductDetail />} />
                            <Route path="cart" element={<ProtectedRoute roles={[0]}><Cart /></ProtectedRoute>} />
                            <Route path="checkout" element={<ProtectedRoute roles={[0]}><Checkout /></ProtectedRoute>} />
                            <Route path="orders" element={<ProtectedRoute roles={[0]}><MyOrders /></ProtectedRoute>} />

                            <Route path="profile" element={<ProtectedRoute roles={[0]}><Profile /></ProtectedRoute>} />
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </AuthProvider>
            </ToastProvider>
        </Router>
    );
}
