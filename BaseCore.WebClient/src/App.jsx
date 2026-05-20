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
import Suppliers from './pages/Suppliers';
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierRequests from './pages/SupplierRequests';

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

const IndexRedirect = () => {
    const { user } = useAuth();
    if (user?.userType === 2) return <Navigate to="/admin/supplier-home" replace />;
    return <Dashboard />;
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
                            {/* Index: Admin→Dashboard, Supplier→supplier-home */}
                            <Route index element={<IndexRedirect />} />
                            <Route path="products" element={<Products />} />
                            <Route path="orders" element={<ProtectedRoute roles={[1]}><Orders /></ProtectedRoute>} />
                            <Route path="receipts" element={<Receipts />} />
                            <Route path="categories" element={<ProtectedRoute roles={[1]}><Categories /></ProtectedRoute>} />
                            <Route path="users" element={<ProtectedRoute roles={[1]}><Users /></ProtectedRoute>} />
                            <Route path="suppliers" element={<ProtectedRoute roles={[1]}><Suppliers /></ProtectedRoute>} />
                            {/* Supplier portal routes */}
                            <Route path="supplier-home" element={<ProtectedRoute roles={[2]}><SupplierDashboard /></ProtectedRoute>} />
                            <Route path="supplier-requests" element={<ProtectedRoute roles={[2]}><SupplierRequests /></ProtectedRoute>} />
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
