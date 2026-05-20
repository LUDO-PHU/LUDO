import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cartApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const PLACEHOLDER = 'https://placehold.co/80';
const API_BASE_URL = 'http://localhost:5001';
const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const Cart = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [cart, setCart] = useState([]);           // List<CartItemDto>
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false); // ngăn double-click khi đang update
    const [selectedIds, setSelectedIds] = useState([]);

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    // Load giỏ hàng từ API backend
    const loadCart = useCallback(async () => {
        try {
            setLoading(true);
            const res = await cartApi.getCart();
            // res.data = ApiResponse<List<CartItemDto>>
            const items = res.data?.data || [];
            setCart(items);
            setSelectedIds(items.map(i => i.productId)); // Mặc định tick chọn tất cả
        } catch (err) {
            showToast('Không thể tải giỏ hàng', 'danger');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    // Thay đổi số lượng — gọi PUT /api/cart/items/{productId}
    const updateQuantity = async (productId, newQty) => {
        if (newQty < 1 || updating) return;
        setUpdating(true);
        try {
            if (newQty === 0) {
                await cartApi.removeItem(productId);
            } else {
                await cartApi.updateItem(productId, newQty);
            }
            // Cập nhật state local ngay để UI phản hồi tức thì
            setCart(prev => prev.map(item =>
                item.productId === productId ? { ...item, quantity: newQty } : item
            ));
            // Phát event để CustomerLayout cập nhật badge
            window.dispatchEvent(new Event('cart:changed'));
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể cập nhật số lượng', 'danger');
            loadCart(); // Reload để đồng bộ lại với DB nếu có lỗi
        } finally {
            setUpdating(false);
        }
    };

    // Xóa sản phẩm khỏi giỏ — gọi DELETE /api/cart/items/{productId}
    const removeItem = async (productId) => {
        if (updating) return;
        setUpdating(true);
        try {
            await cartApi.removeItem(productId);
            setCart(prev => prev.filter(i => i.productId !== productId));
            setSelectedIds(prev => prev.filter(id => id !== productId));
            window.dispatchEvent(new Event('cart:changed'));
            showToast('Đã xóa sản phẩm khỏi giỏ', 'success');
        } catch (err) {
            showToast('Không thể xóa sản phẩm', 'danger');
        } finally {
            setUpdating(false);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(cart.map(i => i.productId));
        else setSelectedIds([]);
    };

    const handleSelectItem = (productId) => {
        if (selectedIds.includes(productId)) setSelectedIds(selectedIds.filter(id => id !== productId));
        else setSelectedIds([...selectedIds, productId]);
    };

    const selectedItems = cart.filter(i => selectedIds.includes(i.productId));
    const total = selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const handleCheckoutClick = () => {
        if (selectedIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm để thanh toán!', 'warning');
            return;
        }
        // Truyền danh sách productId đã chọn qua sessionStorage để Checkout biết lấy gì
        sessionStorage.setItem('checkout_selected_product_ids', JSON.stringify(selectedIds));
        navigate('/customer/checkout');
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px', fontSize: '18px', color: '#64748b', fontWeight: 'bold' }}>
                🛒 Đang tải giỏ hàng...
            </div>
        );
    }

    return (
        <div className="cart-container cart-container--customer" style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/customer/home')}
                    style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', padding: 0 }}
                >
                    ← Quay lại trang chủ
                </button>
            </div>

            <h2 style={{ marginBottom: '20px', fontWeight: '900', color: '#0f172a' }}>Giỏ hàng của bạn</h2>

            {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>🛒</div>
                    <h3 style={{ marginBottom: '20px', color: '#475569' }}>Giỏ hàng đang trống</h3>
                    <Link to="/customer/home" style={{ display: 'inline-block', padding: '12px 24px', background: '#0ea5e9', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                        Tiếp tục mua sắm
                    </Link>
                </div>
            ) : (
                <div className="cart-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                    {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {/* Chọn tất cả */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === cart.length && cart.length > 0}
                                    onChange={handleSelectAll}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                                />
                                Chọn tất cả ({selectedIds.length}/{cart.length})
                            </label>
                        </div>

                        {/* Từng sản phẩm */}
                        {cart.map(item => (
                            <div
                                className="cart-line"
                                key={item.productId}
                                style={{ display: 'flex', gap: '20px', background: '#fff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center', opacity: selectedIds.includes(item.productId) ? 1 : 0.5, transition: '0.2s' }}
                            >
                                {/* Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(item.productId)}
                                    onChange={() => handleSelectItem(item.productId)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0ea5e9' }}
                                />

                                {/* Ảnh + tên (có thể click xem chi tiết) */}
                                <Link
                                    className="cart-product-link"
                                    to={`/customer/products/${item.productId}`}
                                    style={{ display: 'flex', gap: '15px', alignItems: 'center', textDecoration: 'none', flex: 1, color: 'inherit', transition: 'opacity 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    title="Bấm để xem chi tiết sản phẩm"
                                >
                                    <img
                                        src={getImageUrl(item.imageUrl)}
                                        alt={item.productName}
                                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        onError={e => e.target.src = PLACEHOLDER}
                                    />
                                    <div className="cart-product-copy" style={{ flex: 1 }}>
                                        <div className="cart-product-name" style={{ fontWeight: '700', marginBottom: '5px', color: '#1e293b' }}>{item.productName}</div>
                                        <div style={{ color: '#0ea5e9', fontWeight: '900', fontSize: '16px' }}>{fmt(item.price)}</div>
                                    </div>
                                </Link>

                                {/* Tăng giảm số lượng */}
                                <div className="cart-qty-control" style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                                    <button
                                        style={{ padding: '6px 12px', background: '#f8fafc', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        disabled={updating}
                                    >-</button>
                                    <span style={{ padding: '0 15px', fontWeight: '700', fontSize: '14px' }}>{item.quantity}</span>
                                    <button
                                        style={{ padding: '6px 12px', background: '#f8fafc', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 'bold' }}
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        disabled={updating}
                                    >+</button>
                                </div>

                                {/* Tổng dòng */}
                                <div className="cart-line-total" style={{ minWidth: '100px', textAlign: 'right', fontWeight: '800', color: '#dc2626', fontSize: '15px' }}>
                                    {fmt(item.price * item.quantity)}
                                </div>

                                {/* Nút xóa */}
                                <button
                                    className="cart-remove-button"
                                    style={{ border: 'none', background: '#fee2e2', color: '#dc2626', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => removeItem(item.productId)}
                                    disabled={updating}
                                    title="Xóa khỏi giỏ hàng"
                                >
                                    <i className="fa fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* CỘT PHẢI: TÓM TẮT & THANH TOÁN */}
                    <div className="cart-summary cart-summary-panel" style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', height: 'fit-content', position: 'sticky', top: '100px' }}>
                        <h3 style={{ marginBottom: '20px', fontWeight: '900', color: '#0f172a' }}>Tóm tắt đơn hàng</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontSize: '15px' }}>
                            <span>Tạm tính ({selectedIds.length} SP):</span>
                            <span className="cart-summary-amount" style={{ fontWeight: 'bold', color: '#1e293b' }}>{fmt(total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px dashed #cbd5e1', fontWeight: '900', fontSize: '20px', color: '#0f172a' }}>
                            <span>Tổng cộng:</span>
                            <span style={{ color: '#dc2626' }}>{fmt(total)}</span>
                        </div>
                        <button
                            style={{ width: '100%', padding: '16px', fontSize: '16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 10px rgba(14,165,233,0.3)' }}
                            onClick={handleCheckoutClick}
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
