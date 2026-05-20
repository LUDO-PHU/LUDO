import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getImageUrl } from '../data/fallbackCatalog';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { ORDER_STATUS, formatVnd, readValue } from '../utils/display';
import '../styles/admin.css';

const getItems = (order) => {
    const details = readValue(order, 'details', 'Details', 'orderDetails', 'OrderDetails');
    return Array.isArray(details) ? details : [];
};

const getCustomerName = (order) => readValue(order, 'customerName', 'CustomerName', 'username', 'Username') || 'Khách hàng';
const getCustomerPhone = (order) => readValue(order, 'customerPhone', 'CustomerPhone', 'phone', 'Phone') || '';
const getShippingAddress = (order) => readValue(order, 'shippingAddress', 'ShippingAddress') || '';
const getOrderNote = (order) => readValue(order, 'note', 'Note') || '';

const getItemName = (detail) =>
    readValue(detail, 'productName', 'ProductName') || readValue(detail?.product, 'nameVi', 'NameVi') || 'Sản phẩm';

const getItemImage = (detail) =>
    readValue(detail, 'mainImage', 'MainImage', 'imageUrl', 'ImageUrl') || readValue(detail?.product, 'mainImage', 'imageUrl');

const getNumber = (source, ...keys) => Number(readValue(source, ...keys) || 0);

const StatusBadge = ({ status }) => {
    const item = ORDER_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const isPendingOrderStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    return value === 'pending'
        || value === 'pendingadminreview'
        || value === 'chờ xử lý'
        || value === 'cho xu ly'
        || value === 'chờ xác nhận'
        || value === 'cho xac nhan';
};

const isShippingOrderStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    return value === 'shipping'
        || value === 'confirmed'
        || value === 'delivered'
        || value === 'đang giao'
        || value === 'dang giao';
};

const OrderDetailModal = ({ order, onClose, onConfirm, onCancel }) => {
    if (!order) return null;
    const details = getItems(order);
    const canConfirm = isPendingOrderStatus(order.status);
    const canCancel = canConfirm || isShippingOrderStatus(order.status);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết đơn hàng {order.orderCode || `#${order.id}`}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row"><span className="detail-label">Mã đơn hàng</span><span className="detail-value primary">{order.orderCode || `#${order.id}`}</span></div>
                        <div className="detail-row"><span className="detail-label">Khách hàng</span><span className="detail-value">{getCustomerName(order)}</span></div>
                        <div className="detail-row"><span className="detail-label">Số điện thoại</span><span className="detail-value">{getCustomerPhone(order) || 'Chưa có'}</span></div>
                        <div className="detail-row"><span className="detail-label">Ngày đặt</span><span className="detail-value">{formatAppDateTime(order.createdAt)}</span></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái đơn hàng</span><StatusBadge status={order.status} /></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái thanh toán</span><span className="detail-value">Thanh toán khi nhận hàng</span></div>
                        <div className="detail-row"><span className="detail-label">Tổng tiền</span><span className="detail-value large danger">{formatVnd(order.totalAmount)}</span></div>
                        <div className="detail-row"><span className="detail-label">Lợi nhuận</span><span className="detail-value large success">{formatVnd(order.profit)}</span></div>
                        <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Địa chỉ giao hàng</span><span className="detail-value">{getShippingAddress(order) || 'Chưa có'}</span></div>
                        <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Ghi chú</span><span className="detail-value">{getOrderNote(order) || 'Không có ghi chú'}</span></div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Sản phẩm trong đơn</div>
                        <table className="admin-table admin-table-compact">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th style={{ textAlign: 'center' }}>Số lượng</th>
                                    <th style={{ textAlign: 'right' }}>Giá</th>
                                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.length > 0 ? details.map((detail, index) => {
                                    const imageUrl = getItemImage(detail);
                                    return (
                                        <tr key={`${detail.id || index}`}>
                                            <td>
                                                <div className="record-summary">
                                                    {imageUrl && <img src={getImageUrl(imageUrl)} alt="" className="record-thumb" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                                                    <span className="cust-name one-line">{getItemName(detail)}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}><span className="qty">×{getNumber(detail, 'quantity', 'Quantity')}</span></td>
                                            <td style={{ textAlign: 'right' }}>{formatVnd(getNumber(detail, 'finalPrice', 'FinalPrice', 'unitPrice', 'UnitPrice'))}</td>
                                            <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(getNumber(detail, 'totalPrice', 'TotalPrice'))}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="4" className="empty-state">Chưa có dữ liệu sản phẩm</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    {canConfirm && (
                        <>
                            <button className="btn btn-danger" onClick={() => onCancel(order.id)}>Hủy đơn</button>
                            <button className="btn btn-success" onClick={() => onConfirm(order.id)}>Duyệt đơn</button>
                        </>
                    )}
                    {!canConfirm && canCancel && <button className="btn btn-danger" onClick={() => onCancel(order.id)}>Hủy đơn</button>}
                </div>
            </div>
        </div>
    );
};

const Orders = () => {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', status: '', fromDate: '', toDate: '' });
    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await orderApi.search({
                ...params,
                keyword: params.keyword || undefined,
                status: params.status || undefined,
                fromDate: params.fromDate || undefined,
                toDate: params.toDate || undefined,
            });
            const paged = unwrapPagedData(res);
            setOrders(paged.items);
            setTotal(paged.totalCount);
        } catch {
            showToast('Lỗi tải danh sách đơn hàng', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, showToast]);

    useEffect(() => {
        loadOrders();
        const intervalId = window.setInterval(loadOrders, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadOrders]);

    const openDetail = async (id) => {
        try {
            const res = await orderApi.getById(id);
            setSelectedOrder(unwrapApiData(res));
        } catch {
            showToast('Không thể tải chi tiết đơn hàng', 'danger');
        }
    };

    const handleConfirm = async (id) => {
        try {
            await orderApi.confirm(id);
            showToast('Xác nhận đơn hàng thành công', 'success');
            setSelectedOrder(null);
            await loadOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xác nhận đơn hàng', 'danger');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
        try {
            await orderApi.cancel(id);
            showToast('Hủy đơn hàng thành công', 'success');
            setSelectedOrder(null);
            await loadOrders();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể hủy đơn hàng', 'danger');
        }
    };

    const setPage = (page) => setParams(prev => ({ ...prev, page: Math.min(Math.max(page, 1), totalPages) }));

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Quản lý đơn hàng</h2>
                    <p>Tổng cộng <strong>{total}</strong> đơn hàng</p>
                </div>

                <div className="filter-bar">
                    <div className="search-box" style={{ flex: 2 }}>
                        <i className="fa fa-search" />
                        <input
                            type="text"
                            className="input-search"
                            placeholder="Tìm mã đơn, khách hàng, số điện thoại..."
                            value={params.keyword}
                            onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))}
                        />
                    </div>
                    <select className="select-filter" value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(ORDER_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </select>
                    <input type="date" className="input-search" style={{ paddingLeft: 12 }} value={params.fromDate} onChange={event => setParams(prev => ({ ...prev, fromDate: event.target.value, page: 1 }))} />
                    <input type="date" className="input-search" style={{ paddingLeft: 12 }} value={params.toDate} onChange={event => setParams(prev => ({ ...prev, toDate: event.target.value, page: 1 }))} />
                </div>

                <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                    <table className="admin-table admin-table-compact">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Ngày tạo</th>
                                <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: 220 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                            ) : orders.length > 0 ? orders.map(order => {
                                const canConfirm = isPendingOrderStatus(order.status);
                                const canCancel = canConfirm || isShippingOrderStatus(order.status);
                                return (
                                    <tr key={order.id} className="clickable" onClick={() => openDetail(order.id)}>
                                        <td className="id-column">{order.orderCode || `#${order.id}`}</td>
                                        <td>
                                            <div className="cust-name one-line">{getCustomerName(order)}</div>
                                            <div className="cust-phone one-line">{getCustomerPhone(order) || 'Chưa có số điện thoại'}</div>
                                        </td>
                                        <td>{formatAppDate(order.createdAt)}</td>
                                        <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(order.totalAmount)}</td>
                                        <td><StatusBadge status={order.status} /></td>
                                        <td className="action-btns" onClick={event => event.stopPropagation()}>
                                            <div className="btn-group">
                                                <button className="btn btn-secondary btn-sm" onClick={() => openDetail(order.id)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                                {canConfirm && <button className="btn btn-success btn-sm" onClick={() => handleConfirm(order.id)}>Duyệt</button>}
                                                {canCancel && <button className="btn btn-danger btn-sm" onClick={() => handleCancel(order.id)}>Hủy</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="6" className="empty-state"><div className="empty-content"><i className="fa fa-box-open" /><p>Không tìm thấy đơn hàng nào</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination-wrapper">
                        <div className="pagination">
                            <button className="btn-page" disabled={params.page === 1} onClick={() => setPage(params.page - 1)}>‹</button>
                            {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => {
                                const page = index + 1;
                                return <button key={page} className={`btn-page ${params.page === page ? 'active' : ''}`} onClick={() => setPage(page)}>{page}</button>;
                            })}
                            <button className="btn-page" disabled={params.page === totalPages} onClick={() => setPage(params.page + 1)}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
        </div>
    );
};

export default Orders;
