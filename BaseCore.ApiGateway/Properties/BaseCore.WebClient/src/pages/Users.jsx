import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { userApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import '../styles/admin.css';

const Users = () => {
    const context = useOutletContext();
    const lang = context?.lang || 'vi';
    const { showToast } = useToast();

    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);

    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        keyword: '',
        userType: '',
        isActive: ''
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        username: '', name: '', email: '', phone: '', userType: 0, isActive: true
    });

    const fetchUsers = async () => {
        try {
            const queryParams = { page: params.page, pageSize: params.pageSize };
            if (params.keyword) queryParams.keyword = params.keyword;
            if (params.userType !== '') queryParams.userType = params.userType;
            if (params.isActive !== '') queryParams.isActive = params.isActive;

            const res = await api.get('/users', { params: queryParams });
            setUsers(res.data?.items || []);
            setTotal(res.data?.totalCount || 0);
        } catch (err) {
            console.error(err);
            showToast("Lỗi kết nối máy chủ khi tải danh sách", "danger");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [params]);

    const handleEdit = (user) => {
        setEditingId(user.id);
        setFormData({
            username: user.username || user.userName || '',
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            userType: user.userType,
            isActive: user.isActive
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const payload = {
            id: editingId,
            userName: formData.username,
            name: formData.name || "",
            email: formData.email || "",
            phone: formData.phone || "",
            position: "",
            password: "",
            contact: "", fax: "", image: "",
            userType: formData.userType,
            isActive: formData.isActive
        };

        try {
            await userApi.update(editingId, payload);
            showToast("Đã cập nhật thông tin thành công!", 'success');
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            console.error("Lỗi Save:", err);
            showToast(err.response?.data?.message || "Lỗi khi lưu cập nhật", "danger");
        }
    };

    const handleBan = async (user) => {
        if (!window.confirm(`Bạn có chắc muốn CẤM tài khoản @${user.username || user.userName}?`)) return;

        const payload = {
            ...user, // Kế thừa các trường bắt buộc khác nếu có
            id: user.id,
            userName: user.username || user.userName || "",
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            userType: user.userType,
            isActive: false
        };

        try {
            await userApi.update(user.id, payload);
            showToast(`Đã cấm tài khoản!`, 'success');
            fetchUsers();
        } catch (err) {
            showToast("Lỗi khi cấm tài khoản", "danger");
        }
    };

    const handleUnban = async (user) => {
        if (!window.confirm(`Bạn có muốn BỎ CẤM tài khoản @${user.username || user.userName}?`)) return;

        const payload = {
            ...user,
            id: user.id,
            userName: user.username || user.userName || "",
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            userType: user.userType,
            isActive: true
        };

        try {
            await userApi.update(user.id, payload);
            showToast(`Đã bỏ cấm tài khoản!`, 'success');
            fetchUsers();
        } catch (err) {
            showToast("Lỗi khi mở khóa", "danger");
        }
    };

    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

    const getTierBadge = (tier) => {
        switch (tier) {
            case 'Kim Cương': return <span className="badge" style={{ background: '#c084fc', color: '#fff' }}>💎 Kim Cương</span>;
            case 'Vàng': return <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#fff' }}>🥇 Vàng</span>;
            case 'Bạc': return <span className="badge" style={{ background: '#94a3b8', color: '#fff' }}>🥈 Bạc</span>;
            default: return <span className="badge" style={{ background: '#b45309', color: '#fff' }}>🥉 Đồng</span>;
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header" style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>👥 Quản lý Tài khoản</h2>
                </div>

                {/* BỘ LỌC ĐÃ ĐƯỢC ÉP NẰM TRÊN 1 HÀNG NGANG */}
                <div className="card" style={{
                    marginBottom: '24px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    width: '100%'
                }}>
                    {/* Thanh tìm kiếm (Co giãn) */}
                    <div className="search-box" style={{ flex: 1, margin: 0 }}>
                        <i className="fa fa-search"></i>
                        <input
                            className="input-search"
                            style={{ margin: 0 }}
                            placeholder="Tìm tên, SĐT, Email, Username..."
                            value={params.keyword}
                            onChange={e => setParams({ ...params, keyword: e.target.value, page: 1 })}
                        />
                    </div>

                    {/* Bộ lọc 1 (Cố định width) */}
                    <select
                        className="select-filter"
                        style={{ width: '220px', flexShrink: 0, margin: 0 }}
                        value={params.userType}
                        onChange={e => setParams({ ...params, userType: e.target.value, page: 1 })}
                    >
                        <option value="">-- Mọi phân quyền --</option>
                        <option value="1">Quản trị viên (Admin)</option>
                        <option value="2">Nhà cung cấp (Supplier)</option>
                        <option value="0">Khách hàng (User)</option>
                    </select>

                    {/* Bộ lọc 2 (Cố định width) */}
                    <select
                        className="select-filter"
                        style={{ width: '220px', flexShrink: 0, margin: 0 }}
                        value={params.isActive}
                        onChange={e => setParams({ ...params, isActive: e.target.value, page: 1 })}
                    >
                        <option value="">-- Trạng thái --</option>
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Bị cấm</option>
                    </select>
                </div>

                <div className="table-responsive card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Khách hàng</th>
                                <th>Liên hệ</th>
                                <th style={{ textAlign: 'center' }}>Phân quyền</th>
                                <th>Tổng chi tiêu / Hạng</th>
                                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: '200px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((u) => (
                                    <tr
                                        key={u.id}
                                        style={{
                                            opacity: u.isActive ? 1 : 0.65,
                                            backgroundColor: u.isActive ? 'transparent' : '#f9fafb',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = u.isActive ? 'transparent' : '#f9fafb'}
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <div className="cust-name" style={{ color: u.isActive ? '#4f46e5' : '#6b7280', fontSize: '15px', fontWeight: '700' }}>
                                                @{u.username || u.userName}
                                            </div>
                                            <div className="cust-phone" style={{ color: '#4b5563', marginTop: '4px' }}>{u.name}</div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div className="item-line"><i className="fa fa-phone" style={{ width: '15px', color: '#9ca3af' }}></i> {u.phone || '—'}</div>
                                            <div className="item-line"><i className="fa fa-envelope" style={{ width: '15px', color: '#9ca3af' }}></i> {u.email || '—'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '16px' }}>
                                            {u.userType === 1 ? <span className="badge badge-danger">🛡 Admin</span> :
                                                u.userType === 2 ? <span className="badge badge-shipping">🏢 Supplier</span> :
                                                    <span className="badge badge-delivered">👤 User</span>}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div className="price-text" style={{ color: u.isActive ? '#dc2626' : '#9ca3af', fontWeight: '800' }}>
                                                {fmt(u.totalSpent || 0)}
                                            </div>
                                            <div style={{ marginTop: '6px' }}>{getTierBadge(u.tier || 'Đồng')}</div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '16px' }}>
                                            {u.isActive ? <span className="badge badge-delivered">Hoạt động</span> : <span className="badge badge-cancelled">🚫 Bị cấm</span>}
                                        </td>
                                        <td className="action-btns" style={{ textAlign: 'center', padding: '16px' }}>
                                            <div className="btn-group" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>

                                                {/* NÚT SỬA ĐÃ ĐƯỢC LÀM XÁM */}
                                                <button
                                                    onClick={() => handleEdit(u)}
                                                    className="btn btn-sm"
                                                    style={{
                                                        backgroundColor: '#f3f4f6',
                                                        color: '#4b5563',
                                                        border: '1px solid #e5e7eb',
                                                        display: 'flex', alignItems: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <i className="fa fa-pen"></i> Sửa
                                                </button>

                                                {/* NÚT CẤM / BỎ CẤM */}
                                                <button
                                                    onClick={() => u.isActive ? handleBan(u) : handleUnban(u)}
                                                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                                                    style={{
                                                        backgroundColor: u.isActive ? '#fee2e2' : '#d1fae5',
                                                        color: u.isActive ? '#dc2626' : '#059669',
                                                        border: 'none',
                                                        display: 'flex', alignItems: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <i className={`fa ${u.isActive ? 'fa-ban' : 'fa-unlock'}`}></i> {u.isActive ? 'Cấm' : 'Bỏ cấm'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <div className="empty-content">
                                            <i className="fa fa-users-slash"></i>
                                            <p>Không tìm thấy tài khoản nào.</p>
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
                                <button
                                    key={i}
                                    className={`btn-page ${params.page === i + 1 ? 'active' : ''}`}
                                    onClick={() => setParams({ ...params, page: i + 1 })}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL SỬA THÔNG TIN KHÁCH HÀNG */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '700' }}>✏️ Sửa Thông Tin Tài Khoản</h3>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Tên đăng nhập</label>
                                    <input
                                        className="input-search"
                                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280', paddingLeft: '16px', margin: 0 }}
                                        value={formData.username}
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Họ và tên <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        className="input-search"
                                        style={{ paddingLeft: '16px', margin: 0 }}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Số điện thoại</label>
                                    <input
                                        className="input-search"
                                        style={{ paddingLeft: '16px', margin: 0 }}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Email</label>
                                    <input
                                        className="input-search"
                                        type="email"
                                        style={{ paddingLeft: '16px', margin: 0 }}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn btn-edit" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                                <button type="submit" className="btn btn-primary">Lưu thông tin</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;