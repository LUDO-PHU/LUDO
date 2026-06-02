import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PolicyModal from './PolicyModal';
import { cartApi } from '../services/api';

export default function MainLayout() {
    const [showPolicy, setShowPolicy] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'vi');

    useEffect(() => {
        localStorage.setItem('app_lang', lang);
    }, [lang]);

    const t = {
        vi: { policy: "📋 Chính sách", orders: "Đơn hàng", logout: "Đăng xuất" },
        en: { policy: "📋 Chính sách", orders: "Đơn hàng", logout: "Đăng xuất" }
    };

    const updateCartCount = async () => {
        if (!user || user.userType !== 0) {
            setCartCount(0);
            return;
        }
        try {
            const res = await cartApi.getCart();
            const items = res.data?.data || [];
            setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
        } catch {
            setCartCount(0);
        }
    };

    useEffect(() => {
        updateCartCount();
        window.addEventListener('cart:changed', updateCartCount);
        return () => {
            window.removeEventListener('cart:changed', updateCartCount);
        };
    }, [user]);

    return (
        <div className="customer-page">
            <nav className="shop-navbar" style={{
                background: 'linear-gradient(90deg, #0ea5e9 0%, #1e3a8a 100%)',
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.2)',
                position: 'sticky',
                top: 0,
                zIndex: 1000
            }}>
                <div className="nav-inner" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', padding: '12px 20px', justifyContent: 'space-between' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Link to="/customer/home" style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', textDecoration: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            📱 PhoneStore
                        </Link>

                        {     }
                        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.1)', padding: '3px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <button
                                onClick={() => setLang('vi')}
                                style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '9px', cursor: 'pointer',
                                    background: lang === 'vi' ? '#ffffff' : 'transparent',
                                    color: lang === 'vi' ? '#1e3a8a' : '#ffffff',
                                    transition: '0.3s'
                                }}
                            >VI</button>
                            <button
                                onClick={() => setLang('en')}
                                style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '9px', cursor: 'pointer',
                                    background: lang === 'en' ? '#ffffff' : 'transparent',
                                    color: lang === 'en' ? '#1e3a8a' : '#ffffff',
                                    transition: '0.3s'
                                }}
                            >TV</button>
                        </div>

                        {      }
                        <button
                            style={{
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: '#ffffff', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                            }}
                            onClick={() => setShowPolicy(true)}
                        >
                            {t[lang].policy}
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                        {      }
                        <Link to="/customer/orders" style={{ textDecoration: 'none', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '700', fontSize: '14px' }}>
                            {t[lang].orders}
                        </Link>

                        <Link to="/customer/cart" style={{ position: 'relative', fontSize: '22px', textDecoration: 'none' }}>
                            🛒
                            {cartCount > 0 && (
                                <span style={{ position: 'absolute', top: '-8px', right: '-12px', background: '#ef4444', color: '#ffffff', fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        <div style={{ width: '2px', height: '20px', background: 'rgba(255,255,255,0.2)' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar" style={{
                                width: '34px', height: '34px', background: 'rgba(255,255,255,0.2)',
                                color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '900', border: '1px solid rgba(255,255,255,0.5)'
                            }}>
                                {user?.name?.charAt(0) || 'U'}
                            </div>

                            {      }
                            <button
                                onClick={() => { logout(); navigate('/login'); }}
                                style={{ border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}
                            >
                                {t[lang].logout}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}

            <main style={{ maxWidth: '1280px', margin: '30px auto', minHeight: '80vh', padding: '0 20px' }}>
                <Outlet context={{ lang }} />
            </main>
        </div>
    );
}
