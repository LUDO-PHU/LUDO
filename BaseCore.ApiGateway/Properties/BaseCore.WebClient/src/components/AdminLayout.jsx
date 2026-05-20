import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Mặc định ngôn ngữ tiếng Việt (Đã gỡ bỏ tính năng chuyển đổi)
    const lang = 'vi';

    // Đã rút gọn thư viện ngôn ngữ vì chỉ dùng Tiếng Việt
    const t = {
        dashboard: 'Bảng điều khiển',
        products: user?.userType === 1 ? 'Quản lý Sản phẩm' : 'Sản phẩm của tôi',
        orders: 'Quản lý Đơn hàng',
        receipts: user?.userType === 1 ? 'Duyệt Biên Lai' : 'Gửi Biên Lai',
        categories: 'Danh mục',
        users: 'Khách hàng',
        adminRole: 'Quản trị viên',
        supplierRole: 'Nhà cung cấp',
        logout: 'Đăng xuất'
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/admin', icon: '📊', label: t.dashboard, roles: [1, 2] },
        { path: '/admin/products', icon: '📦', label: t.products, roles: [1, 2] },
        { path: '/admin/receipts', icon: '🧾', label: t.receipts, roles: [1, 2] },
        { path: '/admin/orders', icon: '🛒', label: t.orders, roles: [1] },
        { path: '/admin/categories', icon: '📂', label: t.categories, roles: [1] },
        { path: '/admin/users', icon: '👥', label: t.users, roles: [1] },
    ];

    const allowedMenus = menuItems.filter(m => m.roles.includes(user?.userType));

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6', width: '100%' }}>

            {/* ─── SIDEBAR DARK THEME TỐI ƯU ─── */}
            <div style={{
                width: '260px',
                background: '#1a1a2e',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                position: 'sticky', // Cố định thanh bên khi cuộn chuột
                top: 0,
                height: '100vh',    // Ép dài 100% màn hình
                boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
                zIndex: 100
            }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#e85d04', letterSpacing: '1px' }}>
                        📱 PhoneStore
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', fontWeight: 600, letterSpacing: '1.5px' }}>
                        {user?.userType === 1 ? 'ADMIN PANEL' : 'SUPPLIER PANEL'}
                    </div>
                </div>

                <div style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                    {allowedMenus.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                    borderRadius: '8px', textDecoration: 'none',
                                    color: isActive ? '#fff' : '#9ca3af',
                                    background: isActive ? '#e85d04' : 'transparent',
                                    fontWeight: isActive ? '600' : '500',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? '0 4px 6px rgba(232, 93, 4, 0.3)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e85d04', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {user?.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                {user?.userType === 1 ? t.adminRole : t.supplierRole}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                        <i className="fa fa-sign-out-alt"></i> {t.logout}
                    </button>
                </div>
            </div>

            {/* ─── NỘI DUNG CHÍNH (Chiếm phần còn lại) ─── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: 'calc(100% - 260px)' }}>
                <Outlet context={{ lang }} />
            </div>
        </div>
    );
};

export default AdminLayout;