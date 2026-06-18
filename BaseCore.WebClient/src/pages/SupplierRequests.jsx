import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierRequestApi, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getImageUrl } from '../data/fallbackCatalog';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { REQUEST_STATUS, formatVnd } from '../utils/display';
import '../styles/admin.css';

const RequestStatusBadge = ({ status }) => {
    const item = REQUEST_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const getAllowedActions = (item) => item?.allowedActions || item?.AllowedActions || [];

const RequestDetailModal = ({ item, onClose, onApprove, onReject, onCreateReceipt }) => {
    if (!item) return null;
    const allowedActions = getAllowedActions(item);
    const productLabel = item.productName || item.requestedProductName || `Sản phẩm #${item.productId}`;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-md" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết yêu cầu #{item.id}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row"><span className="detail-label">Mã yêu cầu</span><span className="detail-value primary">#{item.id}</span></div>
                        <div className="detail-row"><span className="detail-label">Danh mục</span><span className="detail-value">{item.categoryName || 'Chưa phân loại'}</span></div>
                        <div className="detail-row"><span className="detail-label">Người tạo yêu cầu</span><span className="detail-value">{item.adminName || 'Quản trị viên'}</span></div>
                        <div className="detail-row"><span className="detail-label">Ngày tạo</span><span className="detail-value">{formatAppDateTime(item.createdAt)}</span></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái</span><RequestStatusBadge status={item.status} /></div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Thông tin sản phẩm yêu cầu</div>
                        <div className="detail-row receipt-product-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
                            <div className="record-summary">
                                {item.productImageUrl ? (
                                    <img src={getImageUrl(item.productImageUrl)} alt="" className="record-thumb" style={{ width: 60, height: 60, borderRadius: 8 }} onError={event => { event.currentTarget.style.display = 'none'; }} />
                                ) : (
                                    <div className="record-thumb-fallback" style={{ width: 60, height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 24 }}><i className="fa fa-tag" /></div>
                                )}
                                <div className="record-copy" style={{ marginLeft: 12 }}>
                                    <span className="cust-name" style={{ fontSize: 15, fontWeight: 600 }}>{productLabel}</span>
                                    <span className="cust-phone" style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{item.productId ? `Mã sản phẩm: #${item.productId}` : 'Sản phẩm mới (nhập tay)'}</span>
                                </div>
                            </div>
                            <div className="detail-grid" style={{ marginTop: 14 }}>
                                <div>
                                    <span className="detail-label">Số lượng yêu cầu</span>
                                    <span className="detail-value large">{item.quantity}</span>
                                </div>
                                <div>
                                    <span className="detail-label">Giá đề xuất</span>
                                    <span className="detail-value danger">{item.suggestedPrice > 0 ? formatVnd(item.suggestedPrice) : '—'}</span>
                                </div>
                                <div>
                                    <span className="detail-label">Thành tiền tạm tính</span>
                                    <span className="detail-value danger" style={{ fontWeight: 700 }}>{item.suggestedPrice > 0 ? formatVnd(item.quantity * item.suggestedPrice) : '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Ghi chú từ quản trị viên</div>
                        <div className="detail-paragraph" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 8, borderLeft: '3px solid #6366f1' }}>{item.note || 'Không có ghi chú'}</div>
                    </div>

                    {item.rejectionReason && (
                        <div className="detail-section">
                            <div className="section-title">Lý do từ chối</div>
                            <div className="detail-paragraph">{item.rejectionReason}</div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                    {(allowedActions.includes('approve') || allowedActions.includes('reject')) && (
                        <>
                            {allowedActions.includes('reject') && <button className="btn btn-danger" onClick={() => onReject(item.id)}>Từ chối</button>}
                            {allowedActions.includes('approve') && <button className="btn btn-success" onClick={() => onApprove(item.id)}>Duyệt</button>}
                        </>
                    )}
                    {allowedActions.includes('createReceipt') && (
                        <button className="btn btn-primary" onClick={() => onCreateReceipt(item)}>Tạo biên lai</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const SupplierRequests = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [params, setParams] = useState({ page: 1, pageSize: 10, keyword: '', status: '', fromDate: '', toDate: '' });
    const [localKw, setLocalKw] = useState(params.keyword);

    useEffect(() => {
        setLocalKw(params.keyword);
    }, [params.keyword]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localKw !== params.keyword) {
                setParams(prev => ({ ...prev, keyword: localKw, page: 1 }));
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localKw]);

    const totalPages = useMemo(() => Math.ceil(total / params.pageSize) || 1, [total, params.pageSize]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await supplierRequestApi.searchSupplier({
                ...params,
                keyword: params.keyword || undefined,
                status: params.status || undefined,
                fromDate: params.fromDate || undefined,
                toDate: params.toDate || undefined,
            });
            const paged = unwrapPagedData(res);
            setRequests(paged.items);
            setTotal(paged.totalCount);
        } catch (err) {
            showToast(err.response?.data?.message || 'Không tải được danh sách yêu cầu', 'danger');
        } finally {
            setLoading(false);
        }
    }, [params, showToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const approve = async (id) => {
        try {
            const res = await supplierRequestApi.approve(id);
            const data = res.data?.data;
            showToast('Đã duyệt yêu cầu, chuyển sang tạo biên lai', 'success');
            setSelected(null);
            navigate('/admin/receipts', { state: { createReceipt: data } });
        } catch (err) {
            showToast(err.response?.data?.message || 'Không duyệt được yêu cầu', 'danger');
        }
    };

    const reject = async (id) => {
        const reason = window.prompt('Lý do từ chối yêu cầu:') || '';
        try {
            await supplierRequestApi.reject(id, reason);
            showToast('Đã từ chối yêu cầu', 'success');
            setSelected(null);
            loadData();
        } catch (err) {
            showToast(err.response?.data?.message || 'Không từ chối được yêu cầu', 'danger');
        }
    };

    const createReceiptFromApproved = (item) => {
        navigate('/admin/receipts', {
            state: {
                createReceipt: {
                    requestId: item.id,
                    productId: item.productId,
                    productName: item.productName,
                    requestedProductName: item.requestedProductName,
                    quantity: item.quantity,
                    suggestedPrice: item.suggestedPrice,
                    receiptType: 'RequestedReceipt',
                    note: item.note,
                },
            },
        });
    };

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <h2>Yêu cầu từ quản trị</h2>
                    <p>Tổng cộng <strong>{total}</strong> yêu cầu</p>
                </div>

                <div className="filter-bar">
                    <div className="search-box" style={{ flex: 2 }}>
                        <i className="fa fa-search" />
                        <input className="input-search" placeholder="Tìm sản phẩm hoặc yêu cầu..." value={localKw} onChange={event => setLocalKw(event.target.value)} />
                    </div>
                    <select className="select-filter" value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(REQUEST_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </select>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="date" 
                            className="input-search" 
                            style={{ paddingLeft: '12px', paddingRight: '40px', colorScheme: 'dark' }} 
                            value={params.fromDate} 
                            onChange={event => setParams(prev => ({ ...prev, fromDate: event.target.value, page: 1 }))} 
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="date" 
                            className="input-search" 
                            style={{ paddingLeft: '12px', paddingRight: '40px', colorScheme: 'dark' }} 
                            value={params.toDate} 
                            onChange={event => setParams(prev => ({ ...prev, toDate: event.target.value, page: 1 }))} 
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                    </div>
                </div>

                <div className="table-responsive card compact-table-card" style={{ padding: 0 }}>
                    <table className="admin-table admin-table-compact supplier-request-table">
                        <thead>
                            <tr>
                                <th>Mã yêu cầu</th>
                                <th>Sản phẩm / yêu cầu</th>
                                <th style={{ textAlign: 'center' }}>Số lượng</th>
                                <th style={{ textAlign: 'right' }}>Giá đề xuất</th>
                                <th>Ngày tạo</th>
                                <th>Trạng thái</th>
                                <th style={{ width: 230, textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}><i className="fa fa-spinner fa-spin" style={{ fontSize: 24 }} /></td></tr>
                            ) : requests.length > 0 ? requests.map(item => {
                                const allowedActions = getAllowedActions(item);
                                return (
                                <tr key={item.id} className="clickable" onClick={() => setSelected(item)}>
                                    <td className="id-column">#{item.id}</td>
                                    <td>
                                        <div className="record-summary">
                                            {item.productImageUrl ? (
                                                <img src={getImageUrl(item.productImageUrl)} alt="" className="record-thumb" onError={event => { event.currentTarget.style.display = 'none'; }} />
                                            ) : (
                                                <div className="record-thumb-fallback" style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 18 }}><i className="fa fa-tag" /></div>
                                            )}
                                            <div className="record-copy">
                                                <span className="cust-name one-line" style={{ maxWidth: 180 }}>{item.productName || item.requestedProductName || 'Yêu cầu sản phẩm mới'}</span>
                                                <span className="cust-phone one-line">{item.productId ? `Mã SP: #${item.productId}` : `Người tạo: ${item.adminName || 'Quản trị viên'}`}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}><span className="qty">{item.quantity}</span></td>
                                    <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(item.suggestedPrice)}</td>
                                    <td>{formatAppDate(item.createdAt)}</td>
                                    <td><RequestStatusBadge status={item.status} /></td>
                                    <td className="action-btns" onClick={event => event.stopPropagation()}>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(item)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                            {allowedActions.includes('approve') && <button className="btn btn-success btn-sm" onClick={() => approve(item.id)}>Duyệt</button>}
                                            {allowedActions.includes('createReceipt') && <button className="btn btn-primary btn-sm" onClick={() => createReceiptFromApproved(item)}>Tạo biên lai</button>}
                                        </div>
                                    </td>
                                </tr>
                                );
                            }) : (
                                <tr><td colSpan="7" className="empty-state"><div className="empty-content"><i className="fa fa-envelope-open" /><p>Chưa có yêu cầu nào</p></div></td></tr>
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

            {selected && (
                <RequestDetailModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    onApprove={approve}
                    onReject={reject}
                    onCreateReceipt={createReceiptFromApproved}
                />
            )}
        </div>
    );
};

export default SupplierRequests;
