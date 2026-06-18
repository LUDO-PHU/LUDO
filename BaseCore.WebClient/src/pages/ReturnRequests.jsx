import React, { useCallback, useEffect, useState } from 'react';
import { returnRequestApi, orderApi, unwrapApiData } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate, formatAppDateTime } from '../utils/dateTime';
import { formatVnd } from '../utils/display';
import { getImageUrl } from '../data/fallbackCatalog';
import '../styles/admin.css';

const STATUS_VI = {
    0: 'Chờ xử lý',
    1: 'Đã chấp nhận',
    2: 'Đã từ chối'
};

const STATUS_COLORS = {
    0: '#f59e0b',  
    1: '#10b981',  
    2: '#ef4444'   
};

const STATUS_BG = {
    0: '#fef3c7',
    1: '#d1fae5',
    2: '#fee2e2'
};

const TYPE_VI = {
    0: 'Trả hàng',
    1: 'Đổi hàng'
};

const TYPE_COLORS = {
    0: '#ef4444',
    1: '#3b82f6'
};

const TYPE_BG = {
    0: '#fee2e2',
    1: '#dbeafe'
};

const DetailModal = ({ request, onClose, onActionSuccess }) => {
    const { showToast } = useToast();
    const [adminComment, setAdminComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderDetail, setOrderDetail] = useState(null);

    useEffect(() => {
        if (request?.orderId) {
            orderApi.getById(request.orderId)
                .then(res => setOrderDetail(unwrapApiData(res)))
                .catch(err => console.error("Error loading order detail:", err));
        }
    }, [request]);

    if (!request) return null;

    const handleProcess = async (approve) => {
        if (!adminComment.trim()) {
            showToast('Vui lòng nhập lý do phản hồi gửi khách hàng', 'danger');
            return;
        }

        setSubmitting(true);
        try {
            if (approve) {
                await returnRequestApi.approve(request.id, adminComment.trim());
                showToast('Đã chấp nhận yêu cầu đổi trả!', 'success');
            } else {
                await returnRequestApi.reject(request.id, adminComment.trim());
                showToast('Đã từ chối yêu cầu đổi trả!', 'success');
            }
            if (onActionSuccess) onActionSuccess();
            onClose();
        } catch (err) {
            showToast(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý', 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    const details = orderDetail?.details || orderDetail?.OrderDetails || [];

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Chi tiết yêu cầu #{request.id} - Đơn {request.orderCode}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>Thông tin yêu cầu</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Khách hàng:</span>
                                    <strong style={{ color: '#0f172a' }}>{request.customerName} ({request.username})</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Mã đơn hàng:</span>
                                    <strong style={{ color: '#0ea5e9' }}>{request.orderCode}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Tổng tiền đơn:</span>
                                    <strong style={{ color: '#ef4444' }}>{formatVnd(request.totalAmount)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Loại yêu cầu:</span>
                                    <span style={{ background: TYPE_BG[request.type], color: TYPE_COLORS[request.type], padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>{TYPE_VI[request.type]}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Trạng thái:</span>
                                    <span style={{ background: STATUS_BG[request.status], color: STATUS_COLORS[request.status], padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>{STATUS_VI[request.status]}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b', fontWeight: '600' }}>Ngày gửi yêu cầu:</span>
                                    <span style={{ color: '#0f172a', fontWeight: '500' }}>{formatAppDateTime(request.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>Lý do & Ảnh bằng chứng</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#334155', fontStyle: 'italic', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                                "{request.reason}"
                            </p>
                            {request.imageUrl ? (
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '6px' }}>Ảnh đính kèm:</div>
                                    <a href={getImageUrl(request.imageUrl)} target="_blank" rel="noreferrer" title="Click để phóng to ảnh">
                                        <img 
                                            src={getImageUrl(request.imageUrl)} 
                                            alt="Bằng chứng đổi trả" 
                                            style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'zoom-in', padding: '4px' }} 
                                        />
                                    </a>
                                </div>
                            ) : (
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Không có hình ảnh đính kèm</span>
                            )}
                        </div>
                    </div>

                    {    }
                    {details.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>Sản phẩm trong đơn</h4>
                            <table className="admin-table" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <thead>
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th style={{ textAlign: 'center' }}>SL</th>
                                        <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                        <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.imageUrl && <img src={getImageUrl(item.imageUrl)} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{item.productName || 'Sản phẩm'}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>×{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }}>{formatVnd(item.finalPrice || item.unitPrice)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>{formatVnd(item.totalPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {    }
                    {request.status === 0 ? (
                        <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '18px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>Phản hồi và Xử lý yêu cầu</h4>
                            <textarea
                                placeholder="Nhập lý do chấp nhận hoặc từ chối gửi cho khách hàng (thông tin này sẽ hiển thị nguyên văn trên chuông thông báo)..."
                                value={adminComment}
                                onChange={e => setAdminComment(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '80px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    marginBottom: '16px',
                                    resize: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
                                <button
                                    onClick={() => handleProcess(false)}
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        background: '#fee2e2',
                                        color: '#ef4444',
                                        border: '1px solid #fecaca',
                                        fontWeight: '800',
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ❌ Từ chối
                                </button>
                                <button
                                    onClick={() => handleProcess(true)}
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        background: '#d1fae5',
                                        color: '#10b981',
                                        border: '1px solid #a7f3d0',
                                        fontWeight: '800',
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    ✅ Chấp nhận Hoàn hàng
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 16px', borderLeft: `4px solid ${STATUS_COLORS[request.status]}` }}>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: STATUS_COLORS[request.status], marginBottom: '4px' }}>
                                Lịch sử phản hồi của Admin ({STATUS_VI[request.status]} lúc {request.processedAt ? formatAppDateTime(request.processedAt) : ''})
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>
                                "{request.adminComment || 'Không có bình luận'}"
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReturnRequests = () => {
    const { showToast } = useToast();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [params, setParams] = useState({
        keyword: '',
        status: '',
        fromDate: '',
        toDate: ''
    });
    const [localKw, setLocalKw] = useState('');

    const loadRequests = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const apiParams = {
                keyword: params.keyword || undefined,
                status: params.status !== '' ? Number(params.status) : undefined,
                fromDate: params.fromDate || undefined,
                toDate: params.toDate || undefined
            };
            const res = await returnRequestApi.getAll(apiParams);
            const data = unwrapApiData(res, []);
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            showToast('Lỗi khi tải danh sách yêu cầu đổi trả', 'danger');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [params, showToast]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (localKw !== params.keyword) {
                setParams(prev => ({ ...prev, keyword: localKw }));
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [localKw]);

    const filtered = requests;

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header">
                    <div className="admin-header-row">
                        <div>
                            <h2>Yêu cầu Trả hàng / Hoàn tiền</h2>
                            <p>Phê duyệt hoặc từ chối yêu cầu trả hàng và hoàn tiền của khách hàng</p>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => loadRequests(false)}>
                            <i className="fa fa-sync-alt" /> Làm mới
                        </button>
                    </div>
                </div>

                {   }
                {   }
                <div className="filter-bar" style={{ marginBottom: '20px' }}>
                    <div className="search-box">
                        <i className="fa fa-search" />
                        <input
                            type="text"
                            className="input-search"
                            placeholder="Tìm mã đơn, khách hàng, số điện thoại..."
                            value={localKw}
                            onChange={e => setLocalKw(e.target.value)}
                        />
                    </div>
                    
                    <select 
                        className="select-filter"
                        value={params.status} 
                        onChange={e => setParams(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="0">⏳ Chờ xử lý</option>
                        <option value="1">✅ Đã chấp nhận</option>
                        <option value="2">❌ Đã từ chối</option>
                    </select>

                    <div style={{ position: 'relative' }}>
                        <input 
                            type="date" 
                            className="input-search"
                            style={{ paddingLeft: '12px', paddingRight: '40px', colorScheme: 'dark' }} 
                            value={params.fromDate} 
                            onChange={e => setParams(prev => ({ ...prev, fromDate: e.target.value }))}
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="date" 
                            className="input-search"
                            style={{ paddingLeft: '12px', paddingRight: '40px', colorScheme: 'dark' }} 
                            value={params.toDate} 
                            onChange={e => setParams(prev => ({ ...prev, toDate: e.target.value }))}
                        />
                        <i className="fa fa-calendar" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {  }
                <div className="card table-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
                    <table className="admin-table">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ color: 'rgba(255,255,255,0.6)', padding: '14px' }}>Mã yêu cầu</th>
                                <th style={{ color: 'rgba(255,255,255,0.6)' }}>Mã đơn</th>
                                <th style={{ color: 'rgba(255,255,255,0.6)' }}>Khách hàng</th>

                                <th style={{ color: 'rgba(255,255,255,0.6)' }}>Lý do chi tiết</th>
                                <th style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'right' }}>Tổng tiền đơn</th>
                                <th style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.4)' }}>
                                        <i className="fa fa-sync-alt fa-spin" style={{ marginRight: '8px', fontSize: '20px' }} /> Đang tải danh sách yêu cầu...
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? filtered.map(req => (
                                <tr 
                                    key={req.id} 
                                    className="clickable" 
                                    onClick={() => setSelectedRequest(req)}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                >
                                    <td className="id-column" style={{ padding: '14px', fontWeight: '800' }}>#{req.id}</td>
                                    <td style={{ color: '#0ea5e9', fontWeight: '800' }}>{req.orderCode}</td>
                                    <td style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>
                                        {req.customerName}
                                        <small style={{ display: 'block', color: 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '500' }}>@{req.username}</small>
                                    </td>

                                    <td style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason}>
                                        {req.reason}
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: '800', fontSize: '13px' }}>
                                        {formatVnd(req.totalAmount)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ display: 'inline-block', background: STATUS_BG[req.status], color: STATUS_COLORS[req.status], padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                            {STATUS_VI[req.status]}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setSelectedRequest(req)} 
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #1e293b',
                                                background: '#1e293b',
                                                color: '#fff',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.background = '#334155'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = '#1e293b'; }}
                                        >
                                            {req.status === 0 ? '⏳ Xử lý ngay' : '🔍 Xem chi tiết'}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.4)' }}>
                                        <div style={{ fontSize: '15px' }}><i className="fa fa-box-open" style={{ marginRight: '8px', fontSize: '20px' }} />Chưa có yêu cầu nào phù hợp bộ lọc</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRequest && (
                <DetailModal 
                    request={selectedRequest} 
                    onClose={() => setSelectedRequest(null)} 
                    onActionSuccess={() => loadRequests(false)} 
                />
            )}
        </div>
    );
};

export default ReturnRequests;
