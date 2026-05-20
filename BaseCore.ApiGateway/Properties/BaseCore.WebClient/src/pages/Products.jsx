import React, { useState, useEffect } from 'react';
import { productApi, categoryApi } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import '../styles/admin.css';

const Products = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [total, setTotal] = useState(0);
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi');

    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    // Xác định quyền User
    const isSupplier = user?.userType === 2;
    const isAdmin = user?.userType === 1;

    // Khởi tạo Form rỗng
    const getEmptyForm = () => ({
        id: null,
        name: '',
        price: 0,
        oldPrice: 0,
        discountPercent: 0,
        categoryId: '',
        imageUrl: '',
        specifications: '',
        brand: 'EconentTech',
        status: 1,
        stock: 0,
        supplierId: isSupplier ? user.username : ''
    });

    const [form, setForm] = useState(getEmptyForm());

    const [params, setParams] = useState({
        page: 1,
        pageSize: 10,
        keyword: '',
        categoryId: '',
        status: ''
    });

    const t = {
        vi: {
            titleAdmin: "📦 Quản lý Sản phẩm",
            titleSupplier: "Sản phẩm của tôi",
            searchPlace: "Tìm tên, thông số...",
            colInfo: "Sản phẩm",
            colPrice: "Giá bán & Giảm giá",
            colStock: "Kho hàng",
            colStatus: "Trạng thái",
            colAction: "Thao tác",
            btnAdd: "+ Thêm sản phẩm",
            btnEdit: "Sửa",
            empty: "Không có sản phẩm nào.",
            stockWarn: "Lưu ý: Số lượng kho chỉ tăng tự động khi được duyệt qua Biên lai nhập hàng."
        },
        en: {
            titleAdmin: "Product Management",
            titleSupplier: "My Products",
            searchPlace: "Search name, specs...",
            colInfo: "Product Info",
            colPrice: "Price & Discount",
            colStock: "Stock",
            colStatus: "Status",
            colAction: "Action",
            btnAdd: "+ Add Product",
            btnEdit: "Edit",
            empty: "No products found.",
            stockWarn: "Note: Stock is only increased via Approved Receipts."
        }
    };

    const loadData = async () => {
        try {
            const queryParams = { ...params };
            if (isSupplier) queryParams.supplierId = user.username;

            const [pRes, cRes] = await Promise.all([
                productApi.search(queryParams),
                categoryApi.getAll()
            ]);

            setProducts(pRes.data.items || []);
            setTotal(pRes.data.totalCount || 0);
            setCategories(cRes.data || []);
        } catch (err) {
            showToast("Lỗi tải dữ liệu sản phẩm", "danger");
        }
    };

    useEffect(() => {
        loadData();
        const handleLangChange = () => setLang(localStorage.getItem('lang') || 'vi');
        window.addEventListener('storage', handleLangChange);
        return () => window.removeEventListener('storage', handleLangChange);
    }, [params]);

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
        try {
            await productApi.delete(id);
            showToast("Xóa thành công", "success");
            loadData();
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi xóa sản phẩm", "danger");
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setForm({ ...product, categoryId: product.categoryId || '' });
            setIsEdit(true);
        } else {
            setForm(getEmptyForm());
            setIsEdit(false);
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // LÀM SẠCH PAYLOAD: Ép kiểu dữ liệu và loại bỏ các Object thừa (như bảng Category đính kèm)
            const payload = {
                id: form.id || 0,
                name: form.name,
                price: Number(form.price),
                importPrice: Number(form.importPrice || 0), // Cho Entity mới
                oldPrice: Number(form.oldPrice || 0),
                discountPercent: Number(form.discountPercent || 0),
                categoryId: Number(form.categoryId),
                imageUrl: form.imageUrl || '',
                specifications: form.specifications || '',
                brand: form.brand || 'EconentTech',
                status: Number(form.status),
                stock: Number(form.stock || 0),
                supplierId: isSupplier ? user.username : (form.supplierId || '')
            };

            if (isEdit) {
                await productApi.update(payload.id, payload);
                showToast("Cập nhật thành công!", "success");
            } else {
                await productApi.create(payload);
                showToast("Thêm mới thành công!", "success");
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            console.error("Save error:", err);
            showToast("Có lỗi xảy ra khi lưu. Vui lòng kiểm tra lại thông tin.", "danger");
        }
    };

    // Hàm tự động tính toán Giá Bán dựa vào Giá Gốc và % Giảm Giá
    const handlePriceChange = (field, value) => {
        const newForm = { ...form, [field]: Number(value) };
        if (field === 'oldPrice' || field === 'discountPercent') {
            const oldP = field === 'oldPrice' ? Number(value) : Number(form.oldPrice || 0);
            const disc = field === 'discountPercent' ? Number(value) : Number(form.discountPercent || 0);
            newForm.price = oldP - (oldP * disc / 100);
        }
        setForm(newForm);
    };

    const formatVND = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="admin-layout">
            <div className="admin-container">

                {/* HEADER SẠCH SẼ */}
                <div className="admin-header" style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{isSupplier ? t[lang].titleSupplier : t[lang].titleAdmin}</h2>
                </div>

                {/* BỘ LỌC ĐƯỢC ÉP LÊN 1 DÒNG CÙNG VỚI NÚT THÊM */}
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
                            type="text"
                            placeholder={t[lang].searchPlace}
                            className="input-search"
                            style={{ margin: 0 }}
                            value={params.keyword}
                            onChange={(e) => setParams({ ...params, keyword: e.target.value, page: 1 })}
                        />
                    </div>
                    <select
                        className="select-filter"
                        style={{ width: '220px', flexShrink: 0, margin: 0 }}
                        value={params.categoryId}
                        onChange={(e) => setParams({ ...params, categoryId: e.target.value, page: 1 })}
                    >
                        <option value="">-- Tất cả danh mục --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        className="select-filter"
                        style={{ width: '180px', flexShrink: 0, margin: 0 }}
                        value={params.status}
                        onChange={(e) => setParams({ ...params, status: e.target.value, page: 1 })}
                    >
                        <option value="">-- Trạng thái --</option>
                        <option value="1">Đang bán</option>
                        <option value="2">Hết hàng</option>
                        <option value="3">Ngừng kinh doanh</option>
                        <option value="4">Đang nhập hàng</option>
                    </select>

                    <button
                        onClick={() => openModal()}
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0, margin: 0, height: '44px' }}
                    >
                        <i className="fa fa-plus"></i> {t[lang].btnAdd}
                    </button>
                </div>

                {/* BẢNG DỮ LIỆU */}
                <div className="table-responsive card">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>ID</th>
                                <th>{t[lang].colInfo}</th>
                                <th>{t[lang].colPrice}</th>
                                <th style={{ textAlign: 'center' }}>{t[lang].colStock}</th>
                                <th>{t[lang].colStatus}</th>
                                <th style={{ textAlign: 'center', width: '180px' }}>{t[lang].colAction}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map(p => (
                                    <tr key={p.id}>
                                        <td className="id-column">#{p.id}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} alt="img" style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '45px', height: '45px', borderRadius: '6px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className="fa fa-image" style={{ color: '#9ca3af' }}></i>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="cust-name" style={{ color: '#4f46e5', fontWeight: '700' }}>{p.name}</div>
                                                    <div className="cust-phone" style={{ marginTop: '4px' }}>{p.specifications || (p.brand ? `Hãng: ${p.brand}` : 'Chưa có thông số')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="price-text" style={{ fontSize: '15px' }}>{formatVND(p.price)}</div>
                                            {p.discountPercent > 0 && (
                                                <div style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'line-through', marginTop: '2px' }}>
                                                    {formatVND(p.oldPrice)} <span style={{ color: '#ef4444', textDecoration: 'none', marginLeft: '5px', fontWeight: 'bold' }}>(-{p.discountPercent}%)</span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${p.stock > 0 ? 'badge-delivered' : 'badge-cancelled'}`} style={{ fontSize: '13px', padding: '4px 10px' }}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${p.status === 1 ? 'badge-delivered' : p.status === 2 ? 'badge-pending' : p.status === 4 ? 'badge-shipping' : 'badge-cancelled'}`}>
                                                {p.status === 1 ? "Đang bán" : p.status === 2 ? "Hết hàng" : p.status === 4 ? "Đang nhập" : "Ngừng KD"}
                                            </span>
                                        </td>
                                        <td className="action-btns" style={{ textAlign: 'center' }}>
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={() => openModal(p)}
                                                >
                                                    <i className="fa fa-pen"></i> {t[lang].btnEdit}
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <div className="empty-content">
                                            <i className="fa fa-box-open"></i>
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
                                <button key={i} className={`btn-page ${params.page === i + 1 ? 'active' : ''}`} onClick={() => setParams({ ...params, page: i + 1 })}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL THÊM / SỬA SẢN PHẨM HOÀN CHỈNH */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '700px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', fontWeight: '700' }}>
                                {isEdit ? "✏️ Cập nhật sản phẩm" : "✨ Thêm sản phẩm mới"}
                            </h3>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Dòng 1: Tên sản phẩm & Danh mục */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Tên sản phẩm <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input className="input-search" style={inputStyle} value={form.name} required onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Danh mục <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <select className="select-filter" style={inputStyle} value={form.categoryId} required onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">-- Chọn --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Dòng 2: Giá Gốc, % Giảm, Giá Bán */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Giá gốc (VNĐ) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="number" className="input-search" style={inputStyle} value={form.oldPrice} required onChange={e => handlePriceChange('oldPrice', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>% Giảm giá</label>
                                    <input type="number" className="input-search" style={inputStyle} value={form.discountPercent} onChange={e => handlePriceChange('discountPercent', e.target.value)} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Giá bán thực tế</label>
                                    <input type="number" className="input-search" style={{ ...inputStyle, backgroundColor: '#f3f4f6', color: '#dc2626', fontWeight: 'bold' }} value={form.price} readOnly title="Giá này tự động tính toán" />
                                </div>
                            </div>

                            {/* Dòng 3: Thông số & Trạng thái */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Thông số / Phân loại</label>
                                    <input className="input-search" style={inputStyle} placeholder="VD: Pin dung lượng cao..." value={form.specifications} onChange={e => setForm({ ...form, specifications: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Trạng thái</label>
                                    <select className="select-filter" style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: Number(e.target.value) })}>
                                        <option value={1}>Đang bán</option>
                                        <option value={2}>Hết hàng</option>
                                        <option value={3}>Ngừng kinh doanh</option>
                                        <option value={4}>Đang nhập hàng</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dòng 4: Link Ảnh & Tồn kho */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Link Ảnh minh họa (URL)</label>
                                    <input className="input-search" style={inputStyle} placeholder="https://..." value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Tồn kho hiện tại</label>
                                    <input
                                        type="number"
                                        className="input-search"
                                        style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
                                        value={form.stock || 0}
                                        readOnly
                                        title="Chỉ tăng qua Duyệt Biên Lai"
                                    />
                                </div>
                            </div>

                            <small style={{ color: '#ef4444', display: 'block', marginBottom: '24px', fontStyle: 'italic', fontSize: '12px' }}>
                                <i className="fa fa-info-circle"></i> {t[lang].stockWarn}
                            </small>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" className="btn" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }} onClick={() => setShowModal(false)}>Hủy bỏ</button>
                                <button type="submit" className="btn btn-primary">Lưu sản phẩm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '10px 14px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #d1d5db', margin: 0 };

export default Products;