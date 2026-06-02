import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateItemDiscount, calculateOrderTotal } from '../../utils/discount';
import { getImageUrl as resolveImageUrl } from '../../data/fallbackCatalog';

const PLACEHOLDER = 'https://placehold.co/80';

const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    return resolveImageUrl(url);
};

const canCheckout = (item) => Boolean(item?.canCheckout ?? item?.CanCheckout);
const canIncreaseQuantity = (item) => Boolean(item?.canIncreaseQuantity ?? item?.CanIncreaseQuantity);
const getPrice = (item) => Number(item?.finalPrice ?? item?.FinalPrice ?? item?.price ?? 0);
const getLineTotal = (item) => Number(item?.lineTotal ?? item?.LineTotal ?? item?.total ?? item?.Total ?? 0);
const getStockText = (item) => item?.stockText ?? item?.StockText ?? '';
const getCheckoutDisabledReason = (item) => item?.checkoutDisabledReason ?? item?.CheckoutDisabledReason ?? '';
const getProductName = (item) => item?.productName ?? item?.ProductName ?? '';
const getCreatedTime = (item) => {
    const value = item?.createdAt ?? item?.CreatedAt ?? '';
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
};
const normalizeSearchText = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const Cart = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState('newest');

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    const loadCart = useCallback(async () => {
        try {
            setLoading(true);
            const res = await cartApi.getCart();
            const items = res.data?.data || [];
            setCart(items);
            setSelectedIds(items.filter(canCheckout).map(item => item.productId));
        } catch {
            showToast('Không thể tải giỏ hàng', 'danger');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const removeItem = async (productId) => {
        if (updatingId) return;
        setUpdatingId(productId);
        try {
            await cartApi.removeItem(productId);
            setCart(prev => prev.filter(item => item.productId !== productId));
            setSelectedIds(prev => prev.filter(id => id !== productId));
            window.dispatchEvent(new Event('cart:changed'));
            showToast('Đã xóa sản phẩm khỏi giỏ', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xóa sản phẩm', 'danger');
        } finally {
            setUpdatingId(null);
        }
    };

    const updateQuantity = async (item, newQty) => {
        if (updatingId) return;

        const productId = item.productId;
        if (newQty <= 0) {
            await removeItem(productId);
            return;
        }

        // Optimistic update: cập nhật số lượng tại chỗ, không reload toàn bộ giỏ
        // để tránh scroll nhảy về đầu trang
        const prevCart = cart;
        setCart(prev => prev.map(i =>
            i.productId === productId
                ? { ...i, quantity: newQty, lineTotal: (i.finalPrice ?? i.FinalPrice ?? i.price ?? 0) * newQty }
                : i
        ));

        setUpdatingId(productId);
        try {
            const res = await cartApi.updateItem(productId, newQty);
            // Nếu API trả về item đã cập nhật, merge vào state
            const updatedItem = res?.data?.data;
            if (updatedItem) {
                setCart(prev => prev.map(i =>
                    i.productId === productId ? { ...i, ...updatedItem } : i
                ));
            }
            window.dispatchEvent(new Event('cart:changed'));
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể cập nhật số lượng', 'danger');
            // Rollback về trạng thái trước nếu lỗi
            setCart(prevCart);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSelectItem = (item) => {
        if (!canCheckout(item)) {
            showToast(getCheckoutDisabledReason(item) || 'Sáº£n pháº©m nÃ y chÆ°a thá»ƒ thanh toÃ¡n', 'warning');
            return;
        }

        setSelectedIds(prev =>
            prev.includes(item.productId)
                ? prev.filter(id => id !== item.productId)
                : [...prev, item.productId]
        );
    };

    const searchQuery = useMemo(() => normalizeSearchText(searchTerm), [searchTerm]);
    const visibleCart = useMemo(() => {
        const filtered = searchQuery
            ? cart.filter(item => {
                const haystack = normalizeSearchText([
                    getProductName(item),
                    item?.productId,
                    getStockText(item),
                    getCheckoutDisabledReason(item)
                ].join(' '));
                return haystack.includes(searchQuery);
            })
            : cart.slice();

        return filtered.sort((a, b) => {
            const priceA = Number(calculateItemDiscount(a, user?.tier).finalPrice ?? getPrice(a));
            const priceB = Number(calculateItemDiscount(b, user?.tier).finalPrice ?? getPrice(b));

            switch (sortMode) {
                case 'price-asc':
                    return priceA - priceB || getCreatedTime(b) - getCreatedTime(a);
                case 'price-desc':
                    return priceB - priceA || getCreatedTime(b) - getCreatedTime(a);
                case 'oldest':
                    return getCreatedTime(a) - getCreatedTime(b);
                case 'newest':
                default:
                    return getCreatedTime(b) - getCreatedTime(a);
            }
        });
    }, [cart, searchQuery, sortMode, user?.tier]);

    const visibleSelectableIds = useMemo(
        () => visibleCart.filter(canCheckout).map(item => item.productId),
        [visibleCart]
    );

    const selectedVisibleCount = visibleSelectableIds.filter(id => selectedIds.includes(id)).length;
    const selectableCount = visibleSelectableIds.length;
    const allVisibleSelected = selectableCount > 0 && selectedVisibleCount === selectableCount;

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, ...visibleSelectableIds])));
            return;
        }

        setSelectedIds(prev => prev.filter(id => !visibleSelectableIds.includes(id)));
    };

    const selectedItems = cart.filter(item => selectedIds.includes(item.productId));
    const { subTotal, totalAmount, isLargeOrder } = calculateOrderTotal(selectedItems, user?.tier);

    const handleCheckoutClick = () => {
        if (selectedItems.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm còn hàng để thanh toán', 'warning');
            return;
        }

        const invalidItem = selectedItems.find(item => !canCheckout(item));
        if (invalidItem) {
            showToast(getCheckoutDisabledReason(invalidItem) || `Sáº£n pháº©m "${invalidItem.productName}" chÆ°a thá»ƒ thanh toÃ¡n`, 'warning');
            loadCart();
            return;
        }

        sessionStorage.setItem('checkout_selected_product_ids', JSON.stringify(selectedIds));
        navigate('/customer/checkout');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px', fontSize: '18px', color: '#64748b', fontWeight: 'bold' }}>
                Đang tải giỏ hàng...
            </div>
        );
    }

    return (
        <div className="cart-container cart-container--customer" style={{ maxWidth: '1080px', margin: '30px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => navigate('/customer/home')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', padding: 0, transition: 'all 0.2s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(-4px)'; e.currentTarget.style.textShadow = '0 0 8px var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.textShadow = 'none'; }}
                >
                    ← Quay lại trang chủ
                </button>
            </div>

            <h2 style={{ marginBottom: '24px', fontWeight: '900', color: 'var(--text)', fontSize: '28px', letterSpacing: '0.5px' }}>Giỏ hàng của bạn</h2>

            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fff', borderRadius: '18px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                    <h3 style={{ marginBottom: '24px', color: 'var(--text)', fontWeight: '700' }}>Giỏ hàng đang trống</h3>
                    <Link 
                        to="/customer/home" 
                        style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, var(--primary), #0891b2)', color: '#020617', borderRadius: '10px', textDecoration: 'none', fontWeight: '900', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.5px', boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)', transition: 'all 0.2s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 22px rgba(0, 229, 255, 0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.3)'; }}
                    >
                        Tiếp tục mua sắm
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', padding: '16px 20px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: selectableCount > 0 ? 'pointer' : 'not-allowed', fontWeight: '800', fontSize: '15px', color: 'var(--text)', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={handleSelectAll}
                                    disabled={selectableCount === 0}
                                    style={{ width: '18px', height: '18px', cursor: selectableCount > 0 ? 'pointer' : 'not-allowed', accentColor: 'var(--primary)' }}
                                />
                                Chọn tất cả ({selectedVisibleCount}/{selectableCount})
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                                <label style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '260px', flex: '1 1 260px', margin: 0 }}>
                                    <i className="fa fa-search" style={{ position: 'absolute', left: '13px', color: 'var(--muted)', fontSize: '13px' }} />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={event => setSearchTerm(event.target.value)}
                                        placeholder="Tìm sản phẩm trong giỏ"
                                        aria-label="Tìm sản phẩm trong giỏ"
                                        style={{ width: '100%', height: '40px', padding: '0 14px 0 36px', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text)', outline: 'none', fontWeight: 700 }}
                                    />
                                </label>
                                <select
                                    value={sortMode}
                                    onChange={event => setSortMode(event.target.value)}
                                    aria-label="Sắp xếp giỏ hàng"
                                    style={{ height: '40px', minWidth: '170px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text)', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="oldest">Cũ nhất</option>
                                    <option value="price-asc">Giá thấp đến cao</option>
                                    <option value="price-desc">Giá cao đến thấp</option>
                                </select>
                                <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    Hiển thị {visibleCart.length}/{cart.length}
                                </span>
                            </div>
                        </div>

                        {visibleCart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 24px', background: '#fff', borderRadius: '16px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                                <div style={{ color: 'var(--text)', fontWeight: 900, marginBottom: '10px' }}>Không tìm thấy sản phẩm phù hợp</div>
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 900, cursor: 'pointer' }}
                                >
                                    Xóa tìm kiếm
                                </button>
                            </div>
                        ) : visibleCart.map(item => {
                            const itemCanCheckout = canCheckout(item);
                            const itemCanIncrease = canIncreaseQuantity(item);
                                const isUpdating = updatingId === item.productId;
                                const warningText = itemCanCheckout
                                    ? getStockText(item)
                                    : getCheckoutDisabledReason(item) || getStockText(item);

                                const { basePrice, finalPrice, discountRate } = calculateItemDiscount(item, user?.tier);

                                return (
                                <div
                                    className="cart-line"
                                    key={item.productId}
                                    style={{ display: 'flex', gap: '20px', background: '#fff', padding: '20px 24px', borderRadius: '16px', border: itemCanCheckout ? '1px solid rgba(34, 211, 238, 0.2)' : '1px solid rgba(239, 68, 68, 0.35)', alignItems: 'center', opacity: selectedIds.includes(item.productId) ? 1 : 0.65, transition: 'all 0.3s ease', boxShadow: selectedIds.includes(item.productId) ? 'var(--shadow-sm)' : 'none' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(item.productId)}
                                        onChange={() => handleSelectItem(item)}
                                        disabled={!itemCanCheckout}
                                        style={{ width: '18px', height: '18px', cursor: itemCanCheckout ? 'pointer' : 'not-allowed', accentColor: 'var(--primary)' }}
                                    />

                                    <Link
                                        className="cart-product-link"
                                        to={`/customer/products/${item.productId}`}
                                        style={{ display: 'flex', gap: '18px', alignItems: 'center', textDecoration: 'none', flex: 1, color: 'inherit' }}
                                        title="Bấm để xem chi tiết sản phẩm"
                                    >
                                        <img
                                            src={getImageUrl(item.imageUrl)}
                                            alt={item.productName}
                                            style={{ width: '85px', height: '85px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }}
                                            onError={e => { e.currentTarget.src = PLACEHOLDER; }}
                                        />
                                        <div className="cart-product-copy" style={{ flex: 1 }}>
                                            <div className="cart-product-name" style={{ fontWeight: '700', marginBottom: '6px', color: 'var(--text)', fontSize: '16px', lineBreak: 'anywhere' }}>{item.productName}</div>
                                            <div>
                                                {discountRate > 0 ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: 'var(--muted)', textDecoration: 'line-through', fontSize: '14px' }}>{fmt(basePrice)}</span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '16px' }}>{fmt(finalPrice)}</span>
                                                        <span style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>-{Math.round(discountRate * 100)}%</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '16px' }}>{fmt(basePrice)}</span>
                                                )}
                                            </div>
                                            <div style={{ marginTop: '6px' }}>
                                                <span style={{ color: itemCanCheckout ? 'var(--muted)' : '#f87171', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <i className={itemCanCheckout ? "fa fa-circle-check" : "fa fa-triangle-exclamation"} style={{ fontSize: '12px', color: itemCanCheckout ? 'var(--success)' : '#ef4444' }} />
                                                    {warningText}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Using <span> instead of <div> here to bypass global custom.css `.customer-shell div[style*="background"]` override */}
                                    <span className="cart-qty-control" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', height: '36px', width: 'fit-content' }}>
                                        <button
                                            style={{ width: '32px', height: '100%', background: 'transparent', border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: 'var(--primary)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => updateQuantity(item, item.quantity - 1)}
                                            disabled={Boolean(updatingId)}
                                            onMouseEnter={e => { if (!updatingId) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >-</button>
                                        <span style={{ padding: '0 10px', fontWeight: '800', fontSize: '14px', color: 'var(--text)', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                        <button
                                            style={{ width: '32px', height: '100%', background: 'transparent', border: 'none', cursor: Boolean(updatingId) || !itemCanIncrease ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: !itemCanIncrease ? 'rgba(0, 229, 255, 0.25)' : 'var(--primary)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => updateQuantity(item, item.quantity + 1)}
                                            disabled={Boolean(updatingId) || !itemCanIncrease}
                                            onMouseEnter={e => { if (!updatingId && itemCanIncrease) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >+</button>
                                    </span>

                                    <div className="cart-line-total" style={{ minWidth: '110px', textAlign: 'right' }}>
                                        <span style={{ fontWeight: '850', color: 'var(--primary)', fontSize: '16px' }}>{fmt(finalPrice * item.quantity)}</span>
                                    </div>

                                    <button
                                        className="cart-remove-button"
                                        style={{ border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', width: '36px', height: '36px', borderRadius: '10px', cursor: updatingId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                                        onClick={() => removeItem(item.productId)}
                                        disabled={Boolean(updatingId)}
                                        title="Xóa khỏi giỏ hàng"
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        <i className="fa fa-trash" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="cart-checkout-bar" style={{ position: 'sticky', bottom: '0', background: '#fff', border: '1px solid rgba(34, 211, 238, 0.2)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: '0 -10px 30px rgba(0,0,0,0.1)', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '15px' }}>Tạm tính ({selectedIds.length} SP): <strong style={{color: 'var(--text)'}}>{fmt(subTotal)}</strong></span>
                                {isLargeOrder && (
                                    <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold', marginTop: '4px' }}>Giảm giá siêu ưu đãi: -20%</span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '15px', color: 'var(--text)' }}>Tổng thanh toán: </span>
                                <span style={{ color: 'var(--primary)', fontWeight: '950', fontSize: '24px', textShadow: '0 0 12px var(--primary-glow)' }}>{fmt(totalAmount)}</span>
                            </div>
                            <button
                                style={{ padding: '14px 40px', fontSize: '16px', background: selectedItems.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, var(--primary), #0891b2)', color: selectedItems.length === 0 ? 'var(--muted)' : '#020617', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedItems.length === 0 ? 'none' : '0 0 20px rgba(0, 229, 255, 0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.3s ease' }}
                                onClick={handleCheckoutClick}
                                disabled={selectedItems.length === 0}
                                onMouseEnter={e => { if (selectedItems.length > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0, 229, 255, 0.55)'; } }}
                                onMouseLeave={e => { if (selectedItems.length > 0) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.35)'; } }}
                            >
                                Thanh toán
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
