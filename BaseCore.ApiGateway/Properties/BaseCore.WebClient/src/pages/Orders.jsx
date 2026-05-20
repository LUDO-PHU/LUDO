import React, { useState, useEffect } from 'react';
import { orderApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate } from '../utils/dateTime';
import '../styles/admin.css';

const readValue = (source, ...keys) => {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
};

const getOrderDetails = (order) => {
    const details = readValue(order, 'details', 'Details', 'orderDetails', 'OrderDetails');
    return Array.isArray(details) ? details : [];
};

const getCustomerName = (order) => readValue(order, 'customerName', 'CustomerName', 'username', 'Username') || 'Khách hàng';
const getCustomerPhone = (order) => readValue(order, 'customerPhone', 'CustomerPhone', 'phone', 'Phone') || '';
const getShippingAddress = (order) => readValue(order, 'shippingAddress', 'ShippingAddress') || '';
const getOrderNote = (order) => readValue(order, 'note', 'Note') || '';
const getDetailProductName = (detail) => readValue(detail, 'productName', 'ProductName') || 'Sản phẩm';
const getDetailQuantity = (detail) => readValue(detail, 'quantity', 'Quantity') || 0;

const Orders = () => {
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);

    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        keyword: '',
        status: '',
        fromDate: '',
        toDate: ''
    });

    const loadOrders = async () => {
        try {
            const res = await orderApi.search(params);
            const data = res.data?.data || res.data || {};
            setOrders(data.items || data.Items || []);
            setTotal(data.totalCount || data.TotalCount || 0);
        } catch (err) {
            showToast("Lỗi tải danh sách đơn hàng", "danger");
        }
    };

    useEffect(() => {
        loadOrders();
    }, [params]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await orderApi.updateStatus(id, { status: newStatus });
            showToast("Cập nhật thành công!", "success");
            loadOrders();
        } catch (err) {
            console.error("LỖI API:", err);
            showToast(err.response?.data?.message || "Lỗi cập nhật trạng thái", "danger");
        }
    };

    const handleConfirm = async (id) => {
        if (!window.confirm("Xác nhận đơn hàng này? Chuyển sang trạng thái Đã xác nhận.")) return;
        handleUpdateStatus(id, 'Confirmed');
    };

    const handleShip = async (id) => {
        if (!window.confirm("Bắt đầu giao đơn hàng này? Chuyển sang trạng thái Đang giao.")) return;
        handleUpdateStatus(id, 'Shipping');
    };

    const formatVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>🛒 Quản lý Đơn hàng</h2>

                    <div className="filter-group card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr', gap: '15px', alignItems: 'end' }}>
                        <div className="search-box">
                            <i className="fa fa-search"></i>
                            <input
                                type="text"
                                placeholder="Tìm số điện thoại, tên khách..."
                                className="input-search"
                                onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
                            />
                        </div>

                        <div className="status-box">
                            <select
                                className="select-filter"
                                style={{ width: '100%', maxWidth: 'none' }}
                                onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
                            >
                                <option value="">-- Trạng thái --</option>
                                <option value="Pending">Chờ xử lý</option>
                                <option value="Confirmed">Đã xác nhận</option>
                                <option value="Shipping">Đang giao</option>
                                <option value="Delivered">Đã giao hàng</option>
                                <option value="Completed">Hoàn tất</option>
                                <option value="CancelledByUser">Khách hủy</option>
                                <option value="CancelledByAdmin">Admin hủy</option>
                                <option value="Rejected">Đã từ chối</option>
                            </select>
                        </div>

                        <div className="date-input" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <small style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Từ ngày</small>
                            <input type="date" className="input-search" style={{ paddingLeft: '15px' }} onChange={(e) => setParams({ ...params, fromDate: e.target.value, page: 1 })} />
                        </div>

                        <div className="date-input" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <small style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Đến ngày</small>
                            <input type="date" className="input-search" style={{ paddingLeft: '15px' }} onChange={(e) => setParams({ ...params, toDate: e.target.value, page: 1 })} />
                        </div>
                    </div>
                </div>

                <div className="table-responsive card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '70px' }}>ID</th>
                                <th>Khách hàng</th>
                                <th>Sản phẩm</th>
                                <th>Tổng đơn</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center' }}>Xử lý</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? (
                                orders.map(order => {
                                    const items = getOrderDetails(order);
                                    const shippingAddress = getShippingAddress(order);
                                    const note = getOrderNote(order);
                                    return (
                                        <tr key={order.id}>
                                            <td className="id-column">#{order.id}</td>
                                            <td>
                                                <div className="cust-name">{getCustomerName(order)}</div>
                                                <div className="cust-phone">{getCustomerPhone(order) || 'Chưa có SĐT'}</div>
                                                <div style={{ fontSize: '12px', color: shippingAddress ? '#64748b' : '#9ca3af', marginTop: '4px' }}>
                                                    <i className="fa fa-map-marker-alt" /> {shippingAddress || 'Chưa có địa chỉ'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: note ? '#64748b' : '#9ca3af', marginTop: '2px' }}>
                                                    <i className="fa fa-sticky-note" /> {note || 'Không có ghi chú'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                                    {formatAppDate(order.createdAt || order.orderDate)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="order-items-summary">
                                                    {items.map((item, idx) => (
                                                        <div key={idx} className="item-line">
                                                            • {getDetailProductName(item)} <span className="qty">x{getDetailQuantity(item)}</span>
                                                        </div>
                                                    ))}
                                                    {items.length === 0 && (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Trống</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="price-text" style={{ color: '#dc2626' }}>{formatVND(order.totalAmount)}</td>
                                            <td>
                                                <span className={`badge badge-${order.status.toLowerCase()}`}>
                                                    {order.status === 'Pending' ? 'Chờ xử lý' :
                                                        order.status === 'Confirmed' ? 'Đã xác nhận' :
                                                        order.status === 'Shipping' ? 'Đang giao' :
                                                        order.status === 'Delivered' ? 'Đã giao' :
                                                        order.status === 'Completed' ? 'Hoàn tất' : 
                                                        order.status.startsWith('Cancelled') ? 'Đã hủy' : 'Từ chối'}
                                                </span>
                                            </td>
                                            <td className="action-btns">
                                                {order.status === 'Pending' && (
                                                    <div className="btn-group">
                                                        <button className="btn btn-success btn-sm" onClick={() => handleConfirm(order.id)}>
                                                            <i className="fa fa-check"></i> Xác nhận
                                                        </button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(order.id, 'CancelledByAdmin')}>
                                                            <i className="fa fa-times"></i> Hủy
                                                        </button>
                                                    </div>
                                                )}

                                                {order.status === 'Confirmed' && (
                                                    <div className="btn-group">
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleShip(order.id)}>
                                                            <i className="fa fa-truck"></i> Giao hàng
                                                        </button>
                                                    </div>
                                                )}

                                                {order.status === 'Shipping' && (
                                                    <div className="shipping-anim">
                                                        <i className="fa fa-truck-moving shipping-icon"></i>
                                                        <span> Đang giao...</span>
                                                    </div>
                                                )}

                                                {order.status === 'Delivered' && (
                                                    <div style={{ textAlign: 'center', color: '#0ea5e9', fontWeight: 'bold' }}>
                                                        <i className="fa fa-home"></i> Chờ khách nhận
                                                    </div>
                                                )}

                                                {order.status === 'Completed' && (
                                                    <div style={{ textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>
                                                        <i className="fa fa-check-circle"></i> Đã xong
                                                    </div>
                                                )}

                                                {(order.status.startsWith('Cancelled') || order.status === 'Rejected') && (
                                                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                                                        <i className="fa fa-ban"></i> Đã đóng
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <div className="empty-content">
                                            <i className="fa fa-box-open"></i>
                                            <p>Không tìm thấy dữ liệu đơn hàng nào.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {total > params.pageSize && (
                    <div className="pagination-wrapper">
                        <div className="pagination">
                            {Array.from({ length: Math.ceil(total / params.pageSize) }).map((_, i) => (
                                <button key={i} className={`btn-page ${params.page === i + 1 ? 'active' : ''}`} onClick={() => setParams({ ...params, page: i + 1 })}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
