import React, { useState, useEffect } from 'react';
import { categoryApi, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import '../styles/admin.css';

const Categories = () => {
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
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nameVi: '', nameEn: '', description: '', isActive: true });

    const getCategoryName = (cat) => cat.nameVi || cat.NameVi || cat.name || '';
    const getProductCount = (cat) => Number(cat.productCount ?? cat.ProductCount ?? 0);

    const fetchCategories = async () => {
        try {
            const queryParams = {
                page: params.page,
                pageSize: params.pageSize,
                sortBy: params.sortBy
            };
            if (params.keyword) queryParams.keyword = params.keyword;

            const res = await categoryApi.search(queryParams);
            const paged = unwrapPagedData(res);

            setCategories(paged.items);
            setTotal(paged.totalCount);
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
        setFormData({ nameVi: '', nameEn: '', description: '', isActive: true });
        setIsModalOpen(true);
    };

    const handleEdit = (cat) => {
        setEditingId(cat.id);
        setFormData({
            nameVi: cat.nameVi || cat.NameVi || cat.name || '',
            nameEn: cat.nameVi || cat.NameVi || cat.name || '',
            description: cat.description || cat.Description || '',
            isActive: cat.isActive ?? cat.IsActive ?? true
        });
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
        const nameVi = formData.nameVi.trim();
        const nameEn = nameVi;
        if (!nameVi) return showToast("Tên danh mục không được trống!", 'warning');

        const payload = {
            nameVi,
            nameEn,
            description: formData.description?.trim() || '',
            isActive: formData.isActive ?? true
        };

        try {
            if (editingId) {
                await categoryApi.update(editingId, payload);
                showToast("Cập nhật danh mục thành công!", 'success');
            } else {
                await categoryApi.create(payload);
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
                    <h2 style={{ margin: 0 }}>Quản lý danh mục</h2>
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
                        <option value="nameAsc">A ➔ Z (Theo tên)</option>
                        <option value="nameDesc">Z ➔ A (Theo tên)</option>
                    </select>

                    <button
                        onClick={handleAddNew}
                        className="btn btn-primary"
                        style={{ whiteSpace: 'normal', flexShrink: 0, margin: 0, minHeight: '44px' }}
                    >
                        <i className="fa fa-plus"></i> Thêm danh mục
                    </button>
                </div>

                <div className="table-responsive card">
                    <table className="admin-table admin-table-compact">
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>Mã danh mục</th>
                                <th>Tên danh mục</th>
                                <th style={{ textAlign: 'center' }}>Số sản phẩm</th>
                                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: '180px' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length > 0 ? (
                                categories.map((cat) => (
                                    <tr key={cat.id} className="clickable" onClick={() => setSelectedCategory(cat)}>
                                        <td className="id-column">#{cat.id}</td>
                                        <td>
                                            <div className="cust-name one-line">
                                                {getCategoryName(cat)}
                                            </div>
                                            <div className="cust-phone one-line">{cat.description || cat.Description || 'Chưa có mô tả'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {getProductCount(cat) > 0 ? (
                                                <span className="badge category-count-badge">
                                                    {getProductCount(cat)} món
                                                </span>
                                            ) : (
                                                <span className="badge category-count-badge category-count-badge-empty">
                                                    Trống
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {(cat.isActive ?? cat.IsActive ?? true)
                                                ? <span className="badge badge-active">Đang hoạt động</span>
                                                : <span className="badge badge-inactive">Ngừng hoạt động</span>}
                                        </td>
                                        <td className="action-btns" style={{ textAlign: 'center' }} onClick={event => event.stopPropagation()}>
                                            <div className="btn-group">
                                                <button
                                                    onClick={() => setSelectedCategory(cat)}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    <i className="fa fa-eye"></i> Xem chi tiết
                                                </button>
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
                                                    onClick={() => handleDelete(cat.id, getProductCount(cat))}
                                                    className="btn btn-sm btn-danger"
                                                    disabled={getProductCount(cat) > 0}
                                                    style={{ opacity: getProductCount(cat) > 0 ? 0.5 : 1, cursor: getProductCount(cat) > 0 ? 'not-allowed' : 'pointer' }}
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

            {selectedCategory && (
                <div className="modal-backdrop" onClick={() => setSelectedCategory(null)}>
                    <div className="modal-box" onClick={event => event.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Chi tiết danh mục</h3>
                            <button className="modal-close" onClick={() => setSelectedCategory(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-row"><span className="detail-label">Mã danh mục</span><span className="detail-value primary">#{selectedCategory.id}</span></div>
                                <div className="detail-row"><span className="detail-label">Tên danh mục</span><span className="detail-value">{getCategoryName(selectedCategory)}</span></div>
                                <div className="detail-row"><span className="detail-label">Số sản phẩm</span><span className="detail-value">{getProductCount(selectedCategory)}</span></div>
                                <div className="detail-row"><span className="detail-label">Trạng thái</span><span className={`badge ${(selectedCategory.isActive ?? selectedCategory.IsActive ?? true) ? 'badge-active' : 'badge-inactive'}`}>{(selectedCategory.isActive ?? selectedCategory.IsActive ?? true) ? 'Đang hoạt động' : 'Ngừng hoạt động'}</span></div>
                            </div>
                            <div className="detail-section">
                                <div className="section-title">Mô tả</div>
                                <div className="detail-paragraph">{selectedCategory.description || selectedCategory.Description || 'Không có mô tả'}</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setSelectedCategory(null)}>Đóng</button>
                            <button type="button" className="btn btn-edit" onClick={() => { const cat = selectedCategory; setSelectedCategory(null); handleEdit(cat); }}>Chỉnh sửa</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '700' }}>
                                {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
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
                                    value={formData.nameVi}
                                    onChange={e => setFormData({ ...formData, nameVi: e.target.value, nameEn: e.target.value })}
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
