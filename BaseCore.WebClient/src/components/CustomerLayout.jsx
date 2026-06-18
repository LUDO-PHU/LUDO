import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cartApi, notificationApi, productApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { finalPrice, formatVnd, getImageUrl } from '../data/fallbackCatalog';
import { formatAppDateTime } from '../utils/dateTime';
import PolicyModal from './PolicyModal';

const extractOrderCode = (text = '') => {
    const match = text.match(/#?(ORD[0-9A-Z]+)/i);
    return match ? match[1].toUpperCase() : '';
};

const stripOrderCode = (text = '', orderCode = '') => {
    if (!text || !orderCode) return text;
    const codePattern = new RegExp(`#?${orderCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'ig');
    return text.replace(codePattern, '').replace(/\s{2,}/g, ' ').trim();
};

const normalizeText = (text = '') =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getOrderNotificationDisplay = (title, content, orderCode) => {
    if (!orderCode) {
        return { title, message: content };
    }

    const text = normalizeText(`${title} ${content}`);
    const orderLabel = `#${orderCode}`;

    if (text.includes('hoan ve kho') || text.includes('returned') || text.includes('tra hang') || text.includes('hoan tra') || text.includes('hoan ve')) {
        return { title: 'Đơn hàng hoàn về kho', message: `Đơn ${orderLabel} đã hoàn về kho.` };
    }

    if (text.includes('huy') || text.includes('cancel') || text.includes('reject') || text.includes('tu choi')) {
        return { title: 'Đơn hàng đã hủy', message: `Đơn ${orderLabel} đã bị hủy.` };
    }

    if (text.includes('giao thanh cong') || text.includes('hoan tat') || text.includes('nhan hang')) {
        return { title: 'Đơn hàng đã giao', message: `Đơn ${orderLabel} đã giao thành công.` };
    }

    if (text.includes('dang giao') || text.includes('xac nhan') || text.includes('shipping')) {
        return { title: 'Đơn hàng đang giao', message: `Đơn ${orderLabel} đang được giao.` };
    }

    return { title, message: stripOrderCode(content, orderCode) };
};

const CustomerLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const userMenuRef = useRef(null);
    const notiRef = useRef(null);

    const [cartCount, setCartCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const [localKw, setLocalKw] = useState(searchParams.get('keyword') || '');
    const [localMin, setLocalMin] = useState(searchParams.get('minPrice') || '');
    const [localMax, setLocalMax] = useState(searchParams.get('maxPrice') || '');
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'none');
    const [selectedNotification, setSelectedNotification] = useState(null);

    // Live search dropdown (chỉ hiện khi không ở trang home)
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const searchRef = useRef(null);
    const isHomePage = location.pathname.includes('/customer/home');

    const isFocusMode = ['/cart', '/checkout', '/orders', '/profile'].some(path => location.pathname.includes(path));
    const unreadCount = notifications.filter(item => !(item.isRead ?? item.IsRead)).length;
    const tierLabel = user?.tier || user?.memberTier || 'Đồng';
    const tierKey = tierLabel.toLowerCase();
    const tierClass = tierKey.includes('kim')
        ? 'tier-diamond'
        : tierKey.includes('vàng') || tierKey.includes('vang')
            ? 'tier-gold'
            : tierKey.includes('bạc') || tierKey.includes('bac')
                ? 'tier-silver'
                : 'tier-bronze';
    const avatarLetter = (user?.name || user?.fullName || user?.userName || user?.username || 'U').trim().charAt(0).toUpperCase();

    useEffect(() => {
        setLocalKw(searchParams.get('keyword') || '');
        setLocalMin(searchParams.get('minPrice') || '');
        setLocalMax(searchParams.get('maxPrice') || '');
        setSortBy(searchParams.get('sortBy') || 'none');
    }, [searchParams]);

    useEffect(() => {
        // Khi ở trang home: filter bình thường
        if (isHomePage) {
            const handler = setTimeout(() => {
                const currentKw = searchParams.get('keyword') || '';
                const currentMin = searchParams.get('minPrice') || '';
                const currentMax = searchParams.get('maxPrice') || '';

                const minVal = Number(localMin);
                const maxVal = Number(localMax);
                if (localMin && localMax && minVal > maxVal) return;

                if (
                    localKw.trim() !== currentKw.trim() ||
                    localMin !== currentMin ||
                    localMax !== currentMax
                ) {
                    const params = new URLSearchParams(searchParams);
                    if (localKw.trim()) params.set('keyword', localKw.trim()); else params.delete('keyword');
                    if (localMin) params.set('minPrice', localMin); else params.delete('minPrice');
                    if (localMax) params.set('maxPrice', localMax); else params.delete('maxPrice');
                    params.delete('page');
                    navigate(`/customer/home?${params.toString()}`);
                }
            }, 300);
            return () => clearTimeout(handler);
        }

        // Khi KHÔNG ở trang home: hiển thị dropdown kết quả tìm kiếm
        if (!localKw.trim()) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }

        const handler = setTimeout(async () => {
            setIsSearchLoading(true);
            try {
                const minVal = Number(localMin);
                const maxVal = Number(localMax);
                const searchParams = {
                    keyword: localKw.trim(),
                    page: 1,
                    pageSize: 8,
                    minPrice: minVal > 0 ? minVal : undefined,
                    maxPrice: maxVal > 0 ? maxVal : undefined,
                    sortBy: sortBy !== 'none' ? sortBy : undefined,
                };
                const res = await productApi.search(searchParams);
                const paged = unwrapPagedData(res);
                setSearchResults(paged.items.slice(0, 8));
                setIsSearchOpen(true);
            } catch {
                setSearchResults([]);
            } finally {
                setIsSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [localKw, localMin, localMax, sortBy, isHomePage]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
            if (notiRef.current && !notiRef.current.contains(event.target)) {
                setIsNotiOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const refreshCartCount = useCallback(async () => {
        if (!user || user.userType !== 0) {
            setCartCount(0);
            return;
        }

        try {
            const res = await cartApi.getCart();
            const items = res.data?.data || [];
            setCartCount(items.length);
        } catch {
            setCartCount(0);
        }
    }, [user]);

    const loadNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }

        try {
            const res = await notificationApi.getAll();
            const items = unwrapApiData(res, []);
            setNotifications(Array.isArray(items) ? items : []);
        } catch {
            setNotifications([]);
        }
    }, [user]);

    useEffect(() => {
        refreshCartCount();
        window.addEventListener('cart:changed', refreshCartCount);
        return () => window.removeEventListener('cart:changed', refreshCartCount);
    }, [refreshCartCount]);

    useEffect(() => {
        loadNotifications();
        if (!user) return undefined;

        const intervalId = window.setInterval(loadNotifications, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    const commitFilters = () => {
        setIsSearchOpen(false);
        setSearchResults([]);
        const params = new URLSearchParams(searchParams);
        if (localKw.trim()) params.set('keyword', localKw.trim()); else params.delete('keyword');
        if (localMin) params.set('minPrice', localMin); else params.delete('minPrice');
        if (localMax) params.set('maxPrice', localMax); else params.delete('maxPrice');
        if (sortBy !== 'none') params.set('sortBy', sortBy); else params.delete('sortBy');
        params.delete('page');
        navigate(`/customer/home?${params.toString()}`);
    };

    const handleSortChange = (value) => {
        setSortBy(value);
        if (isHomePage) {
            const params = new URLSearchParams(searchParams);
            if (value !== 'none') params.set('sortBy', value); else params.delete('sortBy');
            params.delete('page');
            navigate(`/customer/home?${params.toString()}`);
        }
        // Khi không ở home: sortBy thay đổi sẽ khởi động lại useEffect tìm kiếm
    };

    // Chỉ navigate khi ở trang home; không ở home thì để useEffect tự re-fetch dropdown
    const handlePriceBlur = () => {
        if (isHomePage) {
            commitFilters();
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="customer-shell">
            <header className="store-header">
                <div className="store-header__inner">
                    <Link to="/customer/home" className="brand-mark" aria-label="PhoneStore">
                        <span className="brand-mark__icon"><i className="fa fa-mobile-alt"></i></span>
                        <span className="brand-mark__text">PhoneStore</span>
                    </Link>

                    <div className="store-search" role="search" ref={searchRef}>
                        <div className="store-search__main">
                            <i className="fa fa-search"></i>
                            <input
                                type="text"
                                value={localKw}
                                placeholder="Tìm sản phẩm, linh kiện..."
                                onChange={event => setLocalKw(event.target.value)}
                                onKeyDown={event => event.key === 'Enter' && commitFilters()}
                                onFocus={() => { if (!isHomePage && localKw.trim() && searchResults.length > 0) setIsSearchOpen(true); }}
                            />
                            {/* Dropdown kết quả tìm kiếm trực tiếp */}
                            {!isHomePage && isSearchOpen && (
                                <div className="search-live-dropdown">
                                    {isSearchLoading ? (
                                        <div className="search-live-loading">
                                            <i className="fa fa-spinner fa-spin"></i>
                                            <span>Đang tìm...</span>
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="search-live-empty">
                                            <i className="fa fa-search"></i>
                                            <span>Không tìm thấy sản phẩm nào</span>
                                        </div>
                                    ) : (
                                        <>
                                            {searchResults.map(product => {
                                                const pid = product.id ?? product.Id;
                                                const name = product.nameVi || product.name || product.Name || 'Sản phẩm';
                                                const img = product.imageUrl || product.ImageUrl || '';
                                                const price = finalPrice(product);
                                                const original = Number(product.price ?? product.Price ?? 0);
                                                const hasDiscount = product.discountPercent > 0 && original > 0 && price < original;
                                                return (
                                                    <button
                                                        key={pid}
                                                        type="button"
                                                        className="search-live-item"
                                                        onClick={() => {
                                                            setIsSearchOpen(false);
                                                            setLocalKw('');
                                                            setSearchResults([]);
                                                            navigate(`/customer/products/${pid}`);
                                                        }}
                                                    >
                                                        <div className="search-live-item__img">
                                                            {img ? (
                                                                <img src={getImageUrl(img)} alt={name} onError={e => { e.currentTarget.src = '/images/multi/Error.png'; }} />
                                                            ) : (
                                                                <span className="search-live-item__img-placeholder"><i className="fa fa-image"></i></span>
                                                            )}
                                                        </div>
                                                        <div className="search-live-item__info">
                                                            <span className="search-live-item__name">{name}</span>
                                                            <div className="search-live-item__prices">
                                                                <span className="search-live-item__price">{formatVnd(price)}</span>
                                                                {hasDiscount && <span className="search-live-item__original">{formatVnd(original)}</span>}
                                                            </div>
                                                        </div>
                                                        <i className="fa fa-chevron-right search-live-item__arrow"></i>
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                className="search-live-viewall"
                                                onClick={commitFilters}
                                            >
                                                <i className="fa fa-th-large"></i>
                                                Xem tất cả kết quả cho &ldquo;{localKw}&rdquo;
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <input
                            className="price-input"
                            type="number"
                            value={localMin}
                            placeholder="Từ giá"
                            onChange={event => setLocalMin(event.target.value)}
                            onBlur={handlePriceBlur}
                            onKeyDown={event => event.key === 'Enter' && commitFilters()}
                        />
                        <input
                            className="price-input"
                            type="number"
                            value={localMax}
                            placeholder="Đến giá"
                            onChange={event => setLocalMax(event.target.value)}
                            onBlur={handlePriceBlur}
                            onKeyDown={event => event.key === 'Enter' && commitFilters()}
                        />
                        <select value={sortBy} onChange={event => handleSortChange(event.target.value)} aria-label="Sắp xếp sản phẩm">
                            <option value="none">Mặc định</option>
                            <option value="priceAsc">Giá tăng dần</option>
                            <option value="priceDesc">Giá giảm dần</option>
                            <option value="discountDesc">Giảm nhiều nhất</option>
                        </select>
                    </div>

                    <div className="header-actions">
                        <div className="dropdown-wrap" ref={notiRef}>
                            <button
                                className="icon-button"
                                type="button"
                                title="Thông báo"
                                onClick={() => {
                                    setIsNotiOpen(open => !open);
                                    loadNotifications();
                                }}
                            >
                                <i className="fa fa-bell"></i>
                                {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
                            </button>

                            <div className={`store-dropdown notification-panel ${isNotiOpen ? 'is-open' : ''}`}>
                                <div className="dropdown-title">
                                    <span>Thông báo</span>
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={async event => {
                                                event.stopPropagation();
                                                await notificationApi.markAllRead();
                                                loadNotifications();
                                            }}
                                        >
                                            Đã đọc tất cả
                                        </button>
                                    )}
                                </div>
                                <div className="notification-list">
                                    {notifications.length === 0 ? (
                                        <div className="dropdown-empty">Chưa có thông báo</div>
                                    ) : notifications.map(item => {
                                        const id = item.id ?? item.Id;
                                        const rawTitle = item.title || item.Title || 'Thông báo';
                                        const content = item.content || item.Content || '';
                                        const imageUrl = item.imageUrl || item.ImageUrl || '';
                                        const productName = item.productName || item.ProductName || '';
                                        const orderCode = item.orderCode || item.OrderCode || extractOrderCode(`${rawTitle} ${content}`);
                                        const orderId = item.orderId || item.OrderId;
                                        const isRead = item.isRead ?? item.IsRead;
                                        const targetUrl = item.url || item.Url || (orderId ? `/customer/orders?orderId=${orderId}` : '');
                                        const display = getOrderNotificationDisplay(rawTitle, content, orderCode);
                                        const createdAt = item.createdAt || item.CreatedAt;
                                        const hasImage = Boolean(imageUrl);

                                        return (
                                            <button
                                                type="button"
                                                key={id || `${orderCode}-${createdAt}`}
                                                className={`notification-item ${!isRead ? 'is-unread' : ''}`}
                                                onClick={async () => {
                                                    if (!isRead && id) {
                                                        await notificationApi.markRead(id);
                                                    }
                                                    await loadNotifications();
                                                    
                                                    const isLongMessage = (content && content.length > 60) || (display.message && display.message.length > 60);
                                                    if (isLongMessage) {
                                                        setIsNotiOpen(false);
                                                        setSelectedNotification({
                                                            title: display.title,
                                                            message: content || display.message,
                                                            createdAt,
                                                            targetUrl
                                                        });
                                                    } else if (targetUrl) {
                                                        setIsNotiOpen(false);
                                                        navigate(targetUrl);
                                                    }
                                                }}
                                            >
                                                <div className="notification-entry">
                                                    {hasImage ? (
                                                        <img
                                                            className="notification-thumb"
                                                            src={getImageUrl(imageUrl)}
                                                            alt={productName || display.title}
                                                            onError={event => { event.currentTarget.style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span className="notification-thumb notification-thumb--empty">
                                                            <i className="fa fa-box" />
                                                        </span>
                                                    )}
                                                    <div className="notification-body">
                                                        <strong className="notification-title">{display.title}</strong>
                                                        {orderCode && <span className="notification-order">#{orderCode}</span>}
                                                        {productName && <span className="notification-product">{productName}</span>}
                                                        {display.message && <span className="notification-message">{display.message}</span>}
                                                        <small className="notification-time">{formatAppDateTime(createdAt)}</small>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <Link className="header-link" to="/customer/orders">Đơn hàng</Link>

                        <Link className="icon-button" to="/customer/cart" title="Giỏ hàng">
                            <i className="fa fa-shopping-cart"></i>
                            {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
                        </Link>

                        <div className="dropdown-wrap" ref={userMenuRef}>
                            {user ? (
                                <button className={`user-chip ${tierClass}`} type="button" onClick={() => setIsUserMenuOpen(open => !open)}>
                                    <span className="user-avatar">{avatarLetter}</span>
                                    <span className="user-chip__text">
                                        <strong>{user?.name || 'Khách hàng'}</strong>
                                        <small>{user?.tier ? `Hạng ${user.tier}` : 'Tài khoản'}</small>
                                    </span>
                                    <i className={`fa fa-chevron-${isUserMenuOpen ? 'up' : 'down'}`}></i>
                                </button>
                            ) : (
                                <Link className="user-chip" to="/login">
                                    <span className="user-avatar"><i className="fa fa-user"></i></span>
                                    <span className="user-chip__text">
                                        <strong>Đăng nhập</strong>
                                        <small>Tài khoản</small>
                                    </span>
                                </Link>
                            )}

                            <div className={`store-dropdown user-panel ${isUserMenuOpen ? 'is-open' : ''}`}>
                                <button type="button" onClick={() => { navigate('/customer/profile'); setIsUserMenuOpen(false); }}>
                                    <i className="fa fa-user-edit"></i>
                                    Chỉnh sửa tài khoản
                                </button>
                                <button type="button" className="danger" onClick={handleLogout}>
                                    <i className="fa fa-sign-out-alt"></i>
                                    Đăng xuất
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className={isFocusMode ? 'store-main store-main--narrow' : 'store-main'}>
                <Outlet />
            </main>

            {!isFocusMode && (
                <footer className="store-footer">
                    <div className="store-footer__brand">
                        <Link to="/customer/home" className="store-footer__logo">
                            <span><i className="fa fa-mobile-alt"></i></span>
                            PhoneStore
                        </Link>
                        <p>Linh kiện điện thoại chính hãng, giao nhanh trong ngày, bảo hành minh bạch cho khách lẻ và cửa hàng sửa chữa.</p>
                        <div className="footer-contact-list">
                            <a href="tel:19001234"><i className="fa fa-phone"></i> 1900 0088</a>
                            <a href="mailto:support@phonestore.vn"><i className="fa fa-envelope"></i> support@phonestore.vn</a>
                            <span><i className="fa fa-location-dot"></i> Nghĩa Đô, Hà Nội</span>
                        </div>
                    </div>

                    <div className="store-footer__columns">
                        <div className="store-footer__column">
                            <h4>Chính sách</h4>
                            <button type="button" onClick={() => setShowPolicy(true)}>Bảo hành & đổi trả</button>
                            <button type="button" onClick={() => setShowPolicy(true)}>Giao hàng & thanh toán</button>
                            <button type="button" onClick={() => setShowPolicy(true)}>Quy định kiểm hàng</button>
                        </div>

                        <div className="store-footer__column">
                            <h4>Hỗ trợ khách hàng</h4>
                            <Link to="/customer/orders">Tra cứu đơn hàng</Link>
                            <Link to="/customer/profile">Thông tin tài khoản</Link>
                            <Link to="/customer/cart">Giỏ hàng của bạn</Link>
                        </div>

                        <div className="store-footer__column">
                            <h4>Thanh toán</h4>
                            <div className="footer-badges">
                                <span>COD</span>
                                <span>VNPay</span>
                                <span>Momo</span>
                                <span>Chuyển khoản</span>
                            </div>
                        </div>

                        <div className="store-footer__column">
                            <h4>Nhà tài trợ</h4>
                            <div className="footer-sponsors">
                                <span>Apple Parts</span>
                                <span>Samsung Service</span>
                                <span>Viettel Post</span>
                                <span>J&T Express</span>
                            </div>
                        </div>
                    </div>

                    <div className="store-footer__bottom">
                        <span>© 2026 PhoneStore. Hệ thống bán linh kiện điện thoại.</span>
                        <span>MST: 0318 456 789 · Giờ làm việc: 08:00 - 21:00 hằng ngày</span>
                    </div>
                </footer>
            )}

            {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}
            {selectedNotification && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(2,6,23,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedNotification(null)}>
                    <div style={{ width: 'min(500px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 30px 90px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{selectedNotification.title}</h3>
                            <button onClick={() => setSelectedNotification(null)} style={{ border: 0, background: 'transparent', fontSize: 22, fontWeight: 900, cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <div style={{ padding: 24 }}>
                            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                                {selectedNotification.message}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                                <span>{formatAppDateTime(selectedNotification.createdAt)}</span>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => setSelectedNotification(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>Đóng</button>
                                    {selectedNotification.targetUrl && (
                                        <button 
                                            onClick={() => {
                                                const url = selectedNotification.targetUrl;
                                                setSelectedNotification(null);
                                                navigate(url);
                                            }} 
                                            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0ea5e9', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                            Xem đơn hàng
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerLayout;
