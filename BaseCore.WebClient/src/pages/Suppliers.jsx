import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, productApi, receiptApi, supplierApi, supplierRequestApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getImageUrl } from '../data/fallbackCatalog';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { RECEIPT_STATUS, REQUEST_STATUS, activeLabel, formatVnd, getMainImage } from '../utils/display';
import '../styles/admin.css';

const getCategoryName = (supplier) => supplier.categoryNameVi || supplier.categoryName || 'Chưa phân loại';

const StatusBadge = ({ isActive }) => (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
        <span className={`status-dot ${isActive ? 'dot-active' : 'dot-inactive'}`} />
        {activeLabel(Boolean(isActive))}
    </span>
);

const ReceiptStatusBadge = ({ status }) => {
    const item = RECEIPT_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const RequestStatusBadge = ({ status }) => {
    const item = REQUEST_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const SupplierDetailModal = ({ supplier, onClose, onToggle }) => {
    const [products, setProducts] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tab, setTab] = useState('info');
    const [loadingTab, setLoadingTab] = useState(false);

    useEffect(() => {
        if (!supplier || tab === 'info') return;
        const loadTab = async () => {
            setLoadingTab(true);
            try {
                if (tab === 'products') {
                    const res = await productApi.search({ supplierId: supplier.id, pageSize: 10 });
                    setProducts(unwrapPagedData(res).items);
                }
                if (tab === 'receipts') {
                    const res = await receiptApi.searchAdmin({ supplierId: supplier.id, pageSize: 10 });
                    setReceipts(unwrapPagedData(res).items);
                }
                if (tab === 'requests') {
                    const res = await supplierRequestApi.searchAdmin({ supplierId: supplier.id, pageSize: 10 });
                    setRequests(unwrapPagedData(res).items);
                }
            } finally {
                setLoadingTab(false);
            }
        };
        loadTab();
    }, [tab, supplier]);

    if (!supplier) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết nhà cung cấp</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="tab-bar">
                        {[
                            ['info', 'Thông tin'],
                            ['products', 'Sản phẩm'],
                            ['receipts', 'Biên lai'],
                            ['requests', 'Yêu cầu'],
                        ].map(([value, label]) => (
                            <button key={value} className={`tab-btn ${tab === value ? 'active' : ''}`} onClick={() => setTab(value)}>{label}</button>
                        ))}
                    </div>

                    {tab === 'info' && (
                        <div className="detail-grid">
                            <div className="detail-row"><span className="detail-label">Tên công ty</span><span className="detail-value primary">{supplier.companyName}</span></div>
                            <div className="detail-row"><span className="detail-label">Tài khoản nhà cung cấp</span><span className="detail-value">@{supplier.username || 'Chưa có'}</span></div>
                            <div className="detail-row"><span className="detail-label">Người liên hệ</span><span className="detail-value">{supplier.contactName || 'Chưa có'}</span></div>
                            <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{supplier.email || 'Chưa có'}</span></div>
                            <div className="detail-row"><span className="detail-label">Số điện thoại</span><span className="detail-value">{supplier.phone || 'Chưa có'}</span></div>
                            <div className="detail-row"><span className="detail-label">Danh mục phụ trách</span><span className="detail-value">{getCategoryName(supplier)}</span></div>
                            <div className="detail-row"><span className="detail-label">Số sản phẩm đang cung cấp</span><span className="detail-value">{supplier.productCount ?? products.length ?? 'Chưa thống kê'}</span></div>
                            <div className="detail-row"><span className="detail-label">Trạng thái hoạt động</span><StatusBadge isActive={supplier.isActive} /></div>
                            <div className="detail-row"><span className="detail-label">Ngày tạo</span><span className="detail-value">{formatAppDateTime(supplier.createdAt)}</span></div>
                            <div className="detail-row" style={{ gridColumn: '1 / -1' }}><span className="detail-label">Địa chỉ</span><span className="detail-value">{supplier.address || 'Chưa có địa chỉ'}</span></div>
                        </div>
                    )}

                    {tab === 'products' && (
                        loadingTab ? <div style={{ textAlign: 'center', padding: 40 }}><i className="fa fa-spinner fa-spin fa-2x" /></div> :
                            <table className="admin-table admin-table-compact">
                                <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th style={{ textAlign: 'right' }}>Giá bán</th><th style={{ textAlign: 'center' }}>Tồn kho</th><th>Trạng thái</th></tr></thead>
                                <tbody>
                                    {products.length > 0 ? products.map(product => {
                                        const imageUrl = getMainImage(product);
                                        return (
                                            <tr key={product.id}>
                                                <td>
                                                    <div className="record-summary">
                                                        {imageUrl && <img src={getImageUrl(imageUrl)} alt="" className="record-thumb record-thumb-sm" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                                                        <span className="cust-name one-line">{product.nameVi || product.name}</span>
                                                    </div>
                                                </td>
                                                <td><span className="one-line">{product.categoryNameVi || 'Chưa phân loại'}</span></td>
                                                <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(product.price)}</td>
                                                <td style={{ textAlign: 'center' }}><span className="qty">{product.stock}</span></td>
                                                <td>{product.isActive === false ? 'Ngừng hoạt động' : 'Đang bán'}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan="5" className="empty-state">Chưa có sản phẩm</td></tr>
                                    )}
                                </tbody>
                            </table>
                    )}

                    {tab === 'receipts' && (
                        loadingTab ? <div style={{ textAlign: 'center', padding: 40 }}><i className="fa fa-spinner fa-spin fa-2x" /></div> :
                            <table className="admin-table admin-table-compact">
                                <thead><tr><th>Mã biên lai</th><th>Sản phẩm</th><th style={{ textAlign: 'center' }}>Số lượng</th><th style={{ textAlign: 'right' }}>Giá nhập</th><th>Trạng thái</th></tr></thead>
                                <tbody>
                                    {receipts.length > 0 ? receipts.map(receipt => (
                                        <tr key={receipt.id}>
                                            <td className="id-column">{receipt.receiptCode || `#${receipt.id}`}</td>
                                            <td><span className="cust-name one-line">{receipt.productName || `Sản phẩm #${receipt.productId}`}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="qty">{receipt.quantity}</span></td>
                                            <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(receipt.unitImportPrice || receipt.importPrice)}</td>
                                            <td><ReceiptStatusBadge status={receipt.status} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="empty-state">Chưa có biên lai</td></tr>
                                    )}
                                </tbody>
                            </table>
                    )}

                    {tab === 'requests' && (
                        loadingTab ? <div style={{ textAlign: 'center', padding: 40 }}><i className="fa fa-spinner fa-spin fa-2x" /></div> :
                            <table className="admin-table admin-table-compact">
                                <thead><tr><th>Yêu cầu</th><th>Danh mục</th><th style={{ textAlign: 'center' }}>Số lượng</th><th style={{ textAlign: 'right' }}>Giá đề xuất</th><th>Trạng thái</th></tr></thead>
                                <tbody>
                                    {requests.length > 0 ? requests.map(request => (
                                        <tr key={request.id}>
                                            <td><span className="cust-name one-line">{request.productName || request.requestedProductName || `Yêu cầu #${request.id}`}</span></td>
                                            <td><span className="one-line">{request.categoryName || 'Chưa phân loại'}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="qty">{request.quantity}</span></td>
                                            <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(request.suggestedPrice)}</td>
                                            <td><RequestStatusBadge status={request.status} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="5" className="empty-state">Chưa có yêu cầu liên quan</td></tr>
                                    )}
                                </tbody>
                            </table>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    <button className={`btn ${supplier.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => { onToggle(supplier); onClose(); }}>
                        <i className={`fa ${supplier.isActive ? 'fa-ban' : 'fa-unlock'}`} />
                        {supplier.isActive ? 'Ngừng hoạt động' : 'Mở hoạt động'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Suppliers = () => {
    const { showToast } = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', isActive: '', categoryId: '' });

    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const q = { page: params.page, pageSize: params.pageSize };
            if (params.keyword) q.keyword = params.keyword;
            if (params.isActive !== '') q.isActive = params.isActive;
            if (params.categoryId) q.categoryId = params.categoryId;
            const res = await supplierApi.getAll(q);
            const paged = unwrapPagedData(res);
            setSuppliers(paged.items);
            setTotal(paged.totalCount);
        } catch {
            showToast('Lỗi tải danh sách nhà cung cấp', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, showToast]);

    useEffect(() => {
        const timeoutId = window.setTimeout(loadSuppliers, 300);
        return () => window.clearTimeout(timeoutId);
    }, [loadSuppliers]);

    useEffect(() => {
        categoryApi.getAll()
            .then(res => setCategories(unwrapApiData(res, [])))
            .catch(() => setCategories([]));
    }, []);

    const openDetail = async (supplier) => {
        try {
            const res = await supplierApi.getById(supplier.id);
            setSelected(unwrapApiData(res, supplier));
        } catch {
            setSelected(supplier);
        }
    };

    const handleToggle = async (supplier) => {
        try {
            await supplierApi.toggleActive(supplier.id);
            showToast('Cập nhật trạng thái nhà cung cấp thành công', 'success');
            loadSuppliers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể cập nhật trạng thái', 'danger');
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Quản lý nhà cung cấp</h2>
                    <p>Tổng cộng <strong>{total}</strong> nhà cung cấp</p>
                </div>

                <div className="filter-bar">
                    <div className="search-box" style={{ flex: 2 }}>
                        <i className="fa fa-search" />
                        <input type="text" className="input-search" placeholder="Tìm tên công ty, người liên hệ, email..." value={params.keyword} onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))} />
                    </div>
                    <select className="select-filter" value={params.categoryId} onChange={event => setParams(prev => ({ ...prev, categoryId: event.target.value, page: 1 }))}>
                        <option value="">Tất cả danh mục</option>
                        {categories.map(category => <option key={category.id} value={category.id}>{category.nameVi}</option>)}
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
                                <th>Tên công ty</th>
                                <th>Danh mục phụ trách</th>
                                <th>Email / tài khoản</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: 230 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                            ) : suppliers.length > 0 ? suppliers.map(supplier => (
                                <tr key={supplier.id} className="clickable" onClick={() => openDetail(supplier)}>
                                    <td>
                                        <div className="record-summary">
                                            <div className="avatar" style={{ background: supplier.isActive ? 'linear-gradient(135deg,#f59e0b,#22D3EE)' : '#64748b' }}>
                                                <i className="fa fa-building" />
                                            </div>
                                            <div className="record-copy">
                                                <span className="cust-name one-line">{supplier.companyName}</span>
                                                <span className="cust-phone one-line">{supplier.contactName || 'Chưa có người liên hệ'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="one-line">{getCategoryName(supplier)}</span></td>
                                    <td>
                                        <span className="one-line">{supplier.email || 'Chưa có email'}</span>
                                        <span className="cust-phone one-line">@{supplier.username || 'chưa có tài khoản'}</span>
                                    </td>
                                    <td><StatusBadge isActive={supplier.isActive} /></td>
                                    <td className="action-btns" onClick={event => event.stopPropagation()}>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => openDetail(supplier)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                            <button className={`btn btn-sm ${supplier.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggle(supplier)}>
                                                <i className={`fa ${supplier.isActive ? 'fa-ban' : 'fa-unlock'}`} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="empty-state"><div className="empty-content"><i className="fa fa-building" /><p>Không tìm thấy nhà cung cấp nào</p></div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="pagination-wrapper">
                        <div className="pagination">
                            <button className="btn-page" disabled={params.page === 1} onClick={() => setParams(prev => ({ ...prev, page: prev.page - 1 }))}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => {
                                const w = 2;
                                return p === 1 || p === totalPages || (p >= params.page - w && p <= params.page + w);
                            }).reduce((acc, p) => {
                                if (acc.length > 0 && p - acc[acc.length - 1] > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, []).map((p, idx) =>
                                p === '...'
                                    ? <span key={`ellipsis-${idx}`} className="btn-page btn-page-ellipsis">…</span>
                                    : <button key={p} className={`btn-page ${params.page === p ? 'active' : ''}`} onClick={() => setParams(prev => ({ ...prev, page: p }))}>{p}</button>
                            )}
                            <button className="btn-page" disabled={params.page === totalPages} onClick={() => setParams(prev => ({ ...prev, page: prev.page + 1 }))}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {selected && <SupplierDetailModal supplier={selected} onClose={() => setSelected(null)} onToggle={handleToggle} />}
        </div>
    );
};

export default Suppliers;
