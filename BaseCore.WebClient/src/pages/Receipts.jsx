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

const getAllowedActions = (source) => readValue(source, 'allowedActions', 'AllowedActions') || [];

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
        const productName = readValue(product, 'nameVi', 'NameVi', 'name', 'Name');
        const categoryName = readValue(product, 'categoryNameVi', 'CategoryNameVi', 'categoryName', 'CategoryName');
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

const ReceiptDetailModal = ({ receipt, onClose, onApprove, onReject, onCancel }) => {
    if (!receipt) return null;
    const items = getReceiptItems(receipt);
    const allowedActions = getAllowedActions(receipt);

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
                    {(allowedActions.includes('approve') || allowedActions.includes('reject')) && (
                        <>
                            {allowedActions.includes('reject') && <button className="btn btn-danger" onClick={() => onReject(receipt.id)}><i className="fa fa-times" /> Từ chối</button>}
                            {allowedActions.includes('approve') && <button className="btn btn-success" onClick={() => onApprove(receipt.id)}><i className="fa fa-check" /> Duyệt và nhập kho</button>}
                        </>
                    )}
                    {allowedActions.includes('cancel') && (
                        <button className="btn btn-danger" onClick={() => onCancel(receipt.id)}><i className="fa fa-ban" /> Hủy</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const RequestDetailModal = ({ request, onClose, onCancel }) => {
    if (!request) return null;
    const canCancel = Array.isArray(request.allowedActions) && request.allowedActions.includes('cancel');
    const productLabel = request.productName || request.requestedProductName || `Sản phẩm #${request.productId}`;
    const statusMap = {
        Pending: { label: 'Đang chờ', color: '#f59e0b', badge: 'badge-pending' },
        ApprovedBySupplier: { label: 'NCC đã chấp nhận', color: '#10b981', badge: 'badge-success' },
        RejectedBySupplier: { label: 'NCC từ chối', color: '#f43f5e', badge: 'badge-danger' },
        ReceiptCreated: { label: 'Đã tạo biên lai', color: '#6366f1', badge: 'badge-info' },
        Completed: { label: 'Hoàn thành', color: '#22c55e', badge: 'badge-success' },
        Cancelled: { label: 'Đã hủy', color: '#64748b', badge: 'badge-muted' },
    };
    const s = statusMap[request.status] || { label: request.status, color: '#94a3b8', badge: 'badge-pending' };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-md" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết yêu cầu nhập hàng #{request.id}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row">
                            <span className="detail-label">Mã yêu cầu</span>
                            <span className="detail-value primary">#{request.id}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Nhà cung cấp</span>
                            <span className="detail-value">{request.supplierCompanyName || request.supplierName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Danh mục</span>
                            <span className="detail-value">{request.categoryName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Người tạo yêu cầu</span>
                            <span className="detail-value">{request.adminName || 'Quản trị viên'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Ngày tạo</span>
                            <span className="detail-value">{formatAppDateTime(request.createdAt)}</span>
                        </div>
                        {request.updatedAt && (
                            <div className="detail-row">
                                <span className="detail-label">Cập nhật lúc</span>
                                <span className="detail-value">{formatAppDateTime(request.updatedAt)}</span>
                            </div>
                        )}
                        <div className="detail-row">
                            <span className="detail-label">Trạng thái</span>
                            <span className="detail-value">
                                <span className={`badge ${s.badge}`}>{s.label}</span>
                            </span>
                        </div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Thông tin sản phẩm yêu cầu</div>
                        <div className="detail-row receipt-product-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
                            <div className="record-summary">
                                {request.productImageUrl ? (
                                    <img src={getImageUrl(request.productImageUrl)} alt="" className="record-thumb" style={{ width: 60, height: 60, borderRadius: 8 }} onError={event => { event.currentTarget.style.display = 'none'; }} />
                                ) : (
                                    <div className="record-thumb-fallback" style={{ width: 60, height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24 }}><i className="fa fa-tag" /></div>
                                )}
                                <div className="record-copy" style={{ marginLeft: 12 }}>
                                    <span className="cust-name" style={{ fontSize: 15, fontWeight: 600 }}>{productLabel}</span>
                                    <span className="cust-phone" style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{request.productId ? `Mã sản phẩm: #${request.productId}` : 'Sản phẩm mới (nhập tay)'}</span>
                                </div>
                            </div>
                            <div className="detail-grid" style={{ marginTop: 14 }}>
                                <div>
                                    <span className="detail-label">Số lượng yêu cầu</span>
                                    <span className="detail-value large">{request.quantity}</span>
                                </div>
                                <div>
                                    <span className="detail-label">Giá đề xuất</span>
                                    <span className="detail-value danger">{request.suggestedPrice > 0 ? formatVnd(request.suggestedPrice) : '—'}</span>
                                </div>
                                <div>
                                    <span className="detail-label">Thành tiền tạm tính</span>
                                    <span className="detail-value danger" style={{ fontWeight: 700 }}>{request.suggestedPrice > 0 ? formatVnd(request.quantity * request.suggestedPrice) : '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {request.note && (
                        <div className="detail-section">
                            <div className="section-title">Ghi chú từ quản trị viên</div>
                            <div className="detail-paragraph" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 8, borderLeft: '3px solid #6366f1' }}>
                                {request.note}
                            </div>
                        </div>
                    )}

                    {request.rejectionReason && (
                        <div className="detail-section">
                            <div className="section-title" style={{ color: '#f43f5e' }}>Lý do hủy / từ chối</div>
                            <div className="detail-paragraph" style={{ background: 'rgba(244,63,94,0.08)', color: '#fca5a5', padding: '12px', borderRadius: 8, borderLeft: '3px solid #f43f5e' }}>
                                {request.rejectionReason}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    {canCancel && (
                        <button className="btn btn-danger" onClick={() => { onCancel(request.id); onClose(); }}>
                            <i className="fa fa-times" /> Hủy yêu cầu
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


const emptyItem = (productId = '', quantity = '', unitImportPrice = '', note = '', imageUrl = '') => ({
    productId, quantity, unitImportPrice, note, imageUrl,
});

const CreateReceiptModal = ({ products, initialData, onClose, onSubmit }) => {
    const [items, setItems] = useState(() => {
        if (initialData?.productId) {
            return [emptyItem(String(initialData.productId), String(initialData.quantity || ''), String(initialData.suggestedPrice || ''), initialData.note || '')];
        }
        return [emptyItem()];
    });
    const [receiptImageUrl, setReceiptImageUrl] = useState('');
    const [imagePreviewError, setImagePreviewError] = useState(false);
    const [note, setNote] = useState(initialData?.note || '');
    const [specifications, setSpecifications] = useState('');
    const requestId = initialData?.requestId || '';

    const getProductById = (id) => products.find(p => Number(p.id) === Number(id));

    const updateItem = (index, field, value) => {
        setItems(prev => {
            const updated = prev.map((item, i) => i === index ? { ...item, [field]: value } : item);
            if (field === 'productId' && value) {
                const prod = getProductById(value);
                if (prod && !updated[index].unitImportPrice) {
                    updated[index].unitImportPrice = String(prod.importPrice || prod.price || '');
                }
                if (prod && !updated[index].imageUrl) {
                    updated[index].imageUrl = '';
                }
            }
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

    const grandTotal = items.reduce((sum, item) => {
        const q = Number(item.quantity) || 0;
        const p = Number(item.unitImportPrice) || 0;
        return sum + q * p;
    }, 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        const validItems = items.filter(item => item.productId && Number(item.quantity) > 0);
        if (validItems.length === 0) return;
        onSubmit({
            requestId,
            imageUrl: receiptImageUrl,
            note,
            specifications,
            items: validItems.map(item => ({
                productId: Number(item.productId),
                quantity: Number(item.quantity),
                unitImportPrice: Number(item.unitImportPrice) || 0,
                note: item.note || '',
                imageUrl: item.imageUrl || '',
            })),
        });
    };

    const previewImage = receiptImageUrl.trim();

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{requestId ? 'Tạo biên lai theo yêu cầu' : 'Tạo biên lai đề nghị'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {initialData?.requestedProductName && (
                            <div className="detail-paragraph" style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, borderLeft: '3px solid #6366f1' }}>
                                <strong>Yêu cầu:</strong> {initialData.requestedProductName}
                            </div>
                        )}

                        {      }
                        <div className="section-title" style={{ marginBottom: 10 }}>Danh sách sản phẩm</div>

                        {items.map((item, index) => {
                            const selectedProduct = getProductById(item.productId);
                            const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitImportPrice) || 0);
                            return (
                                <div key={index} className="receipt-item-row" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px', marginBottom: 12, position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: 13 }}>Sản phẩm #{index + 1}</span>
                                        {items.length > 1 && (
                                            <button type="button" className="btn btn-danger btn-sm" style={{ padding: '2px 10px' }} onClick={() => removeItem(index)}>
                                                <i className="fa fa-trash" /> Xóa
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sản phẩm *</label>
                                        <select className="form-control" required value={item.productId}
                                            onChange={e => updateItem(index, 'productId', e.target.value)}>
                                            <option value="">Chọn sản phẩm</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.nameVi || p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Số lượng *</label>
                                            <input type="number" min={1} required className="form-control"
                                                value={item.quantity}
                                                onChange={e => updateItem(index, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Giá nhập đơn vị *</label>
                                            <input type="number" min={0} required className="form-control"
                                                value={item.unitImportPrice}
                                                onChange={e => updateItem(index, 'unitImportPrice', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thành tiền</label>
                                        <input readOnly className="form-control" value={formatVnd(itemTotal)} style={{ color: '#f43f5e', fontWeight: 600 }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Link ảnh sản phẩm (tùy chọn)</label>
                                        <input type="url" className="form-control" placeholder="https://..." value={item.imageUrl}
                                            onChange={e => updateItem(index, 'imageUrl', e.target.value)} />
                                        {item.imageUrl && (
                                            <img src={item.imageUrl} alt="preview" style={{ marginTop: 6, maxHeight: 60, borderRadius: 6, objectFit: 'cover' }}
                                                onError={ev => { ev.currentTarget.style.display = 'none'; }} />
                                        )}
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Ghi chú dòng hàng</label>
                                        <input className="form-control" value={item.note}
                                            onChange={e => updateItem(index, 'note', e.target.value)} />
                                    </div>
                                </div>
                            );
                        })}

                        <button type="button" className="btn btn-secondary" style={{ marginBottom: 16, width: '100%' }} onClick={addItem}>
                            <i className="fa fa-plus" /> Thêm sản phẩm
                        </button>

                        {     }
                        <div className="form-group" style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: 15 }}>Tổng cộng</span>
                                <span style={{ fontWeight: 800, fontSize: 20, color: '#f43f5e' }}>{formatVnd(grandTotal)}</span>
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{items.filter(i => i.productId).length} sản phẩm</div>
                        </div>

                        {     }
                        <div className="form-group">
                            <label className="form-label"><i className="fa fa-image" style={{ marginRight: 6 }} />Ảnh kèm theo biên lai (tùy chọn)</label>
                            <input type="url" className="form-control" placeholder="Dán link ảnh kèm theo biên lai..."
                                value={receiptImageUrl}
                                onChange={e => { setReceiptImageUrl(e.target.value); setImagePreviewError(false); }} />
                            {previewImage && !imagePreviewError && (
                                <div style={{ marginTop: 10, textAlign: 'center' }}>
                                    <img src={previewImage} alt="Ảnh kèm theo"
                                        style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(99,102,241,0.3)' }}
                                        onError={() => setImagePreviewError(true)} />
                                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>Xem trước ảnh kèm theo</div>
                                </div>
                            )}
                            {imagePreviewError && (
                                <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 6 }}>
                                    <i className="fa fa-exclamation-triangle" /> Không thể tải ảnh từ URL này.
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Thông số hoặc thông tin biên lai</label>
                            <textarea className="form-control" rows={2} value={specifications} onChange={e => setSpecifications(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú chung</label>
                            <textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={items.filter(i => i.productId && Number(i.quantity) > 0).length === 0}>
                            <i className="fa fa-paper-plane" /> Gửi quản trị duyệt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const emptyRequestItem = () => ({ productId: '', requestedProductName: '', quantity: '', suggestedPrice: '', note: '' });

const AdminRequestForm = ({ categories, onCreated }) => {
    const { showToast } = useToast();
    const [categoryId, setCategoryId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [globalNote, setGlobalNote] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [items, setItems] = useState([emptyRequestItem()]);

    useEffect(() => {
        const loadSuppliers = async () => {
            if (!categoryId) { setSuppliers([]); setSupplierId(''); setProducts([]); return; }
            setLoadingOptions(true);
            try {
                const res = await supplierApi.getAll({ categoryId, pageSize: 100 });
                setSuppliers(unwrapPagedData(res).items);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadSuppliers();
    }, [categoryId]);

    useEffect(() => {
        const loadProducts = async () => {
            if (!supplierId) { setProducts([]); return; }
            setLoadingOptions(true);
            try {
                const res = await productApi.search({ supplierId, pageSize: 100 });
                setProducts(unwrapPagedData(res).items);
            } finally {
                setLoadingOptions(false);
            }
        };
        loadProducts();
    }, [supplierId]);

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addItem = () => setItems(prev => [...prev, emptyRequestItem()]);
    const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

    const submit = async (event) => {
        event.preventDefault();
        const validItems = items.filter(item => Number(item.quantity) > 0 && (item.productId || item.requestedProductName?.trim()));
        if (validItems.length === 0) {
            showToast('Vui lòng thêm ít nhất một sản phẩm hợp lệ', 'danger');
            return;
        }
        setSubmitting(true);
        let successCount = 0;
        let failCount = 0;
        for (const item of validItems) {
            try {
                await supplierRequestApi.create({
                    categoryId: Number(categoryId),
                    supplierId: Number(supplierId),
                    productId: item.productId ? Number(item.productId) : null,
                    requestedProductName: item.requestedProductName || '',
                    quantity: Number(item.quantity),
                    suggestedPrice: Number(item.suggestedPrice || 0),
                    note: item.note || globalNote || '',
                });
                successCount++;
            } catch {
                failCount++;
            }
        }
        setSubmitting(false);

        if (successCount > 0) {
            showToast(`Đã tạo ${successCount} yêu cầu cho nhà cung cấp${failCount > 0 ? `, ${failCount} thất bại` : ''}`, successCount > 0 ? 'success' : 'danger');
            setCategoryId('');
            setSupplierId('');
            setGlobalNote('');
            setItems([emptyRequestItem()]);
            setProducts([]);
            setSuppliers([]);
            onCreated?.();
        } else {
            showToast('Không tạo được yêu cầu nào', 'danger');
        }
    };

    const selectedSupplier = suppliers.find(s => String(s.id) === String(supplierId));

    return (
        <div className="card">
            <div className="section-title">Tạo yêu cầu nhập hàng</div>
            <form onSubmit={submit}>
                {       }
                <div className="form-grid-2" style={{ marginBottom: 4 }}>
                    <div className="form-group">
                        <label className="form-label">Danh mục *</label>
                        <select className="form-control" required value={categoryId}
                            onChange={e => { setCategoryId(e.target.value); setSupplierId(''); setItems([emptyRequestItem()]); }}>
                            <option value="">Chọn danh mục</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nameVi}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nhà cung cấp *</label>
                        <select className="form-control" required value={supplierId}
                            disabled={!categoryId || loadingOptions}
                            onChange={e => { setSupplierId(e.target.value); setItems([emptyRequestItem()]); }}>
                            <option value="">Chọn nhà cung cấp</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                        </select>
                    </div>
                </div>

                {selectedSupplier && (
                    <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8, borderLeft: '3px solid #6366f1', fontSize: 13, color: '#94a3b8' }}>
                        <i className="fa fa-building" style={{ marginRight: 6 }} />
                        Gửi yêu cầu tới: <strong style={{ color: '#e2e8f0' }}>{selectedSupplier.companyName}</strong>
                    </div>
                )}

                {     }
                <div className="section-title" style={{ margin: '10px 0 10px' }}>Danh sách sản phẩm yêu cầu</div>

                {items.map((item, index) => (
                    <div key={index} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: 13 }}>Yêu cầu #{index + 1}</span>
                            {items.length > 1 && (
                                <button type="button" className="btn btn-danger btn-sm" style={{ padding: '2px 10px' }} onClick={() => removeItem(index)}>
                                    <i className="fa fa-trash" /> Xóa
                                </button>
                            )}
                        </div>
                        <div className="form-grid-2">
                            <div className="form-group">
                                <label className="form-label">Sản phẩm có sẵn</label>
                                <select className="form-control" value={item.productId}
                                    disabled={!supplierId || loadingOptions}
                                    onChange={e => {
                                        const prod = products.find(p => String(p.id) === String(e.target.value));
                                        updateItem(index, 'productId', e.target.value);
                                        if (prod && !item.suggestedPrice) updateItem(index, 'suggestedPrice', String(prod.importPrice || prod.price || ''));
                                    }}>
                                    <option value="">Không chọn</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.nameVi || p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tên sản phẩm cần yêu cầu</label>
                                <input className="form-control" value={item.requestedProductName}
                                    onChange={e => updateItem(index, 'requestedProductName', e.target.value)}
                                    placeholder="Nhập khi chưa có sản phẩm" />
                            </div>
                        </div>
                        <div className="form-grid-2">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Số lượng *</label>
                                <input type="number" min={1} required className="form-control"
                                    value={item.quantity}
                                    onChange={e => updateItem(index, 'quantity', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Giá đề xuất</label>
                                <input type="number" min={0} className="form-control"
                                    value={item.suggestedPrice}
                                    onChange={e => updateItem(index, 'suggestedPrice', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                            <label className="form-label">Ghi chú dòng yêu cầu</label>
                            <input className="form-control" value={item.note}
                                onChange={e => updateItem(index, 'note', e.target.value)}
                                placeholder="Ghi chú riêng cho yêu cầu này (không bắt buộc)" />
                        </div>
                    </div>
                ))}

                <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: 14 }} onClick={addItem}
                    disabled={!supplierId}>
                    <i className="fa fa-plus" /> Thêm sản phẩm yêu cầu
                </button>

                {     }
                {items.filter(i => i.productId || i.requestedProductName).length > 0 && (
                    <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Tổng yêu cầu</span>
                        <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>
                            {items.filter(i => i.productId || i.requestedProductName).length} sản phẩm
                            {' · '}
                            {items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} đơn vị
                        </span>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Ghi chú chung (áp dụng cho tất cả nếu không có ghi chú riêng)</label>
                    <textarea className="form-control" rows={2} value={globalNote}
                        onChange={e => setGlobalNote(e.target.value)} />
                </div>

                <button className="btn btn-primary" type="submit" disabled={submitting || !supplierId}>
                    {submitting
                        ? <><i className="fa fa-spinner fa-spin" /> Đang gửi...</>
                        : <><i className="fa fa-paper-plane" /> Gửi {items.filter(i => Number(i.quantity) > 0 && (i.productId || i.requestedProductName)).length > 1
                            ? `${items.filter(i => Number(i.quantity) > 0 && (i.productId || i.requestedProductName)).length} yêu cầu`
                            : 'yêu cầu'}</>
                    }
                </button>
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
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [initialReceipt, setInitialReceipt] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', status: '', receiptType: '', categoryId: '', supplierId: '', fromDate: '', toDate: '' });
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [myRequestsTotal, setMyRequestsTotal] = useState(0);
    const [myRequestsLoading, setMyRequestsLoading] = useState(false);
    const [requestParams, setRequestParams] = useState({ page: 1, pageSize: 20, keyword: '', status: '' });

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

    const loadMyRequests = useCallback(async () => {
        if (!isAdmin) return;
        try {
            setMyRequestsLoading(true);
            const res = await supplierRequestApi.searchAdmin({
                ...requestParams,
                keyword: requestParams.keyword || undefined,
                status: requestParams.status || undefined,
            });
            const paged = unwrapPagedData(res);
            setMyRequests(paged.items);
            setMyRequestsTotal(paged.totalCount);
        } catch {
            showToast('Không tải được danh sách yêu cầu', 'danger');
        } finally {
            setMyRequestsLoading(false);
        }
    }, [isAdmin, requestParams, showToast]);

    useEffect(() => { if (activeTab === 'myRequests') loadMyRequests(); }, [activeTab, loadMyRequests]);

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
            const payload = {
                requestId: form.requestId ? Number(form.requestId) : null,
                imageUrl: form.imageUrl || '',
                specifications: form.specifications || '',
                note: form.note || '',
            };

            if (Array.isArray(form.items) && form.items.length > 0) {
                payload.items = form.items;
                const first = form.items[0];
                payload.productId = first.productId;
                payload.quantity = first.quantity;
                payload.unitImportPrice = first.unitImportPrice;
                payload.importPrice = first.unitImportPrice;
            } else {
                payload.productId = Number(form.productId);
                payload.quantity = Number(form.quantity);
                payload.unitImportPrice = Number(form.unitImportPrice);
                payload.importPrice = Number(form.unitImportPrice);
                if (!payload.imageUrl) {
                    payload.imageUrl = getProductImages(products.find(item => Number(item.id) === Number(form.productId)) || {})[0] || '';
                }
            }

            await receiptApi.create(payload);
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

    const handleCancelRequest = async (id) => {
        const reason = window.prompt('Lý do hủy yêu cầu (không bắt buộc):');
        if (reason === null) return;       
        try {
            await supplierRequestApi.cancel(id, reason || '');
            showToast('Đã hủy yêu cầu', 'success');
            loadMyRequests();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không hủy được yêu cầu', 'danger');
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
                        <button className={`tab-btn ${activeTab === 'myRequests' ? 'active' : ''}`} onClick={() => setActiveTab('myRequests')}>
                            Yêu cầu đã gửi
                            {myRequestsTotal > 0 && <span className="badge-count" style={{ marginLeft: 6, background: '#6366f1', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{myRequestsTotal}</span>}
                        </button>
                        <button className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`} onClick={() => setActiveTab('request')}>Tạo yêu cầu</button>
                    </div>
                )}

                {isAdmin && activeTab === 'request' ? (
                    <AdminRequestForm categories={categories} onCreated={() => { loadMyRequests(); setActiveTab('myRequests'); }} />
                ) : isAdmin && activeTab === 'myRequests' ? (
                    <div>
                        {    }
                        <div className="filter-bar" style={{ marginBottom: 12 }}>
                            <div className="search-box" style={{ flex: 2 }}>
                                <i className="fa fa-search" />
                                <input className="input-search" placeholder="Tìm nhà cung cấp, sản phẩm, ghi chú..." value={requestParams.keyword}
                                    onChange={e => setRequestParams(p => ({ ...p, keyword: e.target.value, page: 1 }))} />
                            </div>
                            <select className="select-filter" value={requestParams.status}
                                onChange={e => setRequestParams(p => ({ ...p, status: e.target.value, page: 1 }))}>
                                <option value="">Tất cả trạng thái</option>
                                <option value="Pending">Đang chờ</option>
                                <option value="ApprovedBySupplier">NCC đã chấp nhận</option>
                                <option value="RejectedBySupplier">NCC từ chối</option>
                                <option value="ReceiptCreated">Đã tạo biên lai</option>
                                <option value="Completed">Hoàn thành</option>
                                <option value="Cancelled">Đã hủy</option>
                            </select>
                            <button className="btn btn-secondary btn-sm" onClick={loadMyRequests} disabled={myRequestsLoading}>
                                <i className={`fa ${myRequestsLoading ? 'fa-spinner fa-spin' : 'fa-refresh'}`} /> Làm mới
                            </button>
                        </div>

                        {    }
                        <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                            <table className="admin-table admin-table-compact">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nhà cung cấp</th>
                                        <th>Sản phẩm yêu cầu</th>
                                        <th style={{ textAlign: 'center' }}>SL</th>
                                        <th style={{ textAlign: 'right' }}>Giá đề xuất</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày tạo</th>
                                        <th style={{ textAlign: 'center', width: 100 }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myRequestsLoading ? (
                                        <tr><td colSpan="8" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                                    ) : myRequests.length === 0 ? (
                                        <tr><td colSpan="8" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Không có yêu cầu nào</td></tr>
                                    ) : myRequests.map(req => {
                                        const canCancel = Array.isArray(req.allowedActions) && req.allowedActions.includes('cancel');
                                        const productLabel = req.productName || req.requestedProductName || `Sản phẩm #${req.productId}`;
                                        const statusMap = {
                                            Pending: { label: 'Đang chờ', color: '#f59e0b' },
                                            ApprovedBySupplier: { label: 'NCC chấp nhận', color: '#10b981' },
                                            RejectedBySupplier: { label: 'NCC từ chối', color: '#f43f5e' },
                                            ReceiptCreated: { label: 'Đã tạo biên lai', color: '#6366f1' },
                                            Completed: { label: 'Hoàn thành', color: '#22c55e' },
                                            Cancelled: { label: 'Đã hủy', color: '#64748b' },
                                        };
                                        const s = statusMap[req.status] || { label: req.status, color: '#94a3b8' };
                                        return (
                                            <tr key={req.id} className="clickable-row" onClick={() => setSelectedRequest(req)}>
                                                <td className="id-column">#{req.id}</td>
                                                <td>
                                                    <div className="record-copy">
                                                        <span className="cust-name one-line">{req.supplierCompanyName || req.supplierName}</span>
                                                        <span className="cust-phone one-line">{req.categoryName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="record-summary">
                                                        {req.productImageUrl ? (
                                                            <img src={getImageUrl(req.productImageUrl)} alt="" className="record-thumb" onError={event => { event.currentTarget.style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="record-thumb-fallback" style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 18 }}><i className="fa fa-tag" /></div>
                                                        )}
                                                        <div className="record-copy">
                                                            <span className="cust-name one-line" style={{ maxWidth: 180 }}>{productLabel}</span>
                                                            <span className="cust-phone one-line">{req.productId ? `Mã SP: #${req.productId}` : 'Sản phẩm mới'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{req.quantity}</td>
                                                <td style={{ textAlign: 'right' }} className="price-text">{req.suggestedPrice > 0 ? formatVnd(req.suggestedPrice) : '—'}</td>
                                                <td><span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</span></td>
                                                <td>{formatAppDate(req.createdAt)}</td>
                                                <td className="action-btns" onClick={event => event.stopPropagation()}>
                                                    {canCancel && (
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleCancelRequest(req.id)}>
                                                            <i className="fa fa-times" /> Hủy
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {    }
                        {myRequestsTotal > requestParams.pageSize && (
                            <div className="pagination" style={{ marginTop: 12 }}>
                                <button className="btn btn-secondary btn-sm" disabled={requestParams.page <= 1}
                                    onClick={() => setRequestParams(p => ({ ...p, page: p.page - 1 }))}>
                                    <i className="fa fa-chevron-left" />
                                </button>
                                <span style={{ margin: '0 12px', color: '#94a3b8', fontSize: 13 }}>
                                    Trang {requestParams.page} / {Math.ceil(myRequestsTotal / requestParams.pageSize)}
                                </span>
                                <button className="btn btn-secondary btn-sm"
                                    disabled={requestParams.page >= Math.ceil(myRequestsTotal / requestParams.pageSize)}
                                    onClick={() => setRequestParams(p => ({ ...p, page: p.page + 1 }))}>
                                    <i className="fa fa-chevron-right" />
                                </button>
                            </div>
                        )}
                    </div>
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
                                        {categories.map(category => <option key={category.id} value={category.id}>{category.nameVi}</option>)}
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
                                        const allowedActions = getAllowedActions(receipt);
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
                                                        {allowedActions.includes('approve') && <button className="btn btn-success btn-sm" onClick={() => handleApprove(receipt.id)}>Duyệt</button>}
                                                        {allowedActions.includes('cancel') && <button className="btn btn-danger btn-sm" onClick={() => handleCancel(receipt.id)}>Hủy</button>}
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
                    </>
                )}
            </div>

            {selectedReceipt && <ReceiptDetailModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} onApprove={handleApprove} onReject={handleReject} onCancel={handleCancel} />}
            {showCreate && <CreateReceiptModal products={products} initialData={initialReceipt} onClose={() => { setShowCreate(false); setInitialReceipt(null); }} onSubmit={handleCreate} />}
        </div>
    );
};

export default Receipts;
