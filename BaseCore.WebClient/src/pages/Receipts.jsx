import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { categoryApi, productApi, receiptApi, supplierApi, supplierRequestApi, unwrapApiData, unwrapPagedData } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getImageUrl } from '../data/fallbackCatalog';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { RECEIPT_STATUS, formatVnd, getMainImage, getProductImages, readValue } from '../utils/display';
import '../styles/admin.css';

const requestEmpty = {
    categoryId: '',
    supplierId: '',
    productId: '',
    requestedProductName: '',
    quantity: '',
    suggestedPrice: '',
    note: '',
};

const receiptTypeLabel = (value) => {
    if (value === 'RequestedReceipt') return 'Biên lai theo yêu cầu';
    if (value === 'ProposalReceipt') return 'Biên lai đề nghị';
    return value || 'Chưa phân loại';
};

const getReceiptImage = (source) => {
    const product = readValue(source, 'product', 'Product');
    const direct = readValue(source, 'productMainImage', 'ProductMainImage', 'mainImage', 'MainImage', 'imageUrl', 'ImageUrl')
        || readValue(product, 'mainImage', 'MainImage', 'imageUrl', 'ImageUrl');
    if (direct) return direct;
    const images = readValue(source, 'productImages', 'ProductImages', 'images', 'Images');
    if (!Array.isArray(images)) return '';
    const primary = images.find(item => Boolean(item?.isPrimary ?? item?.IsPrimary));
    return readValue(primary, 'imageUrl', 'ImageUrl') || readValue(images[0], 'imageUrl', 'ImageUrl') || '';
};

const getReceiptImages = (source) => {
    const product = readValue(source, 'product', 'Product');
    const images = readValue(source, 'productImages', 'ProductImages', 'images', 'Images')
        || readValue(product, 'images', 'Images', 'productImages', 'ProductImages');
    const urls = [];
    const pushUrl = (url) => {
        const value = typeof url === 'string' ? url.trim() : '';
        if (value && !urls.some(item => item.toLowerCase() === value.toLowerCase())) urls.push(value);
    };
    pushUrl(getReceiptImage(source));
    if (Array.isArray(images)) {
        images
            .slice()
            .sort((a, b) => Number(Boolean(b.isPrimary ?? b.IsPrimary)) - Number(Boolean(a.isPrimary ?? a.IsPrimary))
                || Number(a.sortOrder ?? a.SortOrder ?? 0) - Number(b.sortOrder ?? b.SortOrder ?? 0))
            .forEach(item => pushUrl(readValue(item, 'imageUrl', 'ImageUrl')));
    }
    return urls;
};

const toReceiptImageDtos = (urls, productId = 0) => urls.map((imageUrl, index) => ({
    imageUrl,
    productId,
    isPrimary: index === 0,
    sortOrder: index,
}));

const withReceiptImageFallback = (item, receipt) => {
    if (getReceiptImages(item).length > 0 || !receipt) return item;

    const fallbackUrls = getReceiptImages(receipt);
    if (fallbackUrls.length === 0) return item;

    const fallbackImages = fallbackUrls.map((imageUrl, index) => ({
        imageUrl,
        isPrimary: index === 0,
        sortOrder: index,
    }));
    const mainImage = fallbackUrls[0];

    return {
        ...item,
        mainImage: readValue(item, 'mainImage', 'MainImage') || mainImage,
        productMainImage: readValue(item, 'productMainImage', 'ProductMainImage') || mainImage,
        imageUrl: readValue(item, 'imageUrl', 'ImageUrl') || mainImage,
        images: fallbackImages,
        productImages: fallbackImages,
    };
};

const getReceiptItems = (receipt) => {
    const items = readValue(receipt, 'items', 'Items');
    if (Array.isArray(items) && items.length > 0) return items.map(item => withReceiptImageFallback(item, receipt));
    if (!receipt) return [];
    return [withReceiptImageFallback({
        productId: receipt.productId,
        productName: receipt.productName,
        categoryName: receipt.categoryName,
        supplierCompanyName: receipt.supplierCompanyName,
        supplierName: receipt.supplierName,
        quantity: receipt.quantity,
        unitImportPrice: receipt.unitImportPrice || receipt.importPrice,
        totalAmount: receipt.totalAmount || receipt.totalImportAmount,
        note: receipt.note,
        productMainImage: receipt.productMainImage,
        productImages: receipt.productImages,
        imageUrl: receipt.imageUrl,
    }, receipt)];
};

const enrichReceiptWithProductImages = async (receipt) => {
    if (!receipt) return receipt;

    const items = getReceiptItems(receipt);
    const firstItem = items[0] || {};
    const productId = Number(readValue(receipt, 'productId', 'ProductId') || readValue(firstItem, 'productId', 'ProductId') || 0);
    if (!productId) return receipt;

    try {
        const productRes = await productApi.getById(productId);
        const product = unwrapApiData(productRes, {});
        const existingUrls = [
            ...getReceiptImages(receipt),
            ...items.flatMap(item => getReceiptImages(item)),
        ];
        const urls = [...getProductImages(product), ...existingUrls].reduce((result, url) => {
            const value = typeof url === 'string' ? url.trim() : '';
            if (value && !result.some(item => item.toLowerCase() === value.toLowerCase())) result.push(value);
            return result;
        }, []);
        if (urls.length === 0) return receipt;

        const mainImage = getMainImage(product) || urls[0];
        const imageDtos = toReceiptImageDtos(urls, productId);
        const productName = readValue(product, 'nameVi', 'NameVi', 'name', 'Name', 'nameEn', 'NameEn');
        const categoryName = readValue(product, 'categoryNameVi', 'CategoryNameVi', 'categoryName', 'CategoryName', 'categoryNameEn', 'CategoryNameEn');
        const enrichedItems = (items.length > 0 ? items : [firstItem]).map(item => ({
            ...item,
            productId: readValue(item, 'productId', 'ProductId') || productId,
            productName: readValue(item, 'productName', 'ProductName') || productName,
            categoryName: readValue(item, 'categoryName', 'CategoryName') || categoryName,
            mainImage: mainImage,
            productMainImage: mainImage,
            imageUrl: mainImage,
            images: imageDtos,
            productImages: imageDtos,
        }));

        return {
            ...receipt,
            productMainImage: mainImage,
            mainImage: mainImage,
            imageUrl: mainImage,
            productImages: imageDtos,
            images: imageDtos,
            items: enrichedItems,
        };
    } catch {
        return receipt;
    }
};

const StatusBadge = ({ status }) => {
    const item = RECEIPT_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const ReceiptDetailModal = ({ receipt, onClose, onApprove, onReject, onCancel, isAdmin }) => {
    if (!receipt) return null;
    const items = getReceiptItems(receipt);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết biên lai {receipt.receiptCode || `#${receipt.id}`}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row"><span className="detail-label">Mã biên lai</span><span className="detail-value primary">{receipt.receiptCode || `#${receipt.id}`}</span></div>
                        <div className="detail-row"><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{receipt.supplierCompanyName || receipt.supplierName || `#${receipt.supplierId}`}</span></div>
                        <div className="detail-row"><span className="detail-label">Người tạo</span><span className="detail-value">{receipt.createdByName || receipt.creatorName || receipt.supplierName || 'Nhà cung cấp'}</span></div>
                        <div className="detail-row"><span className="detail-label">Ngày nhập</span><span className="detail-value">{formatAppDateTime(receipt.createdAt)}</span></div>
                        <div className="detail-row"><span className="detail-label">Loại biên lai</span><span className="detail-value">{receipt.receiptTypeLabel || receiptTypeLabel(receipt.receiptType)}</span></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái xử lý</span><StatusBadge status={receipt.status} /></div>
                        <div className="detail-row"><span className="detail-label">Tổng tiền nhập</span><span className="detail-value large danger">{formatVnd(receipt.totalAmount || receipt.totalImportAmount)}</span></div>
                        <div className="detail-row"><span className="detail-label">Số dòng sản phẩm</span><span className="detail-value">{items.length}</span></div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Sản phẩm trong biên lai</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {items.map((item, index) => {
                                const images = getReceiptImages(item);
                                const unitPrice = Number(readValue(item, 'unitImportPrice', 'UnitImportPrice', 'importPrice', 'ImportPrice') || 0);
                                const quantity = Number(readValue(item, 'quantity', 'Quantity') || 0);
                                const totalAmount = Number(readValue(item, 'totalAmount', 'TotalAmount') || quantity * unitPrice);
                                return (
                                    <div key={`${item.productId || index}-${index}`} className="detail-row receipt-product-card">
                                        <div className="record-summary">
                                            {images[0] && <img src={getImageUrl(images[0])} alt="" className="record-thumb" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                                            <div className="record-copy">
                                                <span className="cust-name one-line">{item.productName || `Sản phẩm #${item.productId}`}</span>
                                                <span className="cust-phone one-line">{item.categoryName || 'Chưa có danh mục'}</span>
                                            </div>
                                        </div>
                                        <div className="detail-grid" style={{ marginTop: 12 }}>
                                            <div><span className="detail-label">Số lượng nhập</span><span className="detail-value">{quantity}</span></div>
                                            <div><span className="detail-label">Giá nhập</span><span className="detail-value">{formatVnd(unitPrice)}</span></div>
                                            <div><span className="detail-label">Thành tiền</span><span className="detail-value danger">{formatVnd(totalAmount)}</span></div>
                                            <div><span className="detail-label">Nhà cung cấp</span><span className="detail-value">{item.supplierCompanyName || item.supplierName || receipt.supplierCompanyName || 'Nhà cung cấp'}</span></div>
                                        </div>
                                        <div className="detail-muted" style={{ marginTop: 10 }}>Ghi chú: {item.note || receipt.note || 'Không có ghi chú'}</div>
                                        {images.length > 1 && (
                                            <div className="receipt-product-thumbs" style={{ marginTop: 10 }}>
                                                {images.slice(1).map((url, imgIndex) => (
                                                    <img key={`${url}-${imgIndex}`} src={getImageUrl(url)} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {(receipt.specifications || receipt.note || receipt.content) && (
                        <div className="detail-section">
                            <div className="section-title">Thông tin bổ sung</div>
                            <div className="detail-paragraph">
                                {receipt.specifications || receipt.content || ''}
                                {receipt.note ? `${receipt.specifications || receipt.content ? '\n' : ''}Ghi chú: ${receipt.note}` : ''}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    {isAdmin && receipt.status === 'PendingAdminReview' && (
                        <>
                            <button className="btn btn-danger" onClick={() => onReject(receipt.id)}><i className="fa fa-times" /> Từ chối</button>
                            <button className="btn btn-success" onClick={() => onApprove(receipt.id)}><i className="fa fa-check" /> Duyệt và nhập kho</button>
                        </>
                    )}
                    {!isAdmin && receipt.status === 'PendingAdminReview' && (
                        <button className="btn btn-danger" onClick={() => onCancel(receipt.id)}><i className="fa fa-ban" /> Hủy</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CreateReceiptModal = ({ products, initialData, onClose, onSubmit }) => {
    const [form, setForm] = useState(() => ({
        requestId: initialData?.requestId || '',
        productId: initialData?.productId || '',
        quantity: initialData?.quantity || '',
        unitImportPrice: initialData?.suggestedPrice || '',
        specifications: '',
        note: initialData?.note || '',
    }));

    const selectedProduct = products.find(item => Number(item.id) === Number(form.productId));

    useEffect(() => {
        if (selectedProduct && !form.unitImportPrice) {
            setForm(prev => ({ ...prev, unitImportPrice: selectedProduct.importPrice || selectedProduct.price || 0 }));
        }
    }, [selectedProduct, form.unitImportPrice]);

    const total = Number(form.quantity || 0) * Number(form.unitImportPrice || 0);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-sm" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>{form.requestId ? 'Tạo biên lai theo yêu cầu' : 'Tạo biên lai đề nghị'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={event => { event.preventDefault(); onSubmit(form); }}>
                    <div className="modal-body">
                        {initialData?.requestedProductName && (
                            <div className="detail-paragraph" style={{ marginBottom: 12 }}>
                                Yêu cầu: {initialData.requestedProductName}
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Sản phẩm *</label>
                            <select className="form-control" required value={form.productId} onChange={event => setForm(prev => ({ ...prev, productId: event.target.value, unitImportPrice: '' }))}>
                                <option value="">Chọn sản phẩm</option>
                                {products.map(product => <option key={product.id} value={product.id}>{product.nameVi || product.nameEn || product.name}</option>)}
                            </select>
                        </div>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Số lượng *</label>
                                <input type="number" min={1} required className="form-control" value={form.quantity} onChange={event => setForm(prev => ({ ...prev, quantity: event.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giá nhập đơn vị *</label>
                                <input type="number" min={0} required className="form-control" value={form.unitImportPrice} onChange={event => setForm(prev => ({ ...prev, unitImportPrice: event.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tổng tiền</label>
                            <input readOnly className="form-control" value={formatVnd(total)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Thông số hoặc thông tin biên lai</label>
                            <textarea className="form-control" rows={3} value={form.specifications} onChange={event => setForm(prev => ({ ...prev, specifications: event.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <textarea className="form-control" rows={2} value={form.note} onChange={event => setForm(prev => ({ ...prev, note: event.target.value }))} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary"><i className="fa fa-paper-plane" /> Gửi quản trị duyệt</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminRequestForm = ({ categories, onCreated }) => {
    const { showToast } = useToast();
    const [form, setForm] = useState(requestEmpty);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
        const loadSuppliers = async () => {
            if (!form.categoryId) {
                setSuppliers([]);
                return;
            }
            setLoadingOptions(true);
            try {
                const res = await supplierApi.getAll({ categoryId: form.categoryId, pageSize: 100 });
                setSuppliers(unwrapPagedData(res).items);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadSuppliers();
    }, [form.categoryId]);

    useEffect(() => {
        const loadProducts = async () => {
            if (!form.supplierId) {
                setProducts([]);
                return;
            }
            setLoadingOptions(true);
            try {
                const res = await productApi.search({ supplierId: form.supplierId, pageSize: 100 });
                setProducts(unwrapPagedData(res).items);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadProducts();
    }, [form.supplierId]);

    const submit = async (event) => {
        event.preventDefault();
        try {
            await supplierRequestApi.create({
                categoryId: Number(form.categoryId),
                supplierId: Number(form.supplierId),
                productId: form.productId ? Number(form.productId) : null,
                requestedProductName: form.requestedProductName,
                quantity: Number(form.quantity),
                suggestedPrice: Number(form.suggestedPrice || 0),
                note: form.note,
            });
            showToast('Đã tạo yêu cầu cho nhà cung cấp', 'success');
            setForm(requestEmpty);
            setProducts([]);
            onCreated?.();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tạo được yêu cầu', 'danger');
        }
    };

    return (
        <div className="card">
            <div className="section-title">Tạo yêu cầu nhập hàng</div>
            <form onSubmit={submit}>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Danh mục *</label>
                        <select className="form-control" required value={form.categoryId} onChange={event => setForm(prev => ({ ...prev, categoryId: event.target.value, supplierId: '', productId: '' }))}>
                            <option value="">Chọn danh mục</option>
                            {categories.map(category => <option key={category.id} value={category.id}>{category.nameVi || category.nameEn}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nhà cung cấp *</label>
                        <select className="form-control" required value={form.supplierId} disabled={!form.categoryId || loadingOptions} onChange={event => setForm(prev => ({ ...prev, supplierId: event.target.value, productId: '' }))}>
                            <option value="">Chọn nhà cung cấp</option>
                            {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Sản phẩm có sẵn</label>
                        <select className="form-control" value={form.productId} disabled={!form.supplierId || loadingOptions} onChange={event => setForm(prev => ({ ...prev, productId: event.target.value }))}>
                            <option value="">Không chọn</option>
                            {products.map(product => <option key={product.id} value={product.id}>{product.nameVi || product.nameEn || product.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tên sản phẩm cần yêu cầu</label>
                        <input className="form-control" value={form.requestedProductName} onChange={event => setForm(prev => ({ ...prev, requestedProductName: event.target.value }))} placeholder="Nhập khi chưa có sản phẩm" />
                    </div>
                </div>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label className="form-label">Số lượng *</label>
                        <input type="number" min={1} required className="form-control" value={form.quantity} onChange={event => setForm(prev => ({ ...prev, quantity: event.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Giá đề xuất</label>
                        <input type="number" min={0} className="form-control" value={form.suggestedPrice} onChange={event => setForm(prev => ({ ...prev, suggestedPrice: event.target.value }))} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Ghi chú</label>
                    <textarea className="form-control" rows={3} value={form.note} onChange={event => setForm(prev => ({ ...prev, note: event.target.value }))} />
                </div>
                <button className="btn btn-primary" type="submit"><i className="fa fa-paper-plane" /> Gửi yêu cầu</button>
            </form>
        </div>
    );
};

const Receipts = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();
    const isAdmin = user?.userType === 1;
    const isSupplier = user?.userType === 2;

    const [activeTab, setActiveTab] = useState('receipts');
    const [receipts, setReceipts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [initialReceipt, setInitialReceipt] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', status: '', receiptType: '', categoryId: '', supplierId: '', fromDate: '', toDate: '' });
    const [supplierOptions, setSupplierOptions] = useState([]);

    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadReceipts = useCallback(async () => {
        try {
            setLoading(true);
            const query = {
                ...params,
                categoryId: params.categoryId || undefined,
                supplierId: params.supplierId || undefined,
                status: params.status || undefined,
                receiptType: params.receiptType || undefined,
                keyword: params.keyword || undefined,
                fromDate: params.fromDate || undefined,
                toDate: params.toDate || undefined,
            };
            const res = isSupplier ? await receiptApi.searchSupplier(query) : await receiptApi.searchAdmin(query);
            const paged = unwrapPagedData(res);
            setReceipts(paged.items);
            setTotal(paged.totalCount);
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tải được danh sách biên lai', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, isSupplier, showToast]);

    const loadOptions = useCallback(async () => {
        try {
            if (isSupplier) {
                const pRes = await productApi.getMine({ pageSize: 100 });
                setProducts(unwrapPagedData(pRes).items);
            } else {
                const [categoryRes, supplierRes] = await Promise.all([
                    categoryApi.getAll(),
                    supplierApi.getAll({ pageSize: 100 }),
                ]);
                setCategories(unwrapApiData(categoryRes, []));
                setSupplierOptions(unwrapPagedData(supplierRes).items);
            }
        } catch {
            showToast('Không tải được dữ liệu lựa chọn', 'danger');
        }
    }, [isSupplier, showToast]);

    useEffect(() => { loadReceipts(); }, [loadReceipts]);
    useEffect(() => { loadOptions(); }, [loadOptions]);

    useEffect(() => {
        if (location.state?.openCreate || location.state?.createReceipt) {
            setInitialReceipt(location.state.createReceipt || null);
            setShowCreate(true);
        }
    }, [location.state]);

    const openDetail = async (id) => {
        try {
            const res = await receiptApi.getById(id);
            const receipt = unwrapApiData(res);
            setSelectedReceipt(await enrichReceiptWithProductImages(receipt));
        } catch {
            showToast('Không thể tải chi tiết biên lai', 'danger');
        }
    };

    const handleCreate = async (form) => {
        try {
            await receiptApi.create({
                requestId: form.requestId ? Number(form.requestId) : null,
                productId: Number(form.productId),
                quantity: Number(form.quantity),
                unitImportPrice: Number(form.unitImportPrice),
                importPrice: Number(form.unitImportPrice),
                imageUrl: form.imageUrl || getProductImages(products.find(item => Number(item.id) === Number(form.productId)) || {})[0] || '',
                specifications: form.specifications,
                note: form.note,
            });
            showToast('Đã gửi biên lai, chờ quản trị duyệt', 'success');
            setShowCreate(false);
            setInitialReceipt(null);
            loadReceipts();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tạo được biên lai', 'danger');
        }
    };

    const handleApprove = async (id) => {
        try {
            await receiptApi.approve(id);
            showToast('Đã duyệt và nhập kho', 'success');
            setSelectedReceipt(null);
            loadReceipts();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không duyệt được biên lai', 'danger');
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt('Lý do từ chối biên lai:') || '';
        try {
            await receiptApi.reject(id, reason);
            showToast('Đã từ chối biên lai', 'success');
            setSelectedReceipt(null);
            loadReceipts();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không từ chối được biên lai', 'danger');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Xác nhận hủy biên lai này?')) return;
        try {
            await receiptApi.cancel(id);
            showToast('Đã hủy biên lai', 'success');
            setSelectedReceipt(null);
            loadReceipts();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không hủy được biên lai', 'danger');
        }
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <div className="admin-header-row">
                        <div>
                            <h2>{isSupplier ? 'Biên lai của tôi' : 'Quản lý biên lai'}</h2>
                            <p>Tổng cộng <strong>{total}</strong> biên lai</p>
                        </div>
                        {isSupplier && (
                            <button className="btn btn-primary" onClick={() => { setInitialReceipt(null); setShowCreate(true); }}>
                                <i className="fa fa-plus" /> Tạo biên lai
                            </button>
                        )}
                    </div>
                </div>

                {isAdmin && (
                    <div className="tab-bar">
                        <button className={`tab-btn ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveTab('receipts')}>Duyệt biên lai</button>
                        <button className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`} onClick={() => setActiveTab('request')}>Tạo yêu cầu</button>
                    </div>
                )}

                {isAdmin && activeTab === 'request' ? (
                    <AdminRequestForm categories={categories} onCreated={() => setActiveTab('receipts')} />
                ) : (
                    <>
                        <div className="filter-bar">
                            <div className="search-box" style={{ flex: 2 }}>
                                <i className="fa fa-search" />
                                <input className="input-search" placeholder="Tìm mã biên lai, sản phẩm, ghi chú..." value={params.keyword} onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))} />
                            </div>
                            <select className="select-filter" value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))}>
                                <option value="">Tất cả trạng thái</option>
                                {Object.entries(RECEIPT_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                            </select>
                            <select className="select-filter" value={params.receiptType} onChange={event => setParams(prev => ({ ...prev, receiptType: event.target.value, page: 1 }))}>
                                <option value="">Tất cả loại biên lai</option>
                                <option value="ProposalReceipt">Biên lai đề nghị</option>
                                <option value="RequestedReceipt">Biên lai theo yêu cầu</option>
                            </select>
                            {isAdmin && (
                                <>
                                    <select className="select-filter" value={params.categoryId} onChange={event => setParams(prev => ({ ...prev, categoryId: event.target.value, page: 1 }))}>
                                        <option value="">Tất cả danh mục</option>
                                        {categories.map(category => <option key={category.id} value={category.id}>{category.nameVi || category.nameEn}</option>)}
                                    </select>
                                    <select className="select-filter" value={params.supplierId} onChange={event => setParams(prev => ({ ...prev, supplierId: event.target.value, page: 1 }))}>
                                        <option value="">Tất cả nhà cung cấp</option>
                                        {supplierOptions.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.companyName}</option>)}
                                    </select>
                                </>
                            )}
                        </div>

                        <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                            <table className="admin-table admin-table-compact">
                                <thead>
                                    <tr>
                                        <th>Mã biên lai</th>
                                        <th>Sản phẩm</th>
                                        <th>Ngày nhập</th>
                                        <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: 'center', width: 230 }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                                    ) : receipts.length > 0 ? receipts.map(receipt => {
                                        const imageUrl = getReceiptImage(receipt);
                                        return (
                                            <tr key={receipt.id} className="clickable" onClick={() => openDetail(receipt.id)}>
                                                <td className="id-column">{receipt.receiptCode || `#${receipt.id}`}</td>
                                                <td>
                                                    <div className="record-summary">
                                                        {imageUrl && <img src={getImageUrl(imageUrl)} alt="" className="record-thumb record-thumb-sm" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                                                        <div className="record-copy">
                                                            <span className="cust-name one-line">{receipt.productName || `Sản phẩm #${receipt.productId}`}</span>
                                                            <span className="cust-phone one-line">{receipt.categoryName || receiptTypeLabel(receipt.receiptType)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{formatAppDate(receipt.createdAt)}</td>
                                                <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(receipt.totalAmount || receipt.totalImportAmount)}</td>
                                                <td><StatusBadge status={receipt.status} /></td>
                                                <td className="action-btns" onClick={event => event.stopPropagation()}>
                                                    <div className="btn-group">
                                                        <button className="btn btn-secondary btn-sm" onClick={() => openDetail(receipt.id)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                                        {isAdmin && receipt.status === 'PendingAdminReview' && <button className="btn btn-success btn-sm" onClick={() => handleApprove(receipt.id)}>Duyệt</button>}
                                                        {isSupplier && receipt.status === 'PendingAdminReview' && <button className="btn btn-danger btn-sm" onClick={() => handleCancel(receipt.id)}>Hủy</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan="6" className="empty-state"><div className="empty-content"><i className="fa fa-file-invoice" /><p>Chưa có biên lai nào</p></div></td></tr>
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
                    </>
                )}
            </div>

            {selectedReceipt && <ReceiptDetailModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} onApprove={handleApprove} onReject={handleReject} onCancel={handleCancel} isAdmin={isAdmin} />}
            {showCreate && <CreateReceiptModal products={products} initialData={initialReceipt} onClose={() => { setShowCreate(false); setInitialReceipt(null); }} onSubmit={handleCreate} />}
        </div>
    );
};

export default Receipts;
