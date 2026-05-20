import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { orderApi, userApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { ORDER_STATUS, activeLabel, formatVnd, readValue, roleLabel } from '../utils/display';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import '../styles/admin.css';

const getName = (user) => readValue(user, 'fullName', 'FullName', 'name', 'Name', 'username', 'Username') || 'Người dùng';
const getUsername = (user) => readValue(user, 'username', 'Username', 'userName', 'UserName') || '';

const RoleBadge = ({ userType }) => {
    const value = Number(userType);
    const badge = value === 1 ? 'badge-admin' : value === 2 ? 'badge-supplier' : 'badge-user';
    return <span className={`badge ${badge}`}>{roleLabel(value)}</span>;
};

const StatusBadge = ({ isActive }) => (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
        <span className={`status-dot ${isActive ? 'dot-active' : 'dot-inactive'}`} />
        {activeLabel(Boolean(isActive))}
    </span>
);

const OrderStatusBadge = ({ status }) => {
    const item = ORDER_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const UserDetailModal = ({ user, orders, loadingOrders, onClose, onEdit, onToggle }) => {
    if (!user) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết người dùng</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row"><span className="detail-label">Họ tên</span><span className="detail-value primary">{getName(user)}</span></div>
                        <div className="detail-row"><span className="detail-label">Tài khoản</span><span className="detail-value">@{getUsername(user) || 'Chưa có'}</span></div>
                        <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{user.email || 'Chưa có'}</span></div>
                        <div className="detail-row"><span className="detail-label">Số điện thoại</span><span className="detail-value">{user.phone || 'Chưa có'}</span></div>
                        <div className="detail-row"><span className="detail-label">Địa chỉ</span><span className="detail-value">Chưa có dữ liệu</span></div>
                        <div className="detail-row"><span className="detail-label">Vai trò</span><RoleBadge userType={user.userType} /></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái</span><StatusBadge isActive={user.isActive} /></div>
                        <div className="detail-row"><span className="detail-label">Ngày tạo tài khoản</span><span className="detail-value">{formatAppDateTime(user.createdAt)}</span></div>
                        <div className="detail-row"><span className="detail-label">Tổng chi tiêu</span><span className="detail-value large danger">{formatVnd(user.totalSpent)}</span></div>
                        <div className="detail-row"><span className="detail-label">Số đơn hàng</span><span className="detail-value">{user.orderCount || 0}</span></div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Lịch sử đơn hàng</div>
                        <table className="admin-table admin-table-compact">
                            <thead>
                                <tr>
                                    <th>Mã đơn</th>
                                    <th>Ngày đặt</th>
                                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingOrders ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32 }}><i className="fa fa-spinner fa-spin" /></td></tr>
                                ) : orders.length > 0 ? orders.map(order => (
                                    <tr key={order.id}>
                                        <td className="id-column">{order.orderCode || `#${order.id}`}</td>
                                        <td>{formatAppDate(order.createdAt)}</td>
                                        <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(order.totalAmount)}</td>
                                        <td><OrderStatusBadge status={order.status} /></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="empty-state">Chưa có đơn hàng</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    <button className="btn btn-edit" onClick={() => onEdit(user)}><i className="fa fa-pen" /> Chỉnh sửa</button>
                    <button className={`btn ${user.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => onToggle(user)}>
                        <i className={`fa ${user.isActive ? 'fa-ban' : 'fa-unlock'}`} />
                        {user.isActive ? 'Ngừng hoạt động' : 'Mở hoạt động'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditUserModal = ({ user, formData, setFormData, onClose, onSubmit }) => {
    if (!user) return null;
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-sm" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chỉnh sửa tài khoản</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={onSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Tên đăng nhập</label>
                            <input className="form-control" value={getUsername(user)} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Họ và tên *</label>
                            <input className="form-control" required value={formData.name} onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))} />
                        </div>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Số điện thoại</label>
                                <input className="form-control" value={formData.phone} onChange={event => setFormData(prev => ({ ...prev, phone: event.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" value={formData.email} onChange={event => setFormData(prev => ({ ...prev, email: event.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary"><i className="fa fa-save" /> Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Users = () => {
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [detailUser, setDetailUser] = useState(null);
    const [detailOrders, setDetailOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', userType: '', isActive: '' });

    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const q = { page: params.page, pageSize: params.pageSize };
            if (params.keyword) q.keyword = params.keyword;
            if (params.userType !== '') q.userType = params.userType;
            if (params.isActive !== '') q.isActive = params.isActive;
            const res = await userApi.getAll(q);
            const pageData = unwrapPagedData(res);
            setUsers(pageData.items);
            setTotal(pageData.totalCount);
        } catch {
            showToast('Lỗi tải danh sách tài khoản', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, showToast]);

    useEffect(() => {
        const timeoutId = window.setTimeout(fetchUsers, 300);
        return () => window.clearTimeout(timeoutId);
    }, [fetchUsers]);

    const loadUserOrders = async (userId) => {
        setLoadingOrders(true);
        try {
            const orderRes = await orderApi.search({ userId, page: 1, pageSize: 5 });
            setDetailOrders(unwrapPagedData(orderRes).items);
        } catch {
            setDetailOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    };

    const openDetail = async (user) => {
        try {
            const res = await userApi.getById(user.id);
            const fullUser = unwrapApiData(res, user);
            setDetailUser(fullUser);
            loadUserOrders(user.id);
        } catch {
            setDetailUser(user);
            loadUserOrders(user.id);
        }
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setFormData({ name: getName(user), email: user.email || '', phone: user.phone || '' });
    };

    const handleSave = async (event) => {
        event.preventDefault();
        try {
            await userApi.update(editingUser.id, {
                fullName: formData.name,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: editingUser.role || (Number(editingUser.userType) === 1 ? 'Admin' : Number(editingUser.userType) === 2 ? 'Supplier' : 'User'),
                userType: editingUser.userType,
                isActive: editingUser.isActive,
            });
            showToast('Cập nhật tài khoản thành công', 'success');
            setEditingUser(null);
            setDetailUser(null);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không cập nhật được tài khoản', 'danger');
        }
    };

    const handleToggleActive = async (user) => {
        const action = user.isActive ? 'ngừng hoạt động' : 'mở hoạt động';
        if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản @${getUsername(user)}?`)) return;
        try {
            await userApi.toggleActive(user.id);
            showToast(`Đã ${action} tài khoản`, 'success');
            setDetailUser(null);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || `Không thể ${action} tài khoản`, 'danger');
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Quản lý người dùng</h2>
                    <p>Tổng cộng <strong>{total}</strong> tài khoản</p>
                </div>

                <div className="filter-bar">
                    <div className="search-box" style={{ flex: 2 }}>
                        <i className="fa fa-search" />
                        <input
                            type="text"
                            className="input-search"
                            placeholder="Tìm tên, số điện thoại, email, tài khoản..."
                            value={params.keyword}
                            onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))}
                        />
                    </div>
                    <select className="select-filter" value={params.userType} onChange={event => setParams(prev => ({ ...prev, userType: event.target.value, page: 1 }))}>
                        <option value="">Tất cả vai trò</option>
                        <option value="1">Quản trị viên</option>
                        <option value="2">Nhà cung cấp</option>
                        <option value="0">Khách hàng</option>
                    </select>
                    <select className="select-filter" value={params.isActive} onChange={event => setParams(prev => ({ ...prev, isActive: event.target.value, page: 1 }))}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Ngừng hoạt động</option>
                    </select>
                </div>

                <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                    <table className="admin-table admin-table-compact">
                        <thead>
                            <tr>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: 250 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                            ) : users.length > 0 ? users.map(user => (
                                <tr key={user.id} className="clickable" style={{ opacity: user.isActive ? 1 : 0.68 }} onClick={() => openDetail(user)}>
                                    <td>
                                        <div className="record-summary">
                                            <div className="avatar" style={{ background: user.isActive ? 'linear-gradient(135deg,#00E5FF,#22D3EE)' : '#64748b' }}>
                                                {getName(user).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="record-copy">
                                                <span className="cust-name one-line">{getName(user)}</span>
                                                <span className="cust-phone one-line">@{getUsername(user) || 'chưa có tài khoản'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="one-line">{user.email || 'Chưa có email'}</span>
                                        <span className="cust-phone one-line">{user.phone || 'Chưa có số điện thoại'}</span>
                                    </td>
                                    <td><RoleBadge userType={user.userType} /></td>
                                    <td><StatusBadge isActive={user.isActive} /></td>
                                    <td className="action-btns" onClick={event => event.stopPropagation()}>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openDetail(user)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                            <button className="btn btn-edit btn-sm" onClick={() => startEdit(user)}><i className="fa fa-pen" /> Sửa</button>
                                            <button className={`btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleActive(user)}>
                                                <i className={`fa ${user.isActive ? 'fa-ban' : 'fa-unlock'}`} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="empty-state"><div className="empty-content"><i className="fa fa-users-slash" /><p>Không tìm thấy tài khoản nào</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination-wrapper">
                        <div className="pagination">
                            <button className="btn-page" disabled={params.page === 1} onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))}>‹</button>
                            {Array.from({ length: Math.min(totalPages, 7) }).map((_, index) => (
                                <button key={index + 1} className={`btn-page ${params.page === index + 1 ? 'active' : ''}`} onClick={() => setParams(prev => ({ ...prev, page: index + 1 }))}>{index + 1}</button>
                            ))}
                            <button className="btn-page" disabled={params.page === totalPages} onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {detailUser && (
                <UserDetailModal
                    user={detailUser}
                    orders={detailOrders}
                    loadingOrders={loadingOrders}
                    onClose={() => setDetailUser(null)}
                    onEdit={startEdit}
                    onToggle={handleToggleActive}
                />
            )}

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    formData={formData}
                    setFormData={setFormData}
                    onClose={() => setEditingUser(null)}
                    onSubmit={handleSave}
                />
            )}
        </div>
    );
};

export default Users;
