import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, cartApi, reviewApi, orderApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppDate } from '../../utils/dateTime';
import { FALLBACK_PRODUCTS, getImageUrl as resolveImageUrl } from '../../data/fallbackCatalog';
import { goBackOrHome } from '../../utils/navigation';
const PLACEHOLDER = "https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image";
const API_BASE_URL = "http://localhost:5001";
const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    return resolveImageUrl(url, API_BASE_URL);
};

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isAuthenticated } = useAuth();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [canReview, setCanReview] = useState(false);
    const [myOrderForReview, setMyOrderForReview] = useState(null);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchProductData = async () => {
            try {
                setLoading(true);
                const res = await productApi.getById(id);
                const found = res.data?.data || res.data;
                setProduct(found);

                if (found && found.categoryId) {
                    const relatedRes = await productApi.search({ categoryId: found.categoryId, page: 1, pageSize: 5 });
                    const filteredRelated = (relatedRes.data?.items || []).filter(p => p.id !== found.id).slice(0, 4);
                    setRelatedProducts(filteredRelated);
                }

                // Tải đánh giá
                let reviewItems = [];
                try {
                    const reviewRes = await reviewApi.getByProduct(id);
                    reviewItems = reviewRes.data || [];
                    setReviews(reviewItems);
                } catch {
                    setReviews([]);
                }

                // Kiểm tra xem user có quyền đánh giá không
                if (isAuthenticated) {
                    try {
                        const orderRes = await orderApi.getMyOrders();
                        const completedOrders = (orderRes.data || []).filter(o => o.status === 'Completed');
                        const orderWithThisProduct = completedOrders.find(o =>
                            (o.details || o.Details || []).some(d => (d.productId || d.ProductId) == id)
                        );

                        if (orderWithThisProduct) {
                            const alreadyReviewed = (reviewItems || []).some(r => r.orderId === orderWithThisProduct.id && r.productId == id);
                            if (!alreadyReviewed) {
                                setCanReview(true);
                                setMyOrderForReview(orderWithThisProduct);
                            }
                        }
                    } catch {
                        setCanReview(false);
                        setMyOrderForReview(null);
                    }
                }
            } catch (err) {
                const fallbackProduct = FALLBACK_PRODUCTS.find(p => String(p.id) === String(id));
                if (fallbackProduct) {
                    setProduct(fallbackProduct);
                    setRelatedProducts(FALLBACK_PRODUCTS.filter(p => p.categoryId === fallbackProduct.categoryId && p.id !== fallbackProduct.id).slice(0, 4));
                    setReviews([]);
                    setCanReview(false);
                    setMyOrderForReview(null);
                    return;
                }

                showToast("Sản phẩm không tồn tại hoặc đã bị xóa", "danger");
                navigate('/customer/home');
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [id, navigate, showToast]);

    if (loading || !product) {
        return <div style={{ textAlign: 'center', padding: '100px', fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>Đang tải dữ liệu sản phẩm...</div>;
    }

    const finalPrice = Math.round(product.price * (1 - (product.discountPercent || 0) / 100));
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để thêm vào giỏ hàng!', 'warning');
            navigate('/login');
            return;
        }
        if (product.stock <= 0) return showToast('Sản phẩm đã hết hàng!', 'danger');
        if (addingToCart) return;

        setAddingToCart(true);
        try {
            const cartRes = await cartApi.getCart();
            const cartItems = cartRes.data?.data || [];
            const existing = cartItems.find(item => item.productId === product.id);
            if (existing) {
                await cartApi.updateItem(product.id, quantity);
            } else {
                await cartApi.addItem(product.id, quantity);
            }
            window.dispatchEvent(new Event('cart:changed'));
            showToast('Đã thêm vào giỏ hàng!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể thêm vào giỏ hàng', 'danger');
        } finally {
            setAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để mua hàng!', 'warning');
            navigate('/login');
            return;
        }
        if (product.stock <= 0) return showToast('Sản phẩm đã hết hàng!', 'danger');

        try {
            // Thêm vào cart DB trước, rồi chuyển sang Checkout với chỉ sản phẩm này
            await cartApi.addItem(product.id, quantity);
            window.dispatchEvent(new Event('cart:changed'));
            // Lưu productId vào sessionStorage để Checkout lọc đúng sản phẩm
            sessionStorage.setItem('checkout_selected_product_ids', JSON.stringify([product.id]));
            navigate('/customer/checkout');
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xử lý, vui lòng thử lại', 'danger');
        }
    };

    const handleQuantityChange = (value) => {
        const maxStock = Math.max(1, Number(product.stock || 1));
        const nextValue = Number.parseInt(value, 10);
        if (Number.isNaN(nextValue)) {
            setQuantity(1);
            return;
        }
        setQuantity(Math.min(maxStock, Math.max(1, nextValue)));
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (submittingReview) return;
        setSubmittingReview(true);
        try {
            await reviewApi.create({
                productId: parseInt(id),
                orderId: myOrderForReview.id,
                rating: newReview.rating,
                comment: newReview.comment
            });
            showToast("Gửi đánh giá thành công!", "success");
            setCanReview(false);
            // Reload reviews
            const reviewRes = await reviewApi.getByProduct(id);
            setReviews(reviewRes.data || []);
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi khi gửi đánh giá", "danger");
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

            <div style={{ padding: '15px 30px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#64748b' }}>
                <span style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0ea5e9' }} onClick={() => goBackOrHome(navigate)}>← Quay lại</span> / Chi tiết sản phẩm / {product.nameVi || product.name}
            </div>

            {/* THÔNG TIN CHÍNH */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', padding: '40px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    {product.discountPercent > 0 && (
                        <span style={{ position: 'absolute', top: '20px', left: '20px', background: '#ef4444', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '18px', zIndex: 10 }}>
                            GIẢM {product.discountPercent}%
                        </span>
                    )}
                    <img src={getImageUrl(product.imageUrl)} alt={product.nameVi || product.name} style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', background: 'transparent' }} onError={e => e.target.src = PLACEHOLDER} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#1e293b' }}>{product.nameVi || product.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '20px' }}>
                        <span style={{ background: product.stock > 0 ? '#dcfce7' : '#fee2e2', color: product.stock > 0 ? '#166534' : '#991b1b', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                            {product.stock > 0 ? `Còn hàng (${product.stock})` : "Hết hàng"}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '14px' }}>Nhà cung cấp: <strong>{product.supplierId || "Hệ thống"}</strong></span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: '#dc2626' }}>
                            {fmt(finalPrice)}
                            {product.discountPercent > 0 && <span style={{ fontSize: '20px', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '15px', fontWeight: 'normal' }}>{fmt(product.price)}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '30px' }}>
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>Thương hiệu</p>
                            <span style={{ padding: '8px 20px', border: '2px solid #0ea5e9', borderRadius: '8px', color: '#0ea5e9', fontWeight: 'bold' }}>{product.brand || "EconentTech"}</span>
                        </div>
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>Tình trạng</p>
                            <span style={{ padding: '8px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f1f5f9', fontWeight: 'bold', color: '#334155' }}>{product.condition || 'Mới 100%'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                        <p style={{ fontWeight: 'bold', margin: 0, color: '#475569' }}>Số lượng:</p>
                        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '10px 20px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>-</button>
                            <input type="number" min="1" max={product.stock || 1} value={quantity} onChange={event => handleQuantityChange(event.target.value)} style={{ width: '78px', textAlign: 'center', border: 'none', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '16px' }} />
                            <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} style={{ padding: '10px 20px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>+</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button onClick={handleAddToCart} disabled={product.stock <= 0 || addingToCart} style={{ flex: 1, padding: '18px', background: '#fef08a', color: '#166534', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '900', cursor: (product.stock > 0 && !addingToCart) ? 'pointer' : 'not-allowed', opacity: addingToCart ? 0.7 : 1 }}>
                            {addingToCart ? '⏳ Đang thêm...' : '🛒 THÊM VÀO GIỎ'}
                        </button>
                        <button onClick={handleBuyNow} disabled={product.stock <= 0} style={{ flex: 1, padding: '18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '900', cursor: product.stock > 0 ? 'pointer' : 'not-allowed' }}>
                            ⚡ MUA NGAY
                        </button>
                    </div>
                </div>
            </div>

            {/* MÔ TẢ CHI TIẾT */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px', padding: '40px', background: '#f8fafc', borderTop: '1px solid #eee' }}>
                <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #0ea5e9', display: 'inline-block' }}>Đặc điểm nổi bật</h3>
                    <div style={{ lineHeight: '1.8', color: '#334155', fontSize: '16px', whiteSpace: 'pre-line' }}>{product.descriptionVi || product.description || "Nhà cung cấp chưa cập nhật bài viết mô tả chi tiết cho sản phẩm này."}</div>
                </div>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Thông số kỹ thuật</h3>
                    <div style={{ lineHeight: '1.8', color: '#475569', fontSize: '15px', whiteSpace: 'pre-line' }}>{product.specifications || "Đang cập nhật thông số..."}</div>
                </div>
            </div>

            {/* PHẦN ĐÁNH GIÁ */}
            <div style={{ padding: '40px', borderTop: '1px solid #eee' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '30px' }}>Khách hàng đánh giá</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
                    <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', textAlign: 'center', height: 'fit-content' }}>
                        <div style={{ fontSize: '48px', fontWeight: '900', color: '#ca8a04' }}>{product.averageRating || 0}/5</div>
                        <div style={{ fontSize: '20px', color: '#fbbf24', margin: '10px 0' }}>
                            {"★".repeat(Math.round(product.averageRating || 0)) + "☆".repeat(5 - Math.round(product.averageRating || 0))}
                        </div>
                        <div style={{ color: '#64748b', fontWeight: 'bold' }}>{reviews.length} nhận xét</div>
                    </div>

                    <div>
                        {canReview && (
                            <div style={{ marginBottom: '40px', padding: '25px', background: '#fff', border: '2px solid #0ea5e9', borderRadius: '16px' }}>
                                <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '800' }}>Viết đánh giá của bạn</h4>
                                <form onSubmit={handleSubmitReview}>
                                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontWeight: 'bold' }}>Số sao:</span>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} 
                                                      onClick={() => setNewReview({ ...newReview, rating: s })}
                                                      style={{ fontSize: '24px', cursor: 'pointer', color: s <= newReview.rating ? '#fbbf24' : '#cbd5e1' }}>
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea 
                                        required
                                        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                                        style={{ width: '100%', height: '100px', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', resize: 'none' }}
                                        value={newReview.comment}
                                        onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                    />
                                    <button type="submit" disabled={submittingReview} style={{ padding: '12px 30px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {reviews.length === 0 ? (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>Chưa có đánh giá nào cho sản phẩm này.</p>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{r.userName}</span>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{formatAppDate(r.createdAt)}</span>
                                        </div>
                                        <div style={{ color: '#fbbf24', marginBottom: '8px' }}>{"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}</div>
                                        <p style={{ margin: 0, color: '#334155', lineHeight: '1.6' }}>{r.comment}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SẢN PHẨM TƯƠNG TỰ */}
            {relatedProducts.length > 0 && (
                <div style={{ padding: '40px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '30px', textAlign: 'center' }}>SẢN PHẨM CÙNG DANH MỤC</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {relatedProducts.map(rp => (
                            <Link to={`/customer/products/${rp.id}`} key={rp.id} style={{ textDecoration: "none" }}>
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <img src={getImageUrl(rp.imageUrl)} alt={rp.nameVi || rp.name} style={{ width: '100%', height: '180px', objectFit: 'contain', marginBottom: '15px', background: '#fff', borderRadius: '8px', padding: '5px' }} onError={e => e.target.src = PLACEHOLDER} />
                                    <h4 style={{ fontSize: '15px', margin: '0 0 10px 0', color: '#1e293b', height: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{rp.nameVi || rp.name}</h4>
                                    <div style={{ color: '#0ea5e9', fontWeight: '900', fontSize: '18px' }}>{fmt(rp.price * (1 - (rp.discountPercent || 0) / 100))}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;
