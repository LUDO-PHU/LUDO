import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi, unwrapApiData, unwrapPagedData } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { formatAppDate, formatAppDateTime } from '../../utils/dateTime';
import { ORDER_STATUS, formatVnd, readValue } from '../../utils/display';

const PLACEHOLDER = 'https://placehold.co/80';
const API_BASE_URL = 'http://127.0.0.1:5001';

const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const getItems = (order) => {
    const details = readValue(order, 'details', 'Details', 'orderDetails', 'OrderDetails');
    return Array.isArray(details) ? details : [];
};

const getItemImage = (item) => readValue(item, 'mainImage', 'MainImage', 'imageUrl', 'ImageUrl');
const getItemName = (item) => readValue(item, 'productName', 'ProductName') || 'Sản phẩm';
const getItemNumber = (item, ...keys) => Number(readValue(item, ...keys) || 0);

const StatusPill = ({ status }) => {
    const item = ORDER_STATUS[status] || { label: status || 'Chưa xác định' };
    const colorMap = {
        Pending: ['#fef3c7', '#92400e'],
        Shipping: ['#dbeafe', '#1d4ed8'],
        Completed: ['#dcfce7', '#166534'],
        Cancelled: ['#fee2e2', '#b91c1c'],
    };
    const [bg, color] = colorMap[status] || ['#f1f5f9', '#475569'];
    return <span style={{ background: bg, color, padding: '6px 14px', borderRadius: 999, fontWeight: 800, fontSize: 13 }}>{item.label}</span>;
};

const OrderDetailModal = ({ order, actingId, onClose, onCancel, onReceive }) => {
    if (!order) return null;
    const items = getItems(order);

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
                        ].map(([label, value]) => (
                            <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                                <div style={{ color: label === 'Tổng tiền' ? '#dc2626' : '#0f172a', fontWeight: 800, lineHeight: 1.45 }}>{value}</div>
                            </div>
                        ))}
                    </div>

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
                                            <Link to={`/customer/products/${item.productId || item.ProductId}`} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#0f172a', textDecoration: 'none' }}>
                                                <img src={getImageUrl(getItemImage(item))} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} onError={event => { event.currentTarget.src = PLACEHOLDER; }} />
                                                <span style={{ fontWeight: 800 }}>{getItemName(item)}</span>
                                            </Link>
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
                    {order.status === 'Pending' && (
                        <button disabled={actingId === order.id} onClick={() => onCancel(order.id)} style={dangerButton}>Hủy đơn</button>
                    )}
                    {order.status === 'Shipping' && (
                        <button disabled={actingId === order.id} onClick={() => onReceive(order.id)} style={successButton}>Đã nhận hàng</button>
                    )}
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

const MyOrders = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, status: '' });
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

    useEffect(() => {
        loadOrders();
        const intervalId = window.setInterval(() => loadOrders(false), 30000);
        return () => window.clearInterval(intervalId);
    }, [params.page, params.pageSize, params.status]);

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
                <select value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))} style={{ minHeight: 42, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 12px', fontWeight: 700 }}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(ORDER_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                </select>
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
                            {orders.map(order => (
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
                                            {order.status === 'Pending' && <button disabled={actingId === order.id} onClick={() => handleCancel(order.id)} style={dangerButton}>Hủy đơn</button>}
                                            {order.status === 'Shipping' && <button disabled={actingId === order.id} onClick={() => handleReceive(order.id)} style={successButton}>Đã nhận hàng</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
                    <button disabled={params.page === 1} onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))} style={secondaryButton}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => (
                        <button key={index + 1} onClick={() => setParams(prev => ({ ...prev, page: index + 1 }))} style={{ ...secondaryButton, background: params.page === index + 1 ? '#0ea5e9' : '#f8fafc', color: params.page === index + 1 ? '#fff' : '#0f172a' }}>{index + 1}</button>
                    ))}
                    <button disabled={params.page === totalPages} onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))} style={secondaryButton}>›</button>
                </div>
            )}

            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    actingId={actingId}
                    onClose={() => setSelectedOrder(null)}
                    onCancel={handleCancel}
                    onReceive={handleReceive}
                />
            )}
        </div>
    );
};

export default MyOrders;
