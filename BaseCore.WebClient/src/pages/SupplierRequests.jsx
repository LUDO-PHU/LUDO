import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierRequestApi, unwrapPagedData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { REQUEST_STATUS, formatVnd } from '../utils/display';
import '../styles/admin.css';

const RequestStatusBadge = ({ status }) => {
    const item = REQUEST_STATUS[status] || { label: status || 'Chưa xác định', badge: 'badge-pending' };
    return <span className={`badge ${item.badge}`}>{item.label}</span>;
};

const RequestDetailModal = ({ item, onClose, onApprove, onReject, onCreateReceipt }) => {
    if (!item) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={event => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết yêu cầu #{item.id}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-row"><span className="detail-label">Mã yêu cầu</span><span className="detail-value primary">#{item.id}</span></div>
                        <div className="detail-row"><span className="detail-label">Sản phẩm</span><span className="detail-value">{item.productName || item.requestedProductName || 'Yêu cầu sản phẩm mới'}</span></div>
                        <div className="detail-row"><span className="detail-label">Danh mục</span><span className="detail-value">{item.categoryName || 'Chưa phân loại'}</span></div>
                        <div className="detail-row"><span className="detail-label">Người tạo yêu cầu</span><span className="detail-value">{item.adminName || `#${item.adminId}`}</span></div>
                        <div className="detail-row"><span className="detail-label">Số lượng</span><span className="detail-value">{item.quantity}</span></div>
                        <div className="detail-row"><span className="detail-label">Giá đề xuất</span><span className="detail-value large danger">{formatVnd(item.suggestedPrice)}</span></div>
                        <div className="detail-row"><span className="detail-label">Ngày tạo</span><span className="detail-value">{formatAppDateTime(item.createdAt)}</span></div>
                        <div className="detail-row"><span className="detail-label">Trạng thái</span><RequestStatusBadge status={item.status} /></div>
                    </div>

                    <div className="detail-section">
                        <div className="section-title">Ghi chú</div>
                        <div className="detail-paragraph">{item.note || 'Không có ghi chú'}</div>
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
                    {item.status === 'Pending' && (
                        <>
                            <button className="btn btn-danger" onClick={() => onReject(item.id)}>Từ chối</button>
                            <button className="btn btn-success" onClick={() => onApprove(item.id)}>Duyệt</button>
                        </>
                    )}
                    {item.status === 'ApprovedBySupplier' && (
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
                        <input className="input-search" placeholder="Tìm sản phẩm hoặc yêu cầu..." value={params.keyword} onChange={event => setParams(prev => ({ ...prev, keyword: event.target.value, page: 1 }))} />
                    </div>
                    <select className="select-filter" value={params.status} onChange={event => setParams(prev => ({ ...prev, status: event.target.value, page: 1 }))}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(REQUEST_STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                    </select>
                    <input type="date" className="input-search" style={{ paddingLeft: 12 }} value={params.fromDate} onChange={event => setParams(prev => ({ ...prev, fromDate: event.target.value, page: 1 }))} />
                    <input type="date" className="input-search" style={{ paddingLeft: 12 }} value={params.toDate} onChange={event => setParams(prev => ({ ...prev, toDate: event.target.value, page: 1 }))} />
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
                            ) : requests.length > 0 ? requests.map(item => (
                                <tr key={item.id} className="clickable" onClick={() => setSelected(item)}>
                                    <td className="id-column">#{item.id}</td>
                                    <td>
                                        <div className="record-copy">
                                            <span className="cust-name one-line">{item.productName || item.requestedProductName || 'Yêu cầu sản phẩm mới'}</span>
                                            <span className="cust-phone one-line">Người tạo: {item.adminName || `#${item.adminId}`}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}><span className="qty">{item.quantity}</span></td>
                                    <td style={{ textAlign: 'right' }} className="price-text">{formatVnd(item.suggestedPrice)}</td>
                                    <td>{formatAppDate(item.createdAt)}</td>
                                    <td><RequestStatusBadge status={item.status} /></td>
                                    <td className="action-btns" onClick={event => event.stopPropagation()}>
                                        <div className="btn-group">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(item)}><i className="fa fa-eye" /> Xem chi tiết</button>
                                            {item.status === 'Pending' && <button className="btn btn-success btn-sm" onClick={() => approve(item.id)}>Duyệt</button>}
                                            {item.status === 'ApprovedBySupplier' && <button className="btn btn-primary btn-sm" onClick={() => createReceiptFromApproved(item)}>Tạo biên lai</button>}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="empty-state"><div className="empty-content"><i className="fa fa-envelope-open" /><p>Chưa có yêu cầu nào</p></div></td></tr>
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
