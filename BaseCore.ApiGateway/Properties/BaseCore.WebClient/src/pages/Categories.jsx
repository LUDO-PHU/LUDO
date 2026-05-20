import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { categoryApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';

const Categories = () => {
    const context = useOutletContext();
    const { showToast } = useToast();

    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);

    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        keyword: '',
        sortBy: 'newest'
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchCategories = async () => {
        try {
            const queryParams = {
                page: params.page,
                pageSize: params.pageSize,
                sortBy: params.sortBy
            };
            if (params.keyword) queryParams.keyword = params.keyword;

            const res = await api.get('/categories/search', { params: queryParams });

            setCategories(res.data?.items || []);
            setTotal(res.data?.totalCount || 0);
        } catch (err) {
            console.error("Lỗi tải danh mục:", err);
            showToast("Lỗi kết nối máy chủ khi tải danh mục", "danger");
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 300);
        return () => clearTimeout(timer);
    }, [params]);

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({ name: '', description: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setFormData({ name: cat.name, description: cat.description || '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, productCount) => {
        if (productCount > 0) {
            showToast(`Không thể xóa! Danh mục này đang chứa ${productCount} sản phẩm. Vui lòng xóa sản phẩm trước.`, 'warning');
            return;
        }

        if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.")) return;

        try {
            await categoryApi.delete(id);
            showToast("Đã xóa danh mục thành công", 'success');
            fetchCategories();
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi hệ thống khi xóa danh mục", "danger");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return showToast("Tên danh mục không được trống!", 'warning');

        try {
            if (editingId) {
                await categoryApi.update(editingId, formData);
                showToast("Cập nhật danh mục thành công!", 'success');
            } else {
                await categoryApi.create(formData);
                showToast("Đã thêm danh mục mới!", 'success');
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi khi lưu danh mục", "danger");
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">

                <div className="admin-header" style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>📂 Quản lý Danh mục</h2>
                </div>

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
                    <div className="search-box" style={{ flex: 1, margin: 0 }}>
                        <i className="fa fa-search"></i>
                        <input
                            className="input-search"
                            style={{ margin: 0 }}
                            placeholder="Nhập tên hoặc mô tả danh mục cần tìm..."
                            value={params.keyword}
                            onChange={e => setParams({ ...params, keyword: e.target.value, page: 1 })}
                        />
                    </div>

                    <select
                        className="select-filter"
                        style={{ width: '220px', flexShrink: 0, margin: 0 }}
                        value={params.sortBy}
                        onChange={e => setParams({ ...params, sortBy: e.target.value, page: 1 })}
                    >
                        <option value="newest">🔥 Mới cập nhật nhất</option>
                        <option value="oldest">⏳ Cũ nhất</option>
                        <option value="name_asc">A ➔ Z (Theo tên)</option>
                        <option value="name_desc">Z ➔ A (Theo tên)</option>
                        <option value="count_desc">📦 Nhiều sản phẩm nhất</option>
                    </select>

                    <button
                        onClick={handleAddNew}
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0, margin: 0, height: '44px' }}
                    >
                        <i className="fa fa-plus"></i> Thêm Danh Mục
                    </button>
                </div>

                <div className="table-responsive card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
                                <th>Tên Danh Mục / Nhà SX</th>
                                <th>Mô tả chi tiết</th>
                                <th style={{ textAlign: 'center' }}>Số lượng SP</th>
                                <th style={{ textAlign: 'center', width: '180px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length > 0 ? (
                                categories.map((cat) => (
                                    <tr key={cat.id}>
                                        <td style={{ textAlign: 'center', color: '#6b7280', fontWeight: 'bold' }}>#{cat.id}</td>
                                        <td>
                                            <div className="cust-name">
                                                {cat.name}
                                            </div>
                                        </td>
                                        <td style={{ color: '#4b5563', fontSize: '14px' }}>
                                            {cat.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có mô tả</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {cat.productCount > 0 ? (
                                                <span className="badge badge-shipping">
                                                    {cat.productCount} món
                                                </span>
                                            ) : (
                                                <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                                    Trống
                                                </span>
                                            )}
                                        </td>
                                        <td className="action-btns" style={{ textAlign: 'center' }}>
                                            <div className="btn-group">
                                                {/* NÚT SỬA ĐÃ ĐƯỢC CHUYỂN SANG MÀU XÁM */}
                                                <button
                                                    onClick={() => handleEdit(cat)}
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

                                                <button
                                                    onClick={() => handleDelete(cat.id, cat.productCount)}
                                                    className="btn btn-sm btn-danger"
                                                    disabled={cat.productCount > 0}
                                                    style={{ opacity: cat.productCount > 0 ? 0.5 : 1, cursor: cat.productCount > 0 ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <i className="fa fa-trash"></i> Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-state">
                                        <div className="empty-content">
                                            <i className="fa fa-folder-open"></i>
                                            <p>Không tìm thấy danh mục nào.</p>
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

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '700' }}>
                                {editingId ? "✏️ Sửa Danh Mục" : "✨ Thêm Danh Mục Mới"}
                            </h3>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Tên danh mục <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input
                                    className="input-search"
                                    style={{ paddingLeft: '16px' }}
                                    placeholder="VD: Màn hình, Samsung, Pin..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Mô tả chi tiết
                                </label>
                                <textarea
                                    className="input-search"
                                    style={{ paddingLeft: '16px', height: '100px', resize: 'vertical' }}
                                    placeholder="Nhập ghi chú hoặc mô tả về danh mục này..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn btn-edit" onClick={() => setIsModalOpen(false)}>
                                    Hủy bỏ
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? "Lưu thay đổi" : "Tạo danh mục"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;