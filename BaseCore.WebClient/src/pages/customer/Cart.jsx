import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi, productApi, unwrapApiData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const PLACEHOLDER = 'https://placehold.co/80';
const API_BASE_URL = 'http://127.0.0.1:5001';

const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getStock = (item) => Number(item?.productStock ?? item?.ProductStock ?? item?.stock ?? 0);
const isAvailable = (item) => item?.isAvailable !== false && getStock(item) > 0;
const canCheckout = (item) => isAvailable(item) && Number(item.quantity || 0) <= getStock(item);

const Cart = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    const loadCart = useCallback(async () => {
        try {
            setLoading(true);
            const res = await cartApi.getCart();
            const rawItems = res.data?.data || [];
            const items = await Promise.all(rawItems.map(async item => {
                try {
                    const productRes = await productApi.getById(item.productId);
                    const product = unwrapApiData(productRes);
                    const productStock = Number(product?.stock ?? item.productStock ?? item.ProductStock ?? 0);
                    const price = Math.round((product?.price || item.price || 0) * (1 - (product?.discountPercent || 0) / 100));

                    return {
                        ...item,
                        price,
                        productStock,
                        isAvailable: item.isAvailable !== false &&
                            productStock > 0 &&
                            String(product?.status || 'Active').toLowerCase() === 'active',
                    };
                } catch {
                    return item;
                }
            }));
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
        const stock = getStock(item);

        if (newQty <= 0 || stock <= 0) {
            await removeItem(productId);
            return;
        }

        if (newQty > stock) {
            if (item.quantity > stock) {
                setUpdatingId(productId);
                try {
                    await cartApi.updateItem(productId, stock);
                    setCart(prev => prev.map(cartItem =>
                        cartItem.productId === productId ? { ...cartItem, quantity: stock } : cartItem
                    ));
                    setSelectedIds(prev => prev.filter(id => id !== productId));
                    window.dispatchEvent(new Event('cart:changed'));
                    showToast(`Đã cập nhật "${item.productName}" về số lượng tồn kho còn lại`, 'success');
                } catch (err) {
                    showToast(err.response?.data?.message || 'Không thể cập nhật số lượng', 'danger');
                    await loadCart();
                } finally {
                    setUpdatingId(null);
                }
                return;
            }

            showToast(`Sản phẩm "${item.productName}" chỉ còn ${stock} trong kho`, 'warning');
            return;
        }

        setUpdatingId(productId);
        try {
            await cartApi.updateItem(productId, newQty);
            setCart(prev => prev.map(cartItem =>
                cartItem.productId === productId ? { ...cartItem, quantity: newQty } : cartItem
            ));
            window.dispatchEvent(new Event('cart:changed'));
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể cập nhật số lượng', 'danger');
            await loadCart();
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? cart.filter(canCheckout).map(item => item.productId) : []);
    };

    const handleSelectItem = (item) => {
        if (!canCheckout(item)) {
            showToast('Sản phẩm này đang hết hàng hoặc vượt quá tồn kho', 'warning');
            return;
        }

        setSelectedIds(prev =>
            prev.includes(item.productId)
                ? prev.filter(id => id !== item.productId)
                : [...prev, item.productId]
        );
    };

    const selectedItems = cart.filter(item => selectedIds.includes(item.productId));
    const total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectableCount = cart.filter(canCheckout).length;

    const handleCheckoutClick = () => {
        if (selectedItems.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm còn hàng để thanh toán', 'warning');
            return;
        }

        const invalidItem = selectedItems.find(item => !canCheckout(item));
        if (invalidItem) {
            showToast(`Sản phẩm "${invalidItem.productName}" không đủ tồn kho`, 'warning');
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
                <div className="cart-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: selectableCount > 0 ? 'pointer' : 'not-allowed', fontWeight: '800', fontSize: '15px', color: 'var(--text)', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    checked={selectableCount > 0 && selectedIds.length === selectableCount}
                                    onChange={handleSelectAll}
                                    disabled={selectableCount === 0}
                                    style={{ width: '18px', height: '18px', cursor: selectableCount > 0 ? 'pointer' : 'not-allowed', accentColor: 'var(--primary)' }}
                                />
                                Chọn tất cả ({selectedIds.length}/{selectableCount})
                            </label>
                        </div>

                        {cart.map(item => {
                            const stock = getStock(item);
                            const itemCanCheckout = canCheckout(item);
                            const isUpdating = updatingId === item.productId;
                            const warningText = stock <= 0
                                ? 'Hết hàng'
                                : item.quantity > stock
                                    ? `Chỉ còn ${stock}, đang chọn ${item.quantity}`
                                    : `Còn ${stock} sản phẩm`;

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
                                                <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '16px' }}>{fmt(item.price)}</span>
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
                                            style={{ width: '32px', height: '100%', background: 'transparent', border: 'none', cursor: Boolean(updatingId) || item.quantity >= stock ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: item.quantity >= stock ? 'rgba(0, 229, 255, 0.25)' : 'var(--primary)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={() => updateQuantity(item, item.quantity + 1)}
                                            disabled={Boolean(updatingId) || item.quantity >= stock}
                                            onMouseEnter={e => { if (!updatingId && item.quantity < stock) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        >+</button>
                                    </span>

                                    <div className="cart-line-total" style={{ minWidth: '110px', textAlign: 'right' }}>
                                        <span style={{ fontWeight: '850', color: 'var(--primary)', fontSize: '16px' }}>{fmt(item.price * item.quantity)}</span>
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

                    <div className="cart-summary cart-summary-panel" style={{ background: '#fff', padding: '28px', borderRadius: '18px', border: '1px solid rgba(34, 211, 238, 0.2)', height: 'fit-content', position: 'sticky', top: '100px' }}>
                        <h3 style={{ marginBottom: '24px', fontWeight: '900', color: 'var(--text)', fontSize: '20px', letterSpacing: '0.5px' }}>Tóm tắt đơn hàng</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '15px' }}>
                            <span style={{ color: 'var(--muted)' }}>Tạm tính ({selectedIds.length} SP):</span>
                            <span className="cart-summary-amount" style={{ fontWeight: '800' }}>{fmt(total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px dashed rgba(34, 211, 238, 0.25)', alignItems: 'center' }}>
                            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)' }}>Tổng cộng:</span>
                            <span style={{ color: 'var(--primary)', fontWeight: '950', fontSize: '22px', textShadow: '0 0 12px var(--primary-glow)' }}>{fmt(total)}</span>
                        </div>
                        <button
                            style={{ width: '100%', padding: '16px', fontSize: '16px', background: selectedItems.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, var(--primary), #0891b2)', color: selectedItems.length === 0 ? 'var(--muted)' : '#020617', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer', boxShadow: selectedItems.length === 0 ? 'none' : '0 0 20px rgba(0, 229, 255, 0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.3s ease' }}
                            onClick={handleCheckoutClick}
                            disabled={selectedItems.length === 0}
                            onMouseEnter={e => { if (selectedItems.length > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0, 229, 255, 0.55)'; } }}
                            onMouseLeave={e => { if (selectedItems.length > 0) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.35)'; } }}
                        >
                            Tiến hành thanh toán
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
