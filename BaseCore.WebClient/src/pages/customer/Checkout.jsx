import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { orderApi, cartApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { goBackOrHome } from '../../utils/navigation';
import { calculateItemDiscount, calculateOrderTotal } from '../../utils/discount';
import { getImageUrl as resolveImageUrl } from '../../data/fallbackCatalog';

const PLACEHOLDER = 'https://placehold.co/80';

const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    return resolveImageUrl(url);
};

const Checkout = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [cart, setCart] = useState([]);        
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const canCheckout = (item) => Boolean(item?.canCheckout ?? item?.CanCheckout);
    const canIncreaseQuantity = (item) => Boolean(item?.canIncreaseQuantity ?? item?.CanIncreaseQuantity);
    const getLineTotal = (item) => Number(item?.lineTotal ?? item?.LineTotal ?? item?.total ?? item?.Total ?? 0);
    const getCheckoutDisabledReason = (item) => item?.checkoutDisabledReason ?? item?.CheckoutDisabledReason ?? '';

    const [form, setForm] = useState({
        customerName: user?.name || '',
        customerPhone: user?.phone || '',
        shippingAddress: '',
        note: '',
    });

    useEffect(() => {
        const loadCheckoutItems = async () => {
            try {
                setLoading(true);
                const res = await cartApi.getCart();
                const allItems = res.data?.data || [];

                const selectedJson = sessionStorage.getItem('checkout_selected_product_ids');
                if (selectedJson) {
                    const selectedIds = JSON.parse(selectedJson);
                    const filtered = allItems.filter(i => selectedIds.includes(i.productId));
                    setCart(filtered.length > 0 ? filtered : allItems);
                } else {
                    setCart(allItems);
                }
            } catch (err) {
                showToast('Không thể tải giỏ hàng', 'danger');
                navigate('/customer/cart');
            } finally {
                setLoading(false);
            }
        };

        loadCheckoutItems();
    }, [navigate, showToast]);

    const removeItem = async (productId) => {
        if (updatingId) return;
        setUpdatingId(productId);
        try {
            await cartApi.removeItem(productId);
            setCart(prev => prev.filter(item => item.productId !== productId));
            const selectedJson = sessionStorage.getItem('checkout_selected_product_ids');
            if (selectedJson) {
                const selectedIds = JSON.parse(selectedJson);
                const updatedIds = selectedIds.filter(id => id !== productId);
                sessionStorage.setItem('checkout_selected_product_ids', JSON.stringify(updatedIds));
            }
            window.dispatchEvent(new Event('cart:changed'));
            showToast('Đã xóa sản phẩm khỏi đơn hàng', 'success');
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

        const prevCart = cart;
        setCart(prev => prev.map(i =>
            i.productId === productId
                ? { ...i, quantity: newQty, lineTotal: (i.finalPrice ?? i.FinalPrice ?? i.price ?? 0) * newQty }
                : i
        ));

        setUpdatingId(productId);
        try {
            const res = await cartApi.updateItem(productId, newQty);
            const updatedItem = res?.data?.data;
            if (updatedItem) {
                setCart(prev => prev.map(i =>
                    i.productId === productId ? { ...i, ...updatedItem } : i
                ));
            }
            window.dispatchEvent(new Event('cart:changed'));
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể cập nhật số lượng', 'danger');
            setCart(prevCart);
        } finally {
            setUpdatingId(null);
        }
    };

    const {
        totalOriginal,
        totalProductDiscount,
        totalTierDiscount,
        totalQuantityDiscount,
        largeOrderDiscountAmount,
        subTotal,
        totalAmount,
        isLargeOrder,
        totalReduced
    } = calculateOrderTotal(cart, user?.tier);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            showToast('Giỏ hàng trống, không thể đặt hàng!', 'warning');
            return;
        }
        const invalidItem = cart.find(item => !canCheckout(item));
        if (invalidItem) {
            const reason = getCheckoutDisabledReason(invalidItem) || 'Không thể thanh toán';
            showToast(`Sản Phẩm "${invalidItem.productName}" ${reason}. Vui lòng quay lại sau.`, 'warning');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                customerName: form.customerName,
                customerPhone: form.customerPhone,
                shippingAddress: form.shippingAddress,
                note: form.note,
                productIds: cart.map(item => item.productId),
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    selectedImageUrl: item.imageUrl || '',
                })),
            };

            await orderApi.checkout(payload);

            sessionStorage.removeItem('checkout_selected_product_ids');

            window.dispatchEvent(new Event('cart:changed'));

            showToast('Đặt hàng thành công!', 'success');
            navigate('/customer/orders');
        } catch (err) {
            console.error('Lỗi thanh toán:', err);
            showToast(err.response?.data?.message || 'Lỗi hệ thống, vui lòng thử lại', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#64748b' }}>
                Đang tải thông tin đơn hàng...
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <button type="button" onClick={() => goBackOrHome(navigate)} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', padding: 0 }}>
                    ← Quay lại
                </button>
            </div>

            <h2 style={{ marginBottom: '20px', fontWeight: '900', color: 'var(--text)' }}>Xác nhận thanh toán</h2>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '30px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>

                {     }
                <div style={{ marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#64748b' }}>SẢN PHẨM ĐẶT HÀNG:</h4>
                    {cart.map(item => {
                        const { finalPrice } = calculateItemDiscount(item, user?.tier);
                        return (
                            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, paddingRight: '10px' }}>
                                    <img 
                                        src={getImageUrl(item.imageUrl)} 
                                        alt={item.productName} 
                                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }} 
                                        onError={e => { e.currentTarget.src = PLACEHOLDER; }}
                                    />
                                    <span style={{ color: '#1e293b', lineHeight: '1.4' }}>{item.productName}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', backgroundColor: '#f8fafc', height: '30px', marginRight: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <button
                                        type="button"
                                        style={{ width: '26px', height: '100%', background: 'transparent', border: 'none', cursor: updatingId ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', padding: 0, transition: 'background-color 0.2s' }}
                                        onClick={() => updateQuantity(item, item.quantity - 1)}
                                        disabled={Boolean(updatingId)}
                                        onMouseEnter={e => { if (!updatingId) e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        -
                                    </button>
                                    <span style={{ padding: '0 4px', fontWeight: '700', fontSize: '12px', color: '#1e293b', minWidth: '18px', textAlign: 'center' }}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        style={{ width: '26px', height: '100%', background: 'transparent', border: 'none', cursor: (updatingId || !canIncreaseQuantity(item)) ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: !canIncreaseQuantity(item) ? '#cbd5e1' : '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', padding: 0, transition: 'background-color 0.2s' }}
                                        onClick={() => updateQuantity(item, item.quantity + 1)}
                                        disabled={Boolean(updatingId) || !canIncreaseQuantity(item)}
                                        onMouseEnter={e => { if (!updatingId && canIncreaseQuantity(item)) e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        +
                                    </button>
                                </div>
                                <span style={{ minWidth: '90px', textAlign: 'right', color: '#0ea5e9' }}>
                                    {fmt(finalPrice * item.quantity)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {     }
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#475569' }}>Họ tên người nhận *</label>
                    <input
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        value={form.customerName}
                        onChange={e => setForm({ ...form, customerName: e.target.value })}
                        required
                        placeholder="Nhập họ tên..."
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#475569' }}>Số điện thoại *</label>
                    <input
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                        value={form.customerPhone}
                        onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                        required
                        placeholder="Nhập số điện thoại..."
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#475569' }}>Địa chỉ giao hàng *</label>
                    <textarea
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', height: '70px', boxSizing: 'border-box', resize: 'vertical' }}
                        value={form.shippingAddress}
                        onChange={e => setForm({ ...form, shippingAddress: e.target.value })}
                        required
                        placeholder="Số nhà, tên đường, xã/phường, tỉnh/thành..."
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#94a3b8' }}>Ghi chú đơn hàng (tuỳ chọn)</label>
                    <input
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', color: '#475569' }}
                        value={form.note}
                        onChange={e => setForm({ ...form, note: e.target.value })}
                        placeholder="VD: Giao giờ hành chính, gọi trước khi giao..."s
                    />
                </div>

                {      }
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>
                        <span style={{ color: '#64748b' }}>Tổng giá niêm yết:</span>
                        <span style={{ color: '#64748b', textDecoration: totalReduced > 0 ? 'line-through' : 'none' }}>{fmt(totalOriginal)}</span>
                    </div>

                    {       }
                    {totalReduced > 0 && (
                        <div style={{ margin: '15px 0', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1e293b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                🎁 ƯU ĐÃI ĐÃ ÁP DỤNG:
                            </h5>
                            
                            {   }
                            {totalProductDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                                    <span>• Giảm giá sản phẩm (Sẵn có):</span>
                                    <span style={{ color: '#ef4444', fontWeight: '600' }}>-{fmt(totalProductDiscount)}</span>
                                </div>
                            )}

                            {    }
                            {totalTierDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                                    <span>
                                        • Hạng thành viên ({user?.tier}): 
                                        <span style={{ marginLeft: '5px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>Cộng dồn</span>
                                    </span>
                                    <span style={{ color: '#10b981', fontWeight: '600' }}>-{fmt(totalTierDiscount)}</span>
                                </div>
                            )}

                            {    }
                            {totalQuantityDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                                    <span>
                                        • Mua sỉ (Từ 3 sản phẩm cùng loại): 
                                        <span style={{ marginLeft: '5px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>Cộng dồn</span>
                                    </span>
                                    <span style={{ color: '#10b981', fontWeight: '600' }}>-{fmt(totalQuantityDiscount)}</span>
                                </div>
                            )}

                            {    }
                            {largeOrderDiscountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                                    <span>
                                        • Siêu ưu đãi (Đơn hàng &gt; 5.000.000đ): 
                                        <span style={{ marginLeft: '5px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>Cộng dồn</span>
                                    </span>
                                    <span style={{ color: '#10b981', fontWeight: '600' }}>-{fmt(largeOrderDiscountAmount)}</span>
                                </div>
                            )}

                            <hr style={{ border: '0', borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />

                            {   }
                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
                                💡 <strong>Giải thích cộng dồn:</strong> Khi mua hàng, bạn được cộng dồn các ưu đãi đặc quyền (Thành viên + Mua sỉ + Đơn hàng lớn) có thể đạt tối đa <strong>40% giảm giá</strong>, cộng thêm với giảm giá riêng sẵn có của từng sản phẩm.
                            </div>
                        </div>
                    )}

                    {    }
                    {totalReduced > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', marginBottom: '10px', color: '#10b981' }}>
                            <span>Tổng tiền đã giảm:</span>
                            <span>-{fmt(totalReduced)}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: '900', marginBottom: '20px' }}>
                        <span>Tổng thanh toán:</span>
                        <span style={{ color: '#dc2626' }}>{fmt(totalAmount)}</span>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting || cart.length === 0}
                        style={{ width: '100%', padding: '15px', background: submitting ? '#94a3b8' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '16px', cursor: submitting ? 'not-allowed' : 'pointer', transition: '0.2s' }}
                    >
                        {submitting ? '⏳ Đang xử lý...' : '✅ XÁC NHẬN ĐẶT HÀNG'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Checkout;
