import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi, reviewApi, returnRequestApi, unwrapApiData, unwrapPagedData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatAppDate, formatAppDateTime } from '../../utils/dateTime';
import { ORDER_STATUS, formatVnd, readValue } from '../../utils/display';
import { getImageUrl as resolveImageUrl } from '../../data/fallbackCatalog';

const PLACEHOLDER = 'https://placehold.co/80';

const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    return resolveImageUrl(url);
};

const getItems = (order) => {
    const details = readValue(order, 'details', 'Details', 'orderDetails', 'OrderDetails');
    return Array.isArray(details) ? details : [];
};

const getItemImage = (item) => readValue(item, 'mainImage', 'MainImage', 'imageUrl', 'ImageUrl');
const getItemName = (item) => readValue(item, 'productName', 'ProductName') || 'Sản phẩm';
const getItemNumber = (item, ...keys) => Number(readValue(item, ...keys) || 0);
const getAllowedActions = (source) => readValue(source, 'allowedActions', 'AllowedActions') || [];

const StatusPill = ({ status }) => {
    const item = ORDER_STATUS[status] || { label: status || 'Chưa xác định' };
    const colorMap = {
        Pending: ['#fef3c7', '#92400e'],
        Shipping: ['#dbeafe', '#1d4ed8'],
        Completed: ['#dcfce7', '#166534'],
        Cancelled: ['#fee2e2', '#b91c1c'],
        ReturnedToStock: ['#fff7ed', '#c2410c'],
    };
    const [bg, color] = colorMap[status] || ['#f1f5f9', '#475569'];
    return <span style={{ background: bg, color, padding: '6px 14px', borderRadius: 999, fontWeight: 800, fontSize: 13 }}>{item.label}</span>;
};

const isReturnExpired = (order) => {
    const dateStr = order.completedAt || order.createdAt;
    if (!dateStr) return true;
    const completedDate = new Date(dateStr);
    const now = new Date();
    const diffTime = now - completedDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
};

const OrderDetailModal = ({ order, actingId, onClose, onCancel, onReceive, onReorder, myReviews, onOpenReview, onOpenReturn }) => {
    if (!order) return null;
    const items = getItems(order);
    const allowedActions = getAllowedActions(order);

    const hasReviewed = (productId, orderId) => {
        return Array.isArray(myReviews) && myReviews.some(r => 
            Number(r.productId ?? r.ProductId) === Number(productId) && 
            Number(r.orderId ?? r.OrderId) === Number(orderId)
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(2,6,23,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 30px 90px rgba(0,0,0,0.28)' }} onClick={event => event.stopPropagation()}>
                <div style={{ padding: '22px 26px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Chi tiết đơn hàng {order.orderCode || `#${order.id}`}</h3>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, border: 0, background: '#f1f5f9', fontSize: 20, fontWeight: 900 }}>×</button>
                </div>
                <div style={{ padding: 26 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
                        {[
                            ['Mã đơn hàng', order.orderCode || `#${order.id}`],
                            ['Ngày đặt', formatAppDateTime(order.createdAt)],
                            ['Trạng thái đơn hàng', <StatusPill status={order.status} />],
                            ['Trạng thái thanh toán', 'Thanh toán khi nhận hàng'],
                            ['Tổng tiền', formatVnd(order.totalAmount)],
                            ['Số điện thoại', order.customerPhone || 'Chưa có'],
                            ['Địa chỉ giao hàng', order.shippingAddress || 'Chưa có'],
                            ['Ghi chú', order.note || 'Không có ghi chú'],
                            ...(order.returnedAt ? [['Hoàn về kho lúc', formatAppDateTime(order.returnedAt)]] : []),
                        ].map(([label, value]) => (
                            <div key={label} style={{ background: order.status === 'ReturnedToStock' && label === 'Hoàn về kho lúc' ? '#fff7ed' : '#f8fafc', border: `1px solid ${order.status === 'ReturnedToStock' && label === 'Hoàn về kho lúc' ? '#fed7aa' : '#e2e8f0'}`, borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                                <div style={{ color: label === 'Tổng tiền' ? '#dc2626' : label === 'Hoàn về kho lúc' ? '#c2410c' : '#0f172a', fontWeight: 800, lineHeight: 1.45 }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {order.status === 'ReturnedToStock' && (
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 22 }}>📦</span>
                            <div>
                                <div style={{ fontWeight: 800, color: '#c2410c', marginBottom: 4 }}>Đơn hàng đã hoàn về kho</div>
                                <div style={{ fontSize: 13, color: '#92400e' }}>Hàng đã được tự động hoàn về kho do không xác nhận nhận hàng trong 3 ngày. Bạn có thể đặt lại đơn hàng nếu muốn.</div>
                            </div>
                        </div>
                    )}

                    <h4 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Sản phẩm trong đơn</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 680 }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Sản phẩm</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Số lượng</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Giá</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length > 0 ? items.map((item, index) => (
                                    <tr key={`${item.productId || index}-${index}`}>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <img src={getImageUrl(getItemImage(item))} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} onError={event => { event.currentTarget.src = PLACEHOLDER; }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <Link to={`/customer/products/${item.productId || item.ProductId}`} style={{ fontWeight: 800, color: '#0ea5e9', textDecoration: 'none' }}>
                                                        {getItemName(item)}
                                                    </Link>
                                                    {allowedActions.includes('review') && (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.preventDefault(); 
                                                                e.stopPropagation(); 
                                                                onOpenReview(item, order.id); 
                                                            }} 
                                                            style={{ 
                                                                alignSelf: 'flex-start',
                                                                background: '#eff6ff', 
                                                                color: '#2563eb', 
                                                                border: '1px solid #bfdbfe', 
                                                                borderRadius: 6, 
                                                                padding: '3px 8px', 
                                                                fontSize: 12, 
                                                                fontWeight: 800, 
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseOver={e => { e.currentTarget.style.background = '#dbeafe'; }}
                                                            onMouseOut={e => { e.currentTarget.style.background = '#eff6ff'; }}
                                                        >
                                                            {hasReviewed(item.productId || item.ProductId, order.id) ? '⭐ Sửa đánh giá' : '⭐ Đánh giá'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>×{getItemNumber(item, 'quantity', 'Quantity')}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>{formatVnd(getItemNumber(item, 'finalPrice', 'FinalPrice', 'unitPrice', 'UnitPrice'))}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626', fontWeight: 900 }}>{formatVnd(getItemNumber(item, 'totalPrice', 'TotalPrice'))}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>Chưa có sản phẩm</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div style={{ padding: '18px 26px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={onClose} style={secondaryButton}>Đóng</button>
                    {allowedActions.includes('cancel') && (
                        <button disabled={actingId === order.id} onClick={() => onCancel(order.id)} style={dangerButton}>Hủy đơn</button>
                    )}
                    {allowedActions.includes('receive') && (
                        <button disabled={actingId === order.id} onClick={() => onReceive(order.id)} style={successButton}>Đã nhận hàng</button>
                    )}
                    {allowedActions.includes('reorder') && (
                        <button onClick={() => onReorder(order)} style={reorderButton}>🔄 Mua lại</button>
                    )}
                    {order.status === 'Completed' && (() => {
                        const expired = isReturnExpired(order);
                        const returnButtonStyle = {
                            ...secondaryButton,
                            background: expired ? '#f1f5f9' : '#fff1f2',
                            color: expired ? '#94a3b8' : '#e11d48',
                            border: `1px solid ${expired ? '#cbd5e1' : '#fecdd3'}`,
                            cursor: expired ? 'not-allowed' : 'pointer',
                            opacity: expired ? 0.5 : 1,
                        };
                        return (
                            <button
                                disabled={expired}
                                onClick={() => onOpenReturn(order)}
                                style={returnButtonStyle}
                                title={expired ? "Chỉ được trả hàng trong 7 ngày đầu tiên" : "Yêu cầu trả hàng hoàn tiền đơn hàng này"}
                            >
                                📦 Trả hàng
                            </button>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

const thStyle = {
    padding: '12px 14px',
    background: '#f8fafc',
    color: '#64748b',
    textAlign: 'left',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0,
    borderBottom: '1px solid #e2e8f0',
};

const tdStyle = {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f172a',
    verticalAlign: 'middle',
};

const secondaryButton = {
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#0f172a',
    fontWeight: 800,
    cursor: 'pointer',
};

const dangerButton = {
    ...secondaryButton,
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
};

const successButton = {
    ...secondaryButton,
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
};

const reorderButton = {
    ...secondaryButton,
    background: '#fff7ed',
    color: '#c2410c',
    border: '1px solid #fed7aa',
};

const ReviewModal = ({ isOpen, onClose, product, orderId, myReviews, onSubmitSuccess }) => {
    if (!isOpen || !product) return null;

    const productId = product.productId || product.ProductId;
    const productName = product.productName || product.ProductName || 'Sản phẩm';

    // Find if there is an existing review for this order and product
    const existingReview = Array.isArray(myReviews) ? myReviews.find(r => 
        Number(r.productId ?? r.ProductId) === Number(productId) && 
        Number(r.orderId ?? r.OrderId) === Number(orderId)
    ) : null;

    const [rating, setRating] = useState(existingReview ? Number(existingReview.rating || existingReview.Rating || 5) : 5);
    const [comment, setComment] = useState(existingReview ? (existingReview.comment || existingReview.Comment || '') : '');
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        setSubmitting(true);
        try {
            await reviewApi.create({
                productId: Number(productId),
                orderId: Number(orderId),
                rating,
                comment
            });
            showToast(existingReview ? 'Cập nhật đánh giá thành công!' : 'Đã gửi đánh giá của bạn!', 'success');
            if (onSubmitSuccess) await onSubmitSuccess();
            onClose();
        } catch (err) {
            showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(2,6,23,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ width: 'min(500px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 30px 90px rgba(0,0,0,0.35)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                        {existingReview ? 'Chỉnh sửa đánh giá' : 'Đánh giá sản phẩm'}
                    </h3>
                    <button onClick={onClose} style={{ border: 0, background: 'transparent', fontSize: 22, fontWeight: 900, cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <img src={getImageUrl(getItemImage(product))} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} onError={event => { event.currentTarget.src = PLACEHOLDER; }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Sản phẩm</div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{productName}</div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#475569', marginBottom: 8 }}>Chọn số sao đánh giá:</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <span 
                                    key={star}
                                    onClick={() => setRating(star)}
                                    style={{ 
                                        fontSize: 32, 
                                        cursor: 'pointer', 
                                        color: star <= rating ? '#fbbf24' : '#cbd5e1',
                                        transition: 'transform 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1.0)'}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#475569', marginBottom: 8 }}>Nội dung đánh giá:</label>
                        <textarea
                            required
                            placeholder="Hãy chia sẻ cảm nhận, trải nghiệm thực tế của bạn về sản phẩm này để giúp những người mua sau nhé..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            style={{ 
                                width: '100%', 
                                height: 120, 
                                padding: 12, 
                                borderRadius: 8, 
                                border: '1px solid #cbd5e1', 
                                fontSize: 14, 
                                color: '#0f172a',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                        <button type="button" onClick={onClose} style={secondaryButton}>Hủy</button>
                        <button 
                            type="submit" 
                            disabled={submitting} 
                            style={{ 
                                ...successButton, 
                                background: '#0ea5e9', 
                                color: '#fff', 
                                border: '1px solid #0ea5e9',
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {submitting ? 'Đang gửi...' : (existingReview ? 'Cập nhật' : 'Gửi đánh giá')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const MyOrders = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [myReviews, setMyReviews] = useState([]);
    const [returningOrder, setReturningOrder] = useState(null);
    const [reviewingProduct, setReviewingProduct] = useState(null); // { item, orderId }
    const [params, setParams] = useState({ page: 1, pageSize: 10, status: '', fromDate: '', toDate: '' });
    const highlightedOrderId = Number(searchParams.get('orderId') || 0);
    const highlightedOrderRef = useRef(null);
    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadOrders = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const res = await orderApi.getMyOrders({
                page: params.page,
                pageSize: params.pageSize,
                status: params.status || undefined,
                fromDate: params.fromDate || undefined,
                toDate: params.toDate || undefined,
            });
            const paged = unwrapPagedData(res);
            setOrders(paged.items);
            setTotal(paged.totalCount);
        } catch {
            showToast('Lỗi khi tải dữ liệu đơn hàng', 'danger');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const loadMyReviews = async () => {
        try {
            const res = await reviewApi.getMyReviews();
            setMyReviews(unwrapApiData(res, []) || []);
        } catch (e) {
            console.error('Error loading my reviews:', e);
        }
    };

    useEffect(() => {
        loadOrders();
        loadMyReviews();
        const intervalId = window.setInterval(() => {
            loadOrders(false);
            loadMyReviews();
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, [params.page, params.pageSize, params.status, params.fromDate, params.toDate]);

    useEffect(() => {
        if (!loading && highlightedOrderId && highlightedOrderRef.current) {
            highlightedOrderRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightedOrderId, loading, orders]);

    const openDetail = async (id) => {
        try {
            const res = await orderApi.getById(id);
            setSelectedOrder(unwrapApiData(res));
        } catch {
            showToast('Không thể tải chi tiết đơn hàng', 'danger');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
        try {
            setActingId(id);
            await orderApi.cancel(id);
            showToast('Hủy đơn hàng thành công', 'success');
            setSelectedOrder(null);
            await loadOrders(false);
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể hủy đơn hàng này', 'danger');
        } finally {
            setActingId(null);
        }
    };

    const handleReceive = async (id) => {
        if (!window.confirm('Xác nhận bạn đã nhận được hàng?')) return;
        try {
            setActingId(id);
            await orderApi.received(id);
            showToast('Xác nhận nhận hàng thành công', 'success');
            setSelectedOrder(null);
            await loadOrders(false);
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xác nhận nhận hàng', 'danger');
        } finally {
            setActingId(null);
        }
    };

    const handleReorder = (order) => {
        const items = getItems(order);
        const productIds = items.map(item => item.productId || item.ProductId).filter(Boolean);
        if (productIds.length === 1) {
            navigate(`/customer/products/${productIds[0]}`);
        } else {
            navigate('/customer/home');
        }
        setSelectedOrder(null);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '100px', fontSize: 18, color: '#64748b', fontWeight: 800 }}>Đang tải danh sách đơn hàng...</div>;
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
                <button onClick={() => navigate('/customer/home')} style={{ background: 'transparent', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, padding: 0 }}>
                    ← Quay lại trang chủ
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#0f172a' }}>Đơn hàng của tôi</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <select value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))} style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', fontWeight: 600, fontSize: 14 }}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(ORDER_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </select>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="date"
                            value={params.fromDate}
                            onChange={event => setParams(prev => ({ ...prev, fromDate: event.target.value, page: 1 }))}
                            style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 38px 0 12px', fontWeight: 700, colorScheme: 'light', fontSize: 14, color: params.fromDate ? '#0f172a' : '#94a3b8', outline: 'none', cursor: 'pointer' }}
                            title="Từ ngày"
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#0ea5e9', pointerEvents: 'none', fontSize: 14 }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="date"
                            value={params.toDate}
                            onChange={event => setParams(prev => ({ ...prev, toDate: event.target.value, page: 1 }))}
                            style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 38px 0 12px', fontWeight: 700, colorScheme: 'light', fontSize: 14, color: params.toDate ? '#0f172a' : '#94a3b8', outline: 'none', cursor: 'pointer' }}
                            title="Đến ngày"
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#0ea5e9', pointerEvents: 'none', fontSize: 14 }} />
                    </div>
                </div>
            </div>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ color: '#475569', margin: 0 }}>Bạn chưa có đơn hàng nào</h3>
                    <Link to="/customer/home" style={{ display: 'inline-block', marginTop: 20, padding: '12px 24px', background: '#0ea5e9', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 800 }}>Tiếp tục mua sắm</Link>
                </div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <table style={{ width: '100%', minWidth: 760, borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Mã đơn</th>
                                <th style={thStyle}>Ngày đặt</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Tổng tiền</th>
                                <th style={thStyle}>Trạng thái</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const allowedActions = getAllowedActions(order);
                                return (
                                <tr
                                    key={order.id}
                                    ref={order.id === highlightedOrderId ? highlightedOrderRef : null}
                                    onClick={() => openDetail(order.id)}
                                    style={{ cursor: 'pointer', outline: order.id === highlightedOrderId ? '2px solid #0ea5e9' : 'none' }}
                                >
                                    <td style={{ ...tdStyle, fontWeight: 900, color: '#0ea5e9' }}>{order.orderCode || `#${order.id}`}</td>
                                    <td style={tdStyle}>{formatAppDate(order.createdAt)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626', fontWeight: 900 }}>{formatVnd(order.totalAmount)}</td>
                                    <td style={tdStyle}><StatusPill status={order.status} /></td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={event => event.stopPropagation()}>
                                        <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <button onClick={() => openDetail(order.id)} style={secondaryButton}>Xem chi tiết</button>
                                            {allowedActions.includes('cancel') && <button disabled={actingId === order.id} onClick={() => handleCancel(order.id)} style={dangerButton}>Hủy đơn</button>}
                                            {allowedActions.includes('receive') && <button disabled={actingId === order.id} onClick={() => handleReceive(order.id)} style={successButton}>Đã nhận hàng</button>}
                                            {allowedActions.includes('reorder') && <button onClick={() => handleReorder(order)} style={reorderButton}>🔄 Mua lại</button>}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (() => {
                const pageWindow = 2; // pages on each side of current
                const pages = [];
                for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= params.page - pageWindow && i <= params.page + pageWindow)) {
                        pages.push(i);
                    } else if (pages[pages.length - 1] !== '...') {
                        pages.push('...');
                    }
                }
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                        <button disabled={params.page === 1} onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))} style={secondaryButton}>‹</button>
                        {pages.map((p, idx) =>
                            p === '...'
                                ? <span key={`ellipsis-${idx}`} style={{ padding: '10px 4px', color: '#64748b', fontWeight: 700, lineHeight: 1 }}>…</span>
                                : <button key={p} onClick={() => setParams(prev => ({ ...prev, page: p }))} style={{ ...secondaryButton, background: params.page === p ? '#0ea5e9' : '#f8fafc', color: params.page === p ? '#fff' : '#0f172a', minWidth: 38 }}>{p}</button>
                        )}
                        <button disabled={params.page === totalPages} onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))} style={secondaryButton}>›</button>
                    </div>
                );
            })()}

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    actingId={actingId}
                    onClose={() => setSelectedOrder(null)}
                    onCancel={handleCancel}
                    onReceive={handleReceive}
                    onReorder={handleReorder}
                    myReviews={myReviews}
                    onOpenReview={(item, orderId) => setReviewingProduct({ item, orderId })}
                    onOpenReturn={(order) => {
                        setSelectedOrder(null);
                        setReturningOrder(order);
                    }}
                />
            )}

            {reviewingProduct && (
                <ReviewModal
                    isOpen={!!reviewingProduct}
                    onClose={() => setReviewingProduct(null)}
                    product={reviewingProduct.item}
                    orderId={reviewingProduct.orderId}
                    myReviews={myReviews}
                    onSubmitSuccess={loadMyReviews}
                />
            )}

            {returningOrder && (
                <ReturnRequestModal
                    order={returningOrder}
                    onClose={() => setReturningOrder(null)}
                    onSubmitSuccess={loadOrders}
                />
            )}
        </div>
    );
};

const ReturnRequestModal = ({ order, onClose, onSubmitSuccess }) => {
    const [type, setType] = useState(0); // 0 = Return, 1 = Exchange
    const [reason, setReason] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();

    if (!order) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!reason.trim()) {
            showToast('Vui lòng nhập lý do trả hàng', 'danger');
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl = '';
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await returnRequestApi.upload(formData);
                imageUrl = uploadRes.data?.data || '';
            }

            await returnRequestApi.create({
                orderId: order.id,
                type,
                reason: reason.trim(),
                imageUrl
            });

            showToast('Gửi yêu cầu trả hàng thành công!', 'success');
            if (onSubmitSuccess) onSubmitSuccess();
            onClose();
        } catch (err) {
            showToast(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(2,6,23,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ width: 'min(550px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 30px 90px rgba(0,0,0,0.35)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                        Yêu cầu Trả hàng / Hoàn tiền
                    </h3>
                    <button onClick={onClose} style={{ border: 0, background: 'transparent', fontSize: 22, fontWeight: 900, cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Mã đơn hàng:</span>
                            <span style={{ fontSize: 13, color: '#0ea5e9', fontWeight: 900 }}>{order.orderCode || `#${order.id}`}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Tổng thanh toán:</span>
                            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 900 }}>{formatVnd(order.totalAmount)}</span>
                        </div>
                    </div>



                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#475569', marginBottom: 8 }}>Nhập lý do chi tiết:</label>
                        <textarea
                            required
                            placeholder="Vui lòng cung cấp lý do chi tiết (ví dụ: sản phẩm bị vỡ hỏng do vận chuyển, không đúng thông số, lỗi kỹ thuật...) để được hỗ trợ nhanh nhất."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            style={{ 
                                width: '100%', 
                                height: 100, 
                                padding: 12, 
                                borderRadius: 8, 
                                border: '1px solid #cbd5e1', 
                                fontSize: 13, 
                                color: '#0f172a',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#475569', marginBottom: 8 }}>Tải lên hình ảnh bằng chứng (nếu có):</label>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                                <button type="button" style={{ ...secondaryButton, padding: '8px 14px', fontSize: 13, background: '#f1f5f9' }}>
                                    📷 Chọn ảnh thực tế
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    style={{ position: 'absolute', left: 0, top: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                />
                            </div>
                            {imagePreview && (
                                <div style={{ position: 'relative' }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                                    <button
                                        type="button"
                                        onClick={() => { setImageFile(null); setImagePreview(''); }}
                                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 0, fontSize: 10, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                        <button type="button" onClick={onClose} style={secondaryButton}>Hủy bỏ</button>
                        <button 
                            type="submit" 
                            disabled={submitting} 
                            style={{ 
                                ...successButton, 
                                background: type === 0 ? '#e11d48' : '#0ea5e9', 
                                color: '#fff', 
                                border: `1px solid ${type === 0 ? '#e11d48' : '#0ea5e9'}`,
                                opacity: submitting ? 0.7 : 1,
                                cursor: submitting ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MyOrders;
