import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = user?.userType === 1;
    const isSupplier = user?.userType === 2;

    const handleLogout = () => { logout(); navigate('/login'); };

    const adminMenus = [
        { path: '/admin', icon: '📊', label: 'Tổng quan', exact: true },
        { path: '/admin/products', icon: '📦', label: 'Sản phẩm' },
        { path: '/admin/orders', icon: '🛒', label: 'Đơn hàng' },
        { path: '/admin/returns', icon: '📦', label: 'Trả hàng' },
        { path: '/admin/receipts', icon: '🧾', label: 'Biên lai' },
        { path: '/admin/suppliers', icon: '🏢', label: 'Nhà cung cấp' },
        { path: '/admin/categories', icon: '📂', label: 'Danh mục' },
        { path: '/admin/users', icon: '👥', label: 'Người dùng' },
    ];

    const supplierMenus = [
        { path: '/admin/supplier-home', icon: '📊', label: 'Tổng quan', exact: true },
        { path: '/admin/products', icon: '📦', label: 'Sản phẩm của tôi' },
        { path: '/admin/receipts', icon: '🧾', label: 'Biên lai của tôi' },
        { path: '/admin/supplier-requests', icon: '📨', label: 'Yêu cầu' },
    ];

    const menus = isAdmin ? adminMenus : supplierMenus;

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.path;
        return location.pathname.startsWith(item.path);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', width: '100%' }}>
            {    }
            <div style={{
                width: '256px', flexShrink: 0,
                background: isSupplier
                    ? 'linear-gradient(175deg, #020617 0%, #071A2F 52%, #2e1065 100%)'
                    : 'linear-gradient(175deg, #020617 0%, #071A2F 52%, #0B1120 100%)',
                color: '#fff', display: 'flex', flexDirection: 'column',
                position: 'sticky', top: 0, height: '100vh',
                boxShadow: '4px 0 28px rgba(34,211,238,0.16)', zIndex: 100,
            }}>
                {  }
                <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: isSupplier ? 'linear-gradient(135deg, #22D3EE, #a855f7)' : 'linear-gradient(135deg, #00E5FF, #22D3EE)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px', boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
                        }}>⚡</div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>
                                EconentTech
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                                {isAdmin ? 'Bảng quản trị' : 'Cổng nhà cung cấp'}
                            </div>
                        </div>
                    </div>
                </div>

                {  }
                <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                    {menus.map(item => {
                        const active = isActive(item);
                        return (
                            <Link key={item.path} to={item.path} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', borderRadius: '10px',
                                textDecoration: 'none',
                                background: active
                                    ? (isSupplier ? 'linear-gradient(135deg, rgba(34,211,238,0.9), rgba(168,85,247,0.72))' : 'linear-gradient(135deg, rgba(0,229,255,0.9), rgba(34,211,238,0.72))')
                                    : 'transparent',
                                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                                fontWeight: active ? '700' : '500',
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                                boxShadow: active ? '0 0 18px rgba(34,211,238,0.34)' : 'none',
                            }}
                                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseOut={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; } }}
                            >
                                <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {     }
                <div style={{ padding: '16px 16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: isSupplier ? 'linear-gradient(135deg, #22D3EE, #a855f7)' : 'linear-gradient(135deg, #00E5FF, #22D3EE)',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: '800', fontSize: '16px',
                            flexShrink: 0,
                        }}>
                            {(user?.name || user?.fullName || user?.userName || user?.username || 'U').trim().charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                                {user?.name || user?.fullName || user?.userName || user?.username || 'Người dùng'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '1px', lineHeight: 1.35 }}>
                                {isAdmin ? '🛡 Quản trị viên' : '🏢 Nhà cung cấp'}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{
                        width: '100%', padding: '9px', borderRadius: '9px',
                        background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
                        border: '1px solid rgba(239,68,68,0.2)', fontWeight: '600',
                        cursor: 'pointer', fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s', fontFamily: 'inherit',
                    }}
                        onMouseOver={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#fca5a5'; }}
                    >
                        <i className="fa fa-sign-out-alt" /> Đăng xuất
                    </button>
                </div>
            </div>

            {     }
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Outlet />
            </div>
        </div>
    );
};

export default AdminLayout;
