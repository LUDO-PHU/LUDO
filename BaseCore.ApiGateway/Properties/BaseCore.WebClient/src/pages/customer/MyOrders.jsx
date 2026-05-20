import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatAppDateTime } from '../../utils/dateTime';
const PLACEHOLDER = "https://placehold.co/80";
const API_BASE_URL = "http://localhost:5001";
const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    if (url.startsWith('http')) return url;
    const prefix = url.startsWith('/') ? '' : '/';
    return `${API_BASE_URL}${prefix}${url}`;
};

const MyOrders = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const highlightedOrderId = Number(searchParams.get('orderId') || 0);
    const highlightedOrderRef = useRef(null);

    const loadOrders = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const res = await orderApi.getMyOrders();
            const payload = res.data?.data ?? res.data ?? [];
            setOrders(Array.isArray(payload) ? payload : []);
        } catch (err) {
            showToast("Lỗi khi tải dữ liệu đơn hàng", "danger");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const intervalId = window.setInterval(() => loadOrders(false), 30000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!loading && highlightedOrderId && highlightedOrderRef.current) {
            highlightedOrderRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedOrderId, loading, orders]);

    const handleCancel = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
        try {
            await orderApi.cancel(id);
            showToast("Đã hủy đơn hàng thành công!", "success");
            loadOrders();
        } catch (err) {
            showToast(err.response?.data?.message || "Không thể hủy đơn hàng này", "danger");
        }
    };

    const handleReceive = async (id) => {
        if (!window.confirm("Bạn xác nhận đã nhận được hàng và hoàn tất đơn này?")) return;
        try {
            await orderApi.complete(id);
            showToast("Cảm ơn bạn đã mua hàng! Đơn hàng đã hoàn tất.", "success");
            loadOrders();
        } catch (err) {
            console.error(err);
            showToast("Lưu ý: API cập nhật trạng thái nhận hàng cần được bật ở Backend.", "warning");
        }
    };

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending': return { bg: '#fef9c3', color: '#ca8a04', text: "Chờ xử lý" };
            case 'Confirmed': return { bg: '#e0f2fe', color: '#0284c7', text: "Đã xác nhận" };
            case 'Shipping': return { bg: '#ffedd5', color: '#d97706', text: "Đang giao hàng" };
            case 'Delivered': return { bg: '#e0f2fe', color: '#0284c7', text: "Đã giao hàng" };
            case 'Completed': return { bg: '#dcfce7', color: '#166534', text: "Hoàn tất" };
            case 'CancelledByUser':
            case 'CancelledByAdmin':
            case 'Cancelled': return { bg: '#fee2e2', color: '#dc2626', text: "Đã hủy" };
            case 'Rejected': return { bg: '#f1f5f9', color: '#475569', text: "Đã từ chối" };
            default: return { bg: '#f1f5f9', color: '#475569', text: status };
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '100px', fontSize: '18px', color: '#64748b', fontWeight: 'bold' }}>Đang tải danh sách đơn hàng...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>

            {/* NÚT QUAY LẠI MỚI THÊM */}
            <div style={{ marginBottom: '20px' }}>
                <button onClick={() => navigate('/customer/home')} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', padding: 0 }}>
                    ← Quay lại trang chủ
                </button>
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '30px', color: '#0f172a' }}>Đơn hàng của tôi</h2>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>📦</div>
                    <h3 style={{ color: '#475569', margin: 0 }}>Bạn chưa có đơn hàng nào</h3>
                    <Link to="/customer/home" style={{ display: 'inline-block', marginTop: '20px', padding: '12px 24px', background: '#0ea5e9', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>Tiếp tục mua sắm</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {orders.map(o => {
                        const sStyle = getStatusStyle(o.status);
                        const items = o.details || o.Details || [];

                        return (
                            <div
                                key={o.id}
                                ref={o.id === highlightedOrderId ? highlightedOrderRef : null}
                                style={{
                                    background: '#fff',
                                    borderRadius: '16px',
                                    border: o.id === highlightedOrderId ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    boxShadow: o.id === highlightedOrderId ? '0 0 0 4px rgba(14,165,233,0.14)' : '0 4px 15px rgba(0,0,0,0.03)',
                                }}
                            >
                                <div style={{ background: '#f8fafc', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                    <div>
                                        <span style={{ fontWeight: '900', fontSize: '16px', marginRight: '20px', color: '#0f172a' }}>Mã đơn: #{o.id}</span>
                                        <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Đặt ngày: {formatAppDateTime(o.createdAt || o.orderDate)}</span>
                                    </div>
                                    <div style={{ background: sStyle.bg, color: sStyle.color, padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                                        {sStyle.text}
                                    </div>
                                </div>

                                <div style={{ padding: '10px 24px' }}>
                                    {items.map((item, idx) => (
                                        <Link to={`/customer/products/${item.productId || item.ProductId}`} key={idx} style={{ display: 'flex', gap: '20px', padding: '16px 0', borderBottom: idx < items.length - 1 ? '1px dashed #cbd5e1' : 'none', alignItems: 'center', textDecoration: 'none' }}>
                                            <img src={getImageUrl(item.imageUrl || item.ImageUrl)} alt="Product" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} onError={e => e.target.src = PLACEHOLDER} />
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1e293b', fontWeight: '700' }}>{item.productName || item.ProductName || "Sản phẩm không xác định"}</h4>
                                                <p style={{ margin: '8px 0 0 0', fontWeight: '800', color: '#0ea5e9' }}>x{item.quantity || item.Quantity}</p>
                                            </div>
                                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '16px' }}>
                                                {fmt(item.unitPrice || item.UnitPrice)}
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                <div style={{ background: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {o.status === 'Pending' && (
                                            <button onClick={() => handleCancel(o.id)} style={{ padding: '10px 20px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                                Hủy đơn hàng
                                            </button>
                                        )}
                                        {(o.status === 'Shipping' || o.status === 'Delivered') && (
                                            <button onClick={() => handleReceive(o.id)} style={{ padding: '10px 20px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                                ✔ Đã nhận được hàng
                                            </button>
                                        )}
                                        {o.status === 'Completed' && (
                                            <button onClick={() => navigate(`/customer/products/${items[0]?.productId || items[0]?.ProductId}`)} style={{ padding: '10px 20px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                                                ⭐ Đánh giá sản phẩm
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Thành tiền:</span>
                                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>{fmt(o.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default MyOrders;
