import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, notificationApi, unwrapApiData } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate } from '../utils/dateTime';
import '../styles/admin.css';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => formatAppDate(d);

const RECEIPT_STATUS_VI = {
    PendingAdminReview: 'Chờ quản trị duyệt',
    ApprovedByAdmin: 'Quản trị đã nhận',
    RejectedByAdmin: 'Quản trị từ chối',
    CancelledBySupplier: 'Nhà cung cấp đã hủy',
};

const SupplierDashboard = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await dashboardApi.getSupplierStats();
            setStats(unwrapApiData(res, null));
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tải được tổng quan nhà cung cấp', 'danger');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const markRead = async (id) => {
        try {
            await notificationApi.markRead(id);
            setStats(prev => ({
                ...prev,
                notifications: (prev?.notifications || []).map(item => item.id === id ? { ...item, isRead: true } : item),
                unreadNotifications: Math.max((prev?.unreadNotifications || 0) - 1, 0),
            }));
        } catch { }
    };

    if (loading) {
        return (
            <div className="admin-layout">
                <div className="admin-container">
                    <div className="dashboard-stat-grid">
                        {[...Array(5)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: '100px', borderRadius: '16px' }} />)}
                    </div>
                </div>
            </div>
        );
    }

    const notifications = stats?.notifications || [];

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Tổng quan nhà cung cấp</h2>
                    <p>{stats?.companyName || user?.companyName || user?.name || 'Nhà cung cấp'}</p>
                </div>

                <div className="card supplier-profile-card">
                    <div className="supplier-profile-icon">🏢</div>
                    <div className="supplier-profile-content">
                        <div className="supplier-profile-name">{stats?.companyName || 'Nhà cung cấp'}</div>
                        <div className="supplier-profile-meta">
                            Email: {stats?.email || '—'} · SĐT: {stats?.phone || '—'}
                        </div>
                        <div className="supplier-profile-address">
                            Địa chỉ: {stats?.address || '—'} · Danh mục: {stats?.categoryName || user?.supplierCategoryName || '—'}
                        </div>
                    </div>
                    <div className="supplier-profile-status">
                        <span className={stats?.isActive ? 'supplier-status-active' : 'supplier-status-locked'}>
                            {stats?.isActive ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                    </div>
                </div>

                <div className="dashboard-stat-grid">
                    {[
                        { icon: '📦', label: 'Sản phẩm của tôi', value: stats?.totalProducts || 0, sub: 'Từ dữ liệu hệ thống', color: '#6366f1', bg: '#ede9fe' },
                        { icon: '🧾', label: 'Biên lai đã tạo', value: stats?.totalReceipts || 0, sub: 'Tất cả trạng thái', color: '#f59e0b', bg: '#fef3c7' },
                        { icon: '💰', label: 'Doanh thu nhà cung cấp', value: fmtVND(stats?.supplierRevenue), sub: 'Biên lai quản trị đã nhận', color: '#10b981', bg: '#d1fae5' },
                        { icon: '📨', label: 'Yêu cầu chờ xử lý', value: stats?.pendingRequests || 0, sub: 'Từ quản trị', color: '#0ea5e9', bg: '#e0f2fe' },
                        { icon: '🔔', label: 'Thông báo mới', value: stats?.unreadNotifications || 0, sub: 'Chưa đọc', color: '#ef4444', bg: '#fee2e2' },
                    ].map((card, index) => (
                        <div key={index} className="stat-card" style={{ '--primary': card.color }}>
                            <div className="stat-icon" style={{ background: card.bg, color: card.color, fontSize: '24px' }}>{card.icon}</div>
                            <div className="stat-content">
                                <div className="stat-label">{card.label}</div>
                                <div className="stat-value" style={{ fontSize: typeof card.value === 'string' ? '22px' : undefined }}>{card.value}</div>
                                <div className="stat-sub">{card.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="section-title">Hành động nhanh</div>
                    <div className="quick-actions-row">
                        <button className="btn btn-primary" onClick={() => navigate('/admin/receipts', { state: { openCreate: true } })}>
                            <i className="fa fa-plus" /> Tạo biên lai
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/admin/products')}>
                            <i className="fa fa-box" /> Xem sản phẩm
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/admin/receipts')}>
                            <i className="fa fa-list" /> Danh sách biên lai
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/admin/supplier-requests')}>
                            <i className="fa fa-envelope" /> Xem yêu cầu
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/admin/supplier-requests')}>
                            <i className="fa fa-bell" /> Xem thông báo
                        </button>
                    </div>
                </div>

                <div className="dashboard-table-grid">
                    <div className="card table-card">
                        <div className="table-card-header">
                            <div className="section-title" style={{ marginBottom: 0 }}>Biên lai gần đây</div>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/receipts')}>Tất cả</button>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Sản phẩm</th><th>Loại</th><th style={{ textAlign: 'center' }}>SL</th><th>Trạng thái</th></tr></thead>
                            <tbody>
                                {(stats?.recentReceipts || []).length > 0 ? stats.recentReceipts.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{r.productName || `SP #${r.productId}`}</td>
                                        <td>{r.receiptTypeLabel || r.receiptType}</td>
                                        <td style={{ textAlign: 'center' }}><span className="qty">{r.quantity}</span></td>
                                        <td><span className="badge badge-pending">{RECEIPT_STATUS_VI[r.status] || r.status || 'Chưa xác định'}</span></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="empty-state"><div className="empty-content"><i className="fa fa-file-invoice" /><p>Chưa có biên lai nào</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card">
                        <div className="section-title">Thông báo</div>
                        {notifications.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {notifications.map(n => (
                                    <div key={n.id} onClick={() => markRead(n.id)}
                                        style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', background: n.isRead ? '#f8fafc' : '#ede9fe', borderLeft: n.isRead ? '3px solid #e2e8f0' : '3px solid #6366f1' }}>
                                        <div style={{ fontSize: '13px', fontWeight: n.isRead ? 500 : 700, color: n.isRead ? '#475569' : '#3730a3' }}>
                                            {n.title || 'Thông báo'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{n.content || n.message}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{fmtDate(n.createdAt)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-content" style={{ padding: '40px 0' }}>
                                <i className="fa fa-bell-slash" style={{ fontSize: '36px', color: '#e2e8f0' }} />
                                <p>Chưa có thông báo mới</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierDashboard;
