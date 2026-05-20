import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, orderApi, unwrapApiData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getImageUrl } from '../data/fallbackCatalog';
import { formatAppDate } from '../utils/dateTime';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell,
} from 'recharts';
import '../styles/admin.css';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => formatAppDate(d);

const STATUS_COLORS = {
    Pending: '#f59e0b',
    Shipping: '#2563eb',
    Completed: '#16a34a',
    Cancelled: '#ef4444',
};

const STATUS_VI = {
    Pending: 'Chờ xác nhận',
    Shipping: 'Đang giao',
    Completed: 'Giao thành công',
    Cancelled: 'Đã hủy',
};

const BADGE_CLASS = {
    Pending: 'badge-pending',
    Shipping: 'badge-shipping',
    Completed: 'badge-completed',
    Cancelled: 'badge-cancelled',
};

const RECEIPT_STATUS_VI = {
    PendingAdminReview: 'Chờ quản trị duyệt',
    ApprovedByAdmin: 'Quản trị đã nhận',
    RejectedByAdmin: 'Quản trị từ chối',
    CancelledBySupplier: 'Nhà cung cấp đã hủy',
};

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

const getDetailProductName = (detail) => {
    const product = readValue(detail, 'product', 'Product');
    const productId = readValue(detail, 'productId', 'ProductId');
    return readValue(detail, 'productName', 'ProductName')
        || readValue(product, 'nameVi', 'NameVi', 'name', 'Name')
        || (productId ? `SP #${productId}` : 'Sản phẩm');
};

const getDetailImageUrl = (detail) => {
    const product = readValue(detail, 'product', 'Product');
    return readValue(detail, 'imageUrl', 'ImageUrl') || readValue(product, 'imageUrl', 'ImageUrl');
};

const getDetailNumber = (detail, ...keys) => Number(readValue(detail, ...keys) || 0);

const StatusBadge = ({ status }) => (
    <span className={`badge ${BADGE_CLASS[status] || 'badge-pending'}`}>
        {STATUS_VI[status] || status}
    </span>
);

const ChartFrame = ({ height = 280, children }) => {
    const ref = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const updateDimensions = () => {
            const rect = node.getBoundingClientRect();
            setDimensions({
                width: rect.width,
                height: rect.height || height
            });
        };

        updateDimensions();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateDimensions);
            return () => window.removeEventListener('resize', updateDimensions);
        }

        const observer = new ResizeObserver(updateDimensions);
        observer.observe(node);
        return () => observer.disconnect();
    }, [height]);

    return (
        <div ref={ref} style={{ height: `${height}px`, minHeight: `${height}px`, minWidth: 0, width: '100%' }}>
            {dimensions.width > 0 && dimensions.height > 0 ? children(dimensions.width, dimensions.height) : null}
        </div>
    );
};

const OrderDetailModal = ({ order, onClose }) => {
    if (!order) return null;
    const details = getOrderDetails(order);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết đơn hàng {order.orderCode || `#${order.id}`}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid" style={{ marginBottom: '20px' }}>
                        <div className="detail-row">
                            <span className="detail-label">Khách hàng</span>
                            <span className="detail-value primary">{order.customerName || order.username}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Ngày đặt</span>
                            <span className="detail-value">{fmtDate(order.createdAt)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Tổng tiền</span>
                            <span className="detail-value large danger">{fmtVND(order.totalAmount)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Lợi nhuận</span>
                            <span className="detail-value large success">{fmtVND(order.profit)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Trạng thái</span>
                            <StatusBadge status={order.status} />
                        </div>
                    </div>

                    <div className="section-title">Sản phẩm trong đơn</div>
                    <table className="admin-table" style={{ border: '1px solid #f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th style={{ textAlign: 'center' }}>SL</th>
                                <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                <th style={{ textAlign: 'right' }}>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.length > 0 ? details.map((detail, index) => {
                                const imageUrl = getDetailImageUrl(detail);
                                return (
                                    <tr key={index}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {imageUrl && <img src={getImageUrl(imageUrl)} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                                                <span className="cust-name" style={{ fontSize: '13px' }}>{getDetailProductName(detail)}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}><span className="qty">×{getDetailNumber(detail, 'quantity', 'Quantity')}</span></td>
                                        <td style={{ textAlign: 'right' }}>{fmtVND(getDetailNumber(detail, 'finalPrice', 'FinalPrice', 'unitPrice', 'UnitPrice'))}</td>
                                        <td style={{ textAlign: 'right' }} className="price-text">{fmtVND(getDetailNumber(detail, 'totalPrice', 'TotalPrice'))}</td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="4" className="empty-state">Chưa có dữ liệu sản phẩm</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [chartsReady, setChartsReady] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await dashboardApi.getStats();
            setStats(unwrapApiData(res, null));
        } catch {
            showToast('Không thể tải dữ liệu thống kê', 'danger');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        const frameOne = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setChartsReady(true));
        });
        return () => window.cancelAnimationFrame(frameOne);
    }, []);

    const openOrderDetail = async (order) => {
        try {
            const res = await orderApi.getById(order.id);
            setSelectedOrder(unwrapApiData(res, order));
        } catch {
            setSelectedOrder(order);
            showToast('Không thể tải chi tiết đơn hàng mới nhất', 'danger');
        }
    };

    const revenueData = (stats?.revenueChart || []).map(item => ({ name: item.label, revenue: item.value }));
    const orderStatusData = (stats?.orderStatusChart || []).map(item => ({
        name: STATUS_VI[item.label] || item.label,
        status: item.label,
        count: item.value,
    }));

    if (loading) {
        return (
            <div className="admin-layout">
                <div className="admin-container">
                    <div className="dashboard-stat-grid">
                        {[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: '110px', borderRadius: '16px' }} />)}
                    </div>
                </div>
            </div>
        );
    }

    const pendingOrders = stats?.pendingOrders ?? 0;
    const pendingReceipts = stats?.pendingReceipts ?? 0;
    const pendingApprovals = pendingOrders + pendingReceipts;

    const cards = [
        { label: 'Tổng doanh thu', value: fmtVND(stats?.totalRevenue), sub: 'Chỉ đơn giao thành công', color: '#16a34a', bg: '#dcfce7', icon: 'fa fa-coins' },
        { label: 'Tổng đơn hàng', value: stats?.totalOrders ?? 0, sub: 'Tất cả trạng thái', color: '#475569', bg: '#f1f5f9', icon: 'fa fa-shopping-cart' },
        {
            label: 'Chờ xác nhận',
            value: pendingApprovals,
            sub: 'Đơn hàng và biên lai',
            breakdown: [
                { label: 'Đơn', value: pendingOrders },
                { label: 'Biên lai', value: pendingReceipts },
            ],
            color: '#d97706',
            bg: '#fef3c7',
            icon: 'fa fa-clock'
        },
        { label: 'Đang giao', value: stats?.shippingOrders ?? 0, sub: 'Đơn đang vận chuyển', color: '#2563eb', bg: '#dbeafe', icon: 'fa fa-truck' },
        { label: 'Giao thành công', value: stats?.completedOrders ?? 0, sub: 'Đơn đã hoàn tất', color: '#16a34a', bg: '#dcfce7', icon: 'fa fa-check-circle' },
        { label: 'Đã hủy', value: stats?.cancelledOrders ?? 0, sub: 'Đơn bị hủy', color: '#dc2626', bg: '#fee2e2', icon: 'fa fa-ban' },
        { label: 'Sản phẩm', value: stats?.totalProducts ?? 0, sub: 'Đang kinh doanh', color: '#7c3aed', bg: '#ede9fe', icon: 'fa fa-box' },
        { label: 'Biên lai', value: stats?.totalReceipts ?? 0, sub: 'Nhập kho', color: '#0891b2', bg: '#cffafe', icon: 'fa fa-file-invoice' },
    ];

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <div className="admin-header-row">
                        <div>
                            <h2>Tổng quan</h2>
                            <p>Doanh thu chỉ tính các đơn hàng có trạng thái Giao thành công</p>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
                            <i className="fa fa-sync-alt" /> Làm mới
                        </button>
                    </div>
                </div>

                <div className="dashboard-stat-grid">
                    {cards.map(card => (
                        <div key={card.label} className="stat-card" style={{ '--primary': card.color }}>
                            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
                                <i className={card.icon} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">{card.label}</div>
                                <div className={`stat-value ${typeof card.value === 'number' ? '' : 'stat-value--currency'}`}>{card.value}</div>
                                {card.breakdown ? (
                                    <div className="stat-breakdown" title={card.sub}>
                                        {card.breakdown.map(item => (
                                            <span key={item.label}>{item.label}: <strong>{item.value}</strong></span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="stat-sub">{card.sub}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="dashboard-chart-grid">
                    <div className="card" style={{ minWidth: 0 }}>
                        <div className="section-title">Doanh thu 7 ngày gần nhất</div>
                        <ChartFrame height={280}>
                            {(width, height) => chartsReady && revenueData.length > 0 ? (
                                <AreaChart width={width} height={height} data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                                    <YAxis tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={v => fmtVND(v)} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                                    <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" />
                                </AreaChart>
                            ) : (
                                <div className="empty-content" style={{ height: '100%' }}><i className="fa fa-chart-area" /><p>Chưa có dữ liệu doanh thu</p></div>
                            )}
                        </ChartFrame>
                    </div>

                    <div className="card" style={{ minWidth: 0 }}>
                        <div className="section-title">Trạng thái đơn hàng</div>
                        <ChartFrame height={280}>
                            {(width, height) => chartsReady && orderStatusData.length > 0 ? (
                                <BarChart width={width} height={height} data={orderStatusData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} dy={8} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
                                    <Bar dataKey="count" name="Số đơn" radius={[5, 5, 0, 0]} barSize={28}>
                                        {orderStatusData.map(item => <Cell key={item.status} fill={STATUS_COLORS[item.status] || '#64748b'} />)}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <div className="empty-content" style={{ height: '100%' }}><i className="fa fa-chart-bar" /><p>Chưa có dữ liệu</p></div>
                            )}
                        </ChartFrame>
                    </div>
                </div>

                <div className="dashboard-table-grid">
                    <div className="card table-card">
                        <div className="table-card-header">
                            <div className="section-title" style={{ marginBottom: 0 }}>Đơn hàng gần đây</div>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/orders')}>Xem tất cả</button>
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Khách hàng</th>
                                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats?.recentOrders || []).length > 0 ? stats.recentOrders.map(order => (
                                    <tr key={order.id} className="clickable" onClick={() => openOrderDetail(order)}>
                                        <td className="id-column">{order.orderCode || `#${order.id}`}</td>
                                        <td className="cust-name" style={{ fontSize: '13px' }}>{order.customerName || order.username}</td>
                                        <td className="price-text" style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: '13px' }}>{fmtVND(order.totalAmount)}</td>
                                        <td><StatusBadge status={order.status} /></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="empty-state"><div className="empty-content"><i className="fa fa-box-open" /><p>Chưa có đơn hàng</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card table-card">
                        <div className="table-card-header">
                            <div className="section-title" style={{ marginBottom: 0 }}>Biên lai gần đây</div>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/receipts')}>Xem tất cả</button>
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Sản phẩm</th>
                                    <th style={{ textAlign: 'right' }}>Giá nhập</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats?.recentReceipts || []).length > 0 ? stats.recentReceipts.map(receipt => (
                                    <tr key={receipt.id} className="clickable" onClick={() => navigate('/admin/receipts')}>
                                        <td className="id-column">#{receipt.id}</td>
                                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{receipt.productName || `SP #${receipt.productId}`}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366f1', fontSize: '13px' }}>{fmtVND(receipt.importPrice)}</td>
                                        <td><span className="badge badge-confirmed">{RECEIPT_STATUS_VI[receipt.status] || receipt.status || 'Chưa xác định'}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="empty-state"><div className="empty-content"><i className="fa fa-file-invoice" /><p>Chưa có biên lai</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

export default Dashboard;
