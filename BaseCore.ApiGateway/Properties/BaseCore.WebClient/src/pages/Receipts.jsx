import React, { useState, useEffect } from 'react';
import api, { productApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatAppDate } from '../utils/dateTime';
import '../styles/admin.css';

const Receipts = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [receipts, setReceipts] = useState([]);
    const [total, setTotal] = useState(0);
    const [myProducts, setMyProducts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi');

    // State cho Form tạo mới của Supplier
    const [form, setForm] = useState({
        productId: '',
        quantity: '',
        importPrice: '', // ĐÃ BỔ SUNG: Giá nhập
        imageUrl: '',
        specifications: ''
    });

    // State cho tìm kiếm và phân trang
    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        keyword: '',
        status: '',
        fromDate: '',
        toDate: ''
    });

    // Xác định Role
    const isAdmin = user?.userType === 1;
    const isSupplier = user?.userType === 2;

    // Hệ thống đa ngôn ngữ
    const t = {
        vi: {
            titleAdmin: "🧾 Duyệt Biên lai Nhập hàng",
            titleSupplier: "📦 Biên lai của tôi",
            searchPlace: "Tìm mã NCC, tên sản phẩm...",
            colSupplier: "Nhà CC",
            colProduct: "Sản phẩm",
            colQuantity: "Số lượng",
            colPrice: "Giá nhập",
            colStatus: "Trạng thái",
            colDate: "Ngày gửi",
            colAction: "Thao tác",
            statusPending: "Chờ duyệt",
            statusConfirmed: "Đã xác nhận",
            statusShipping: "Đang giao hàng",
            statusDelivered: "Đã nhập kho",
            statusRejected: "Đã hủy",
            btnApprove: "Xác nhận",
            btnShip: "Giao hàng",
            btnReject: "Hủy",
            btnCreate: "+ Tạo Biên Lai Mới",
            from: "Từ ngày",
            to: "Đến ngày",
            empty: "Không tìm thấy biên lai nào khớp với dữ liệu."
        },
        en: {
            titleAdmin: "🛡️ Approve Receipts",
            titleSupplier: "📦 My Receipts",
            searchPlace: "Search Supplier ID, Product...",
            colSupplier: "Supplier",
            colProduct: "Product",
            colQuantity: "Quantity",
            colPrice: "Import Price",
            colStatus: "Status",
            colDate: "Date",
            colAction: "Action",
            statusPending: "Pending",
            statusConfirmed: "Confirmed",
            statusShipping: "Shipping",
            statusDelivered: "Delivered",
            statusRejected: "Rejected",
            btnApprove: "Confirm",
            btnShip: "Ship",
            btnReject: "Reject",
            btnCreate: "+ New Receipt",
            from: "From Date",
            to: "To Date",
            empty: "No receipts found."
        }
    };

    const loadData = async () => {
        try {
            // Nhờ Backend xử lý phân quyền trong API /search, ta chỉ cần truyền params
            const res = await api.get('/receipts/search', { params });
            setReceipts(res.data.items || []);
            setTotal(res.data.totalCount || 0);

            // Nếu là Supplier, tải thêm danh sách sản phẩm để họ chọn khi tạo biên lai
            if (isSupplier) {
                // Giả định API search sản phẩm hỗ trợ lọc theo supplierId
                const pRes = await productApi.search({ supplierId: user.username, pageSize: 100 });
                setMyProducts(pRes.data.items || []);
            }
        } catch (err) {
            console.error(err);
            showToast("Lỗi tải danh sách biên lai", "danger");
        }
    };

    useEffect(() => {
        loadData();
        const handleLangChange = () => setLang(localStorage.getItem('lang') || 'vi');
        window.addEventListener('storage', handleLangChange);
        return () => window.removeEventListener('storage', handleLangChange);
    }, [params]);

    // Supplier: Gửi biên lai
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/receipts', {
                ...form,
                supplierId: user.username
            });
            showToast("Đã gửi biên lai thành công! Đang chờ Admin duyệt.", "success");
            setShowModal(false);
            // Reset form
            setForm({ productId: '', quantity: '', importPrice: '', imageUrl: '', specifications: '' });
            loadData();
        } catch (err) {
            showToast("Lỗi gửi biên lai", "danger");
        }
    };

    // Admin: Duyệt hoặc Từ chối biên lai
    const handleUpdateStatus = async (id, newStatus) => {
        const actionName = newStatus === 'Shipping' ? 'bắt đầu giao' : (newStatus === 'Confirmed' ? 'xác nhận' : 'từ chối');
        if (!window.confirm(`Bạn có chắc muốn ${actionName} biên lai này?`)) return;

        try {
            await api.put(`/receipts/${id}/status`, { status: newStatus });
            showToast(`Đã ${actionName} biên lai thành công!`, "success");
            loadData();
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi xử lý hệ thống", "danger");
        }
    };

    const formatVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="admin-layout">
            <div className="admin-container">
                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{isSupplier ? t[lang].titleSupplier : t[lang].titleAdmin}</h2>
                    {isSupplier && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            {t[lang].btnCreate}
                        </button>
                    )}
                </div>

                {/* BỘ LỌC ĐA TIÊU CHÍ */}
                <div className="filter-group card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr', gap: '15px', alignItems: 'end' }}>
                    <div className="search-box">
                        <i className="fa fa-search"></i>
                        <input
                            type="text"
                            placeholder={t[lang].searchPlace}
                            className="input-search"
                            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
                        />
                    </div>
                    <div className="status-box">
                        <select
                            className="select-filter"
                            style={{ width: '100%' }}
                            onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
                        >
                            <option value="">-- {t[lang].colStatus} --</option>
                            <option value="Pending">{t[lang].statusPending}</option>
                            <option value="Confirmed">{t[lang].statusConfirmed}</option>
                            <option value="Shipping">{t[lang].statusShipping}</option>
                            <option value="Delivered">{t[lang].statusDelivered}</option>
                            <option value="RejectedByAdmin">{t[lang].statusRejected}</option>
                        </select>
                    </div>
                    <div className="date-input" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <small style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{t[lang].from}</small>
                        <input
                            type="date"
                            className="input-search"
                            style={{ paddingLeft: '15px' }}
                            onChange={(e) => setParams({ ...params, fromDate: e.target.value, page: 1 })}
                        />
                    </div>
                    <div className="date-input" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <small style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{t[lang].to}</small>
                        <input
                            type="date"
                            className="input-search"
                            style={{ paddingLeft: '15px' }}
                            onChange={(e) => setParams({ ...params, toDate: e.target.value, page: 1 })}
                        />
                    </div>
                </div>

                {/* BẢNG DỮ LIỆU BIÊN LAI */}
                <div className="table-responsive card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '70px' }}>ID</th>
                                {isAdmin && <th>{t[lang].colSupplier}</th>}
                                <th>{t[lang].colProduct}</th>
                                <th>{t[lang].colQuantity}</th>
                                <th>{t[lang].colPrice}</th>
                                <th>{t[lang].colDate}</th>
                                <th>{t[lang].colStatus}</th>
                                {isAdmin && <th style={{ textAlign: 'center' }}>{t[lang].colAction}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {receipts.length > 0 ? (
                                receipts.map(r => (
                                    <tr key={r.id}>
                                        <td className="id-column">#{r.id}</td>
                                        {isAdmin && (
                                            <td style={{ fontWeight: 600, color: '#4b5563' }}>{r.supplierId}</td>
                                        )}
                                        <td>
                                            <div className="cust-name">{r.productName || `Sản phẩm #${r.productId}`}</div>
                                            {r.imageUrl && (
                                                <a href={r.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#4f46e5', textDecoration: 'none' }}>
                                                    <i className="fa fa-image"></i> Xem chứng từ
                                                </a>
                                            )}
                                        </td>
                                        <td><span className="qty" style={{ fontSize: '16px' }}>{r.quantity}</span></td>
                                        <td className="price-text">{formatVND(r.importPrice)}</td>
                                        <td style={{ fontSize: '13px', color: '#6b7280' }}>
                                            {formatAppDate(r.createdAt)}
                                        </td>
                                        <td>
                                            <span className={`badge ${r.status === 'Pending' ? 'badge-pending' :
                                                    r.status === 'Delivered' ? 'badge-delivered' : 'badge-cancelled'
                                                }`}>
                                                {t[lang][`status${r.status}`] || r.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="action-btns">
                                                {r.status === 'Pending' && (
                                                    <div className="btn-group">
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleUpdateStatus(r.id, 'Confirmed')}
                                                            title="Xác nhận lô hàng"
                                                        >
                                                            <i className="fa fa-check"></i> {t[lang].btnApprove}
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleUpdateStatus(r.id, 'RejectedByAdmin')}
                                                            title="Từ chối lô hàng"
                                                        >
                                                            <i className="fa fa-times"></i> {t[lang].btnReject}
                                                        </button>
                                                    </div>
                                                )}
                                                {r.status === 'Confirmed' && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleUpdateStatus(r.id, 'Shipping')}
                                                    >
                                                        <i className="fa fa-truck"></i> {t[lang].btnShip}
                                                    </button>
                                                )}
                                                {r.status === 'Shipping' && (
                                                    <div style={{ color: '#d97706', fontSize: '13px', fontWeight: 'bold' }}>
                                                        <i className="fa fa-clock"></i> Chờ nhập kho...
                                                    </div>
                                                )}
                                                {r.status === 'Delivered' && (
                                                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                                                        <i className="fa fa-lock"></i> Đã chốt
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isAdmin ? "8" : "7"} className="empty-state">
                                        <div className="empty-content">
                                            <i className="fa fa-file-invoice"></i>
                                            <p>{t[lang].empty}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PHÂN TRANG */}
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

            {/* MODAL TẠO BIÊN LAI (Chỉ dành cho Supplier) */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)} style={modalOverlayStyle}>
                    <div className="modal card" onClick={e => e.stopPropagation()} style={modalStyle}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Tạo biên lai nhập hàng</h3>
                            <button className="btn" style={{ background: 'none', color: '#6b7280', fontSize: '18px' }} onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Sản phẩm cung cấp</label>
                                <select className="select-filter" style={inputStyle} required onChange={e => setForm({ ...form, productId: e.target.value })}>
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {myProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Số lượng</label>
                                    <input type="number" className="input-search" style={inputStyle} placeholder="VD: 50" required min="1" onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Giá nhập (VNĐ)</label>
                                    <input type="number" className="input-search" style={inputStyle} placeholder="VD: 2800000" required min="0" onChange={e => setForm({ ...form, importPrice: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Link ảnh biên lai / Vận đơn</label>
                                <input type="url" className="input-search" style={inputStyle} placeholder="https://..." required onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Ghi chú thêm</label>
                                <textarea className="input-search" style={{ ...inputStyle, height: '80px', resize: 'none' }} placeholder="Ghi chú về lô hàng..." onChange={e => setForm({ ...form, specifications: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" className="btn" style={{ background: '#f3f4f6', color: '#374151' }} onClick={() => setShowModal(false)}>Hủy bỏ</button>
                                <button type="submit" className="btn btn-primary" style={{ background: '#4f46e5', color: 'white' }}>Gửi phê duyệt</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Inline styles nhẹ cho Modal (để tránh phải viết thêm CSS rườm rà)
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { width: '100%', maxWidth: '500px', padding: '24px', backgroundColor: 'white', borderRadius: '12px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px 12px', boxSizing: 'border-box' };

export default Receipts;
