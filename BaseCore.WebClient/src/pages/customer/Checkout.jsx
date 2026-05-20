import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { orderApi, cartApi, productApi, unwrapApiData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { goBackOrHome } from '../../utils/navigation';

const Checkout = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [cart, setCart] = useState([]);       // CartItemDto[]
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
    const getStock = (item) => Number(item?.productStock ?? item?.ProductStock ?? item?.stock ?? 0);
    const canCheckout = (item) => item?.isAvailable !== false && getStock(item) > 0 && Number(item?.quantity || 0) <= getStock(item);

    const [form, setForm] = useState({
        customerName: user?.name || '',
        customerPhone: user?.phone || '',
        shippingAddress: '',
        note: '',
    });

    // Load giỏ hàng từ backend — lọc theo selectedIds nếu có
    useEffect(() => {
        const loadCheckoutItems = async () => {
            try {
                setLoading(true);
                const res = await cartApi.getCart();
                const rawItems = res.data?.data || [];
                const allItems = await Promise.all(rawItems.map(async item => {
                    try {
                        const productRes = await productApi.getById(item.productId);
                        const product = unwrapApiData(productRes);
                        const price = Math.round((product?.price || item.price || 0) * (1 - (product?.discountPercent || 0) / 100));
                        const productStock = Number(product?.stock ?? item.productStock ?? item.ProductStock ?? 0);
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

                // Lấy danh sách productId đã chọn từ Cart.jsx (qua sessionStorage)
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

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            showToast('Giỏ hàng trống, không thể đặt hàng!', 'warning');
            return;
        }
        const invalidItem = cart.find(item => !canCheckout(item));
        if (invalidItem) {
            showToast(`Sản phẩm "${invalidItem.productName}" không đủ tồn kho. Vui lòng quay lại giỏ hàng để cập nhật.`, 'warning');
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
                })),
            };

            await orderApi.checkout(payload);

            sessionStorage.removeItem('checkout_selected_product_ids');

            // Cập nhật badge giỏ hàng
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

                {/* Danh sách sản phẩm */}
                <div style={{ marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#64748b' }}>SẢN PHẨM ĐẶT HÀNG:</h4>
                    {cart.map(item => (
                        <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed #e2e8f0' }}>
                            <div style={{ flex: 1, paddingRight: '10px', color: '#1e293b' }}>{item.productName}</div>
                            <div style={{ color: '#64748b', marginRight: '15px', fontSize: '14px' }}>x{item.quantity}</div>
                            <span style={{ minWidth: '90px', textAlign: 'right', color: '#0ea5e9' }}>
                                {fmt(item.price * item.quantity)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Thông tin giao hàng */}
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
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px', color: '#94a3b8' }}>Ghi chú đơn hàng (tuỳ chọn)</label>
                    <input
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box', color: '#475569' }}
                        value={form.note}
                        onChange={e => setForm({ ...form, note: e.target.value })}
                        placeholder="VD: Giao giờ hành chính, gọi trước khi giao..."
                    />
                </div>

                {/* Tổng tiền & nút đặt */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: '900', marginBottom: '20px' }}>
                        <span>Tổng tiền:</span>
                        <span style={{ color: '#dc2626' }}>{fmt(total)}</span>
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
