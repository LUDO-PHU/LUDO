import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { productApi, categoryApi, supplierApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../data/fallbackCatalog';
import {
    PRODUCT_STATUS,
    finalPrice,
    formatVnd,
    getMainImage,
    getProductImages,
} from '../utils/display';
import { formatAppDate } from '../utils/dateTime';
import '../styles/admin.css';

const emptyForm = (supplierId = '') => ({
    id: null,
    nameVi: '',
    nameEn: '',
    descriptionVi: '',
    descriptionEn: '',
    specifications: '',
    price: 0,
    importPrice: 0,
    discountPercent: 0,
    imageUrl: '',
    imageUrlsText: '',
    categoryId: '',
    brand: 'EconentTech',
    color: 'Mặc định',
    condition: 'Mới',
    status: 'Active',
    stock: 0,
    supplierId,
});

const splitImageUrls = (value = '') =>
    value
        .split(/[\n,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .filter((item, index, array) => array.findIndex(other => other.toLowerCase() === item.toLowerCase()) === index);

const ImageThumb = ({ product, size = 46 }) => {
    const imageUrl = getMainImage(product);
    return imageUrl ? (
        <img
            src={getImageUrl(imageUrl)}
            alt={product?.nameVi || product?.nameEn || 'Sản phẩm'}
            style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(34, 211, 238, 0.25)', flex: `0 0 ${size}px` }}
            onError={event => { event.currentTarget.style.display = 'none'; }}
        />
    ) : (
        <span style={{ width: size, height: size, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(148, 163, 184, 0.14)', color: '#94a3b8', flex: `0 0 ${size}px` }}>
            <i className="fa fa-image" />
        </span>
    );
};

const ImageGallery = ({ product }) => {
    const images = getProductImages(product);
    if (images.length === 0) {
        return <div className="detail-muted">Chưa có ảnh sản phẩm</div>;
    }

    return (
        <div className="product-detail-gallery">
            <img
                className="product-detail-main-image"
                src={getImageUrl(images[0])}
                alt={product.nameVi || product.nameEn || 'Sản phẩm'}
                onError={event => { event.currentTarget.style.display = 'none'; }}
            />
            {images.length > 1 && (
                <div className="product-detail-thumb-row">
                    {images.slice(1).map((url, index) => (
                        <img
                            key={`${url}-${index}`}
                            src={getImageUrl(url)}
                            alt={`${product.nameVi || product.nameEn || 'Sản phẩm'} ${index + 2}`}
                            onError={event => { event.currentTarget.style.display = 'none'; }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductDetailModal = ({ product, isAdmin, isSupplier, onClose, onEdit, onDelete }) => {
    if (!product) return null;
    const status = PRODUCT_STATUS[product.status] || { label: product.status || 'Chưa xác định', badge: 'badge-pending' };
    const profit = Number(product.price || 0) - Number(product.importPrice || 0);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết sản phẩm</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-layout product-detail-layout">
                        <div className="product-detail-media">
                            <ImageGallery product={product} />
                        </div>
                        <div className="detail-grid product-detail-info-grid">
                            <div className="detail-row product-title-row"><span className="detail-label">Tên sản phẩm</span><span className="detail-value primary">{product.nameVi || product.nameEn}</span></div>
                            <div className="detail-row"><span className="detail-label">Danh mục</span><span className="detail-value">{product.categoryNameVi || product.categoryNameEn || 'Chưa phân loại'}</span></div>
                            <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{product.supplierName || (product.supplierId ? `#${product.supplierId}` : 'Hệ thống')}</span></div>
                            <div className="detail-row"><span className="detail-label">Giá bán</span><span className="detail-value large danger">{formatVnd(finalPrice(product))}</span></div>
                            <div className="detail-row"><span className="detail-label">Giá nhập</span><span className="detail-value">{formatVnd(product.importPrice)}</span></div>
                            <div className="detail-row"><span className="detail-label">Lợi nhuận dự kiến</span><span className="detail-value success">{formatVnd(profit)}</span></div>
                            <div className="detail-row"><span className="detail-label">Tồn kho</span><span className="detail-value">{product.stock}</span></div>
                            <div className="detail-row"><span className="detail-label">Thương hiệu</span><span className="detail-value">{product.brand || 'Chưa cập nhật'}</span></div>
                            <div className="detail-row"><span className="detail-label">Màu sắc</span><span className="detail-value">{product.color || 'Chưa cập nhật'}</span></div>
                            <div className="detail-row"><span className="detail-label">Tình trạng</span><span className="detail-value">{product.condition || 'Chưa cập nhật'}</span></div>
                            <div className="detail-row"><span className="detail-label">Giảm giá</span><span className="detail-value">{product.discountPercent || 0}%</span></div>
                            <div className="detail-row"><span className="detail-label">Điểm thưởng</span><span className="detail-value">Chưa cấu hình</span></div>
                            <div className="detail-row"><span className="detail-label">Trạng thái</span><span className={`badge ${status.badge}`}>{status.label}</span></div>
                            <div className="detail-row"><span className="detail-label">Ngày nhập</span><span className="detail-value">{formatAppDate(product.createdAt)}</span></div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Mô tả</div>
                        <p className="detail-paragraph">{product.descriptionVi || product.descriptionEn || 'Chưa có mô tả'}</p>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Thông số kỹ thuật</div>
                        <p className="detail-paragraph">{product.specifications || 'Chưa cập nhật thông số'}</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    {(isAdmin || isSupplier) && (
                        <button className="btn btn-edit" onClick={() => onEdit(product)}>
                            <i className="fa fa-pen" /> Chỉnh sửa
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-danger" onClick={() => onDelete(product.id)}>
                            <i className="fa fa-trash" /> Xóa
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProductFormModal = ({
    form,
    setForm,
    imageFiles,
    setImageFiles,
    categories,
    suppliers,
    isAdmin,
    isSupplier,
    isEdit,
    onClose,
    onSubmit,
}) => {
    const previewUrls = splitImageUrls(form.imageUrlsText);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>{isEdit ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="modal-body">
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Tên sản phẩm *</label>
                                <input className="form-control" required value={form.nameVi} onChange={event => setForm(prev => ({ ...prev, nameVi: event.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tên tiếng Anh</label>
                                <input className="form-control" value={form.nameEn} onChange={event => setForm(prev => ({ ...prev, nameEn: event.target.value }))} />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Danh mục *</label>
                                <select className="form-control" required value={form.categoryId} disabled={isSupplier} onChange={event => setForm(prev => ({ ...prev, categoryId: event.target.value }))}>
                                    <option value="">Chọn danh mục</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.nameVi || category.nameEn || category.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select className="form-control" value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}>
                                    {Object.entries(PRODUCT_STATUS).map(([value, item]) => (
                                        <option key={value} value={value}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid-3">
                            <div className="form-group">
                                <label className="form-label">Giá bán *</label>
                                <input type="number" min={0} className="form-control" required value={form.price} onChange={event => setForm(prev => ({ ...prev, price: Number(event.target.value) }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giá nhập</label>
                                <input type="number" min={0} className="form-control" value={form.importPrice} onChange={event => setForm(prev => ({ ...prev, importPrice: Number(event.target.value) }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giảm giá (%)</label>
                                <input type="number" min={0} max={100} className="form-control" value={form.discountPercent} onChange={event => setForm(prev => ({ ...prev, discountPercent: Number(event.target.value) }))} />
                            </div>
                        </div>

                        <div className="form-grid-3">
                            <div className="form-group">
                                <label className="form-label">Thương hiệu</label>
                                <input className="form-control" value={form.brand} onChange={event => setForm(prev => ({ ...prev, brand: event.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Màu sắc</label>
                                <input className="form-control" value={form.color} onChange={event => setForm(prev => ({ ...prev, color: event.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tình trạng</label>
                                <input className="form-control" value={form.condition} onChange={event => setForm(prev => ({ ...prev, condition: event.target.value }))} />
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="form-group">
                                <label className="form-label">Nhà cung cấp</label>
                                <select className="form-control" value={form.supplierId || ''} onChange={event => setForm(prev => ({ ...prev, supplierId: event.target.value }))}>
                                    <option value="">Không gán</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.companyName} ({supplier.username || `#${supplier.id}`})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Danh sách ảnh hiện có / link ảnh</label>
                            <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Mỗi dòng một ảnh. Dòng đầu là ảnh chính."
                                value={form.imageUrlsText}
                                onChange={event => setForm(prev => ({ ...prev, imageUrlsText: event.target.value, imageUrl: splitImageUrls(event.target.value)[0] || '' }))}
                            />
                        </div>

                        {previewUrls.length > 0 && (
                            <div className="detail-image-grid form-image-preview">
                                {previewUrls.map((url, index) => (
                                    <img key={`${url}-${index}`} src={getImageUrl(url)} alt={`Ảnh ${index + 1}`} onError={event => { event.currentTarget.style.display = 'none'; }} />
                                ))}
                            </div>
                        )}

                        {isSupplier && (
                            <div className="form-group">
                                <label className="form-label">Tải thêm ảnh sản phẩm</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="form-control"
                                    onChange={event => setImageFiles(Array.from(event.target.files || []))}
                                />
                                {imageFiles.length > 0 && <div className="detail-muted">{imageFiles.length} ảnh mới sẽ được tải lên</div>}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Thông số kỹ thuật</label>
                            <textarea className="form-control" rows={3} value={form.specifications} onChange={event => setForm(prev => ({ ...prev, specifications: event.target.value }))} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-control" rows={4} value={form.descriptionVi} onChange={event => setForm(prev => ({ ...prev, descriptionVi: event.target.value }))} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tồn kho hiện tại</label>
                            <input type="number" className="form-control" value={form.stock || 0} readOnly />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary">
                            <i className="fa fa-save" /> {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Products = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const isAdmin = user?.userType === 1;
    const isSupplier = user?.userType === 2;

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [supplierProfile, setSupplierProfile] = useState(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [imageFiles, setImageFiles] = useState([]);
    const [form, setForm] = useState(() => emptyForm(user?.supplierId || ''));
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', categoryId: '', status: '' });

    const currentSupplierId = user?.supplierId || supplierProfile?.id || '';
    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadSupplierProfile = useCallback(async () => {
        if (!isSupplier || user?.supplierId) return;
        try {
            const res = await supplierApi.getMe();
            setSupplierProfile(unwrapApiData(res));
        } catch {
            setSupplierProfile(null);
        }
    }, [isSupplier, user?.supplierId]);

    useEffect(() => { loadSupplierProfile(); }, [loadSupplierProfile]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const query = {
                page: params.page,
                pageSize: params.pageSize,
                keyword: params.keyword || undefined,
                status: params.status || undefined,
            };

            if (isSupplier && !currentSupplierId) {
                setProducts([]);
                setTotal(0);
                return;
            }

            if (!isSupplier) {
                query.categoryId = params.categoryId ? Number(params.categoryId) : undefined;
            }

            const [productRes, categoryRes] = await Promise.all([
                isSupplier ? productApi.getMine(query) : productApi.search(query),
                categoryApi.getAll(),
            ]);

            const pagedProducts = unwrapPagedData(productRes);
            setProducts(pagedProducts.items);
            setTotal(pagedProducts.totalCount);
            setCategories(unwrapApiData(categoryRes, []));

            if (isAdmin) {
                const supplierRes = await supplierApi.getAll({ pageSize: 100 });
                setSuppliers(unwrapPagedData(supplierRes).items);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tải được danh sách sản phẩm', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, isSupplier, isAdmin, currentSupplierId, showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const openDetail = async (product) => {
        try {
            const res = await productApi.getById(product.id);
            setSelectedProduct(unwrapApiData(res, product));
        } catch {
            setSelectedProduct(product);
            showToast('Không tải được chi tiết sản phẩm mới nhất', 'danger');
        }
    };

    const openForm = (product = null) => {
        if (product) {
            const imageUrls = getProductImages(product);
            setForm({
                ...emptyForm(currentSupplierId),
                ...product,
                nameVi: product.nameVi || product.name || '',
                nameEn: product.nameEn || product.nameVi || product.name || '',
                categoryId: product.categoryId || '',
                status: product.status || 'Active',
                supplierId: product.supplierId || '',
                imageUrl: imageUrls[0] || product.imageUrl || '',
                imageUrlsText: imageUrls.join('\n'),
            });
            setIsEdit(true);
        } else {
            setForm({
                ...emptyForm(isSupplier ? currentSupplierId : ''),
                categoryId: isSupplier ? (supplierProfile?.categoryId || user?.supplierCategoryId || '') : '',
            });
            setIsEdit(false);
        }
        setImageFiles([]);
        setIsFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSupplier && !currentSupplierId) {
            showToast('Không xác định được nhà cung cấp hiện tại', 'danger');
            return;
        }

        const nameVi = (form.nameVi || form.name || '').trim();
        const nameEn = (form.nameEn || nameVi).trim();
        const imageUrls = splitImageUrls(form.imageUrlsText);
        const imageUrl = imageUrls[0] || form.imageUrl || '';

        const payload = {
            nameVi,
            nameEn,
            descriptionVi: form.descriptionVi || '',
            descriptionEn: form.descriptionEn || '',
            specifications: form.specifications || '',
            price: Number(form.price || 0),
            importPrice: Number(form.importPrice || 0),
            discountPercent: Number(form.discountPercent || 0),
            imageUrl,
            imageUrls,
            categoryId: Number(form.categoryId),
            brand: form.brand || 'EconentTech',
            color: form.color || 'Mặc định',
            condition: form.condition || 'Mới',
            status: form.status || 'Active',
            supplierId: isSupplier ? Number(currentSupplierId) : form.supplierId ? Number(form.supplierId) : null,
        };

        try {
            if (isSupplier) {
                const formData = new FormData();
                Object.entries({
                    nameVi: payload.nameVi,
                    nameEn: payload.nameEn,
                    descriptionVi: payload.descriptionVi,
                    descriptionEn: payload.descriptionEn,
                    specifications: payload.specifications,
                    price: payload.price,
                    importPrice: payload.importPrice,
                    discountPercent: payload.discountPercent,
                    imageUrl: payload.imageUrl,
                    imageUrls: payload.imageUrls.join('\n'),
                    brand: payload.brand,
                    color: payload.color,
                    condition: payload.condition,
                    status: payload.status,
                }).forEach(([key, value]) => formData.append(key, value ?? ''));
                imageFiles.forEach(file => formData.append('imageFiles', file));

                if (isEdit) {
                    await productApi.updateSupplier(form.id, formData);
                    showToast('Đã cập nhật sản phẩm', 'success');
                } else {
                    await productApi.createSupplier(formData);
                    showToast('Đã thêm sản phẩm', 'success');
                }
            } else if (isEdit) {
                await productApi.update(form.id, payload);
                showToast('Đã cập nhật sản phẩm', 'success');
            } else {
                await productApi.create(payload);
                showToast('Đã thêm sản phẩm', 'success');
            }

            setIsFormOpen(false);
            setSelectedProduct(null);
            await loadData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không lưu được sản phẩm', 'danger');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa sản phẩm này?')) return;
        try {
            await productApi.delete(id);
            showToast('Đã xóa sản phẩm', 'success');
            setSelectedProduct(null);
            await loadData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không xóa được sản phẩm', 'danger');
        }
    };

    const setPage = (page) => setParams(prev => ({ ...prev, page: Math.min(Math.max(page, 1), totalPages) }));

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>{isSupplier ? 'Sản phẩm của tôi' : 'Quản lý sản phẩm'}</h2>
                    <p>Tổng cộng <strong>{total}</strong> sản phẩm</p>
                </div>

                <div className="filter-bar">
                    <div className="search-box" style={{ flex: 2 }}>
                        <i className="fa fa-search" />
                        <input
                            type="text"
                            className="input-search"
                            placeholder="Tìm tên, danh mục, thương hiệu..."
                            value={params.keyword}
                            onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))}
                        />
                    </div>

                    {!isSupplier && (
                        <select className="select-filter" value={params.categoryId} onChange={event => setParams(prev => ({ ...prev, categoryId: event.target.value, page: 1 }))}>
                            <option value="">Tất cả danh mục</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id}>{category.nameVi || category.nameEn || category.name}</option>
                            ))}
                        </select>
                    )}

                    <select className="select-filter" value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(PRODUCT_STATUS).map(([value, item]) => (
                            <option key={value} value={value}>{item.label}</option>
                        ))}
                    </select>

                    <button className="btn btn-primary" onClick={() => openForm()}>
                        <i className="fa fa-plus" /> Thêm mới
                    </button>
                </div>

                <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                    <table className="admin-table admin-table-compact">
                        <thead>
                            <tr>
                                <th style={{ width: 70 }}>ID</th>
                                <th>Sản phẩm</th>
                                <th>Giá bán</th>
                                {isAdmin && <th>Giá nhập</th>}
                                <th style={{ textAlign: 'center' }}>Tồn kho</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: isAdmin ? 220 : 160 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} style={{ padding: 56, textAlign: 'center', color: '#94a3b8' }}>
                                        <i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} />
                                    </td>
                                </tr>
                            ) : products.length > 0 ? products.map(product => {
                                const status = PRODUCT_STATUS[product.status] || { label: product.status || 'Chưa xác định', badge: 'badge-pending' };
                                return (
                                    <tr key={product.id} className="clickable" onClick={() => openDetail(product)}>
                                        <td className="id-column">#{product.id}</td>
                                        <td>
                                            <div className="record-summary">
                                                <ImageThumb product={product} />
                                                <div className="record-copy">
                                                    <div className="cust-name one-line">{product.nameVi || product.nameEn || product.name}</div>
                                                    <div className="cust-phone one-line">{product.categoryNameVi || product.categoryNameEn || 'Chưa phân loại'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="price-text">{formatVnd(finalPrice(product))}</div>
                                            {product.discountPercent > 0 && <div className="cust-phone"><del>{formatVnd(product.price)}</del> -{product.discountPercent}%</div>}
                                        </td>
                                        {isAdmin && <td className="profit-text">{formatVnd(product.importPrice)}</td>}
                                        <td style={{ textAlign: 'center' }}><span className={`badge ${product.stock > 0 ? 'badge-completed' : 'badge-cancelled'}`}>{product.stock}</span></td>
                                        <td><span className={`badge ${status.badge}`}>{status.label}</span></td>
                                        <td className="action-btns" onClick={event => event.stopPropagation()}>
                                            <div className="btn-group">
                                                <button className="btn btn-secondary btn-sm" onClick={() => openDetail(product)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                                <button className="btn btn-edit btn-sm" onClick={() => openForm(product)}><i className="fa fa-pen" /> Sửa</button>
                                                {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product.id)}><i className="fa fa-trash" /> Xóa</button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="empty-state">
                                        <div className="empty-content"><i className="fa fa-box-open" /><p>Chưa có sản phẩm nào</p></div>
                                    </td>
                                </tr>
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

            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    isAdmin={isAdmin}
                    isSupplier={isSupplier}
                    onClose={() => setSelectedProduct(null)}
                    onEdit={product => { setSelectedProduct(null); openForm(product); }}
                    onDelete={handleDelete}
                />
            )}

            {isFormOpen && (
                <ProductFormModal
                    form={form}
                    setForm={setForm}
                    imageFiles={imageFiles}
                    setImageFiles={setImageFiles}
                    categories={categories}
                    suppliers={suppliers}
                    isAdmin={isAdmin}
                    isSupplier={isSupplier}
                    isEdit={isEdit}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

export default Products;
