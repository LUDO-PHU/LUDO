import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, cartApi, reviewApi, unwrapApiData, unwrapPagedData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppDate } from '../../utils/dateTime';
import { getImageUrl as resolveImageUrl } from '../../data/fallbackCatalog';
import { goBackOrHome } from '../../utils/navigation';
import { getMainImage, getProductImages } from '../../utils/display';
const PLACEHOLDER = "images/multi/Error.png";
const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER;
    return resolveImageUrl(url);
};

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user, isAuthenticated } = useAuth();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchProductData = async () => {
            try {
                setLoading(true);
                const res = await productApi.getById(id);
                const found = unwrapApiData(res);
                setProduct(found);
                setSelectedImageIndex(0);

                if (found && found.categoryId) {
                    const relatedRes = await productApi.search({ categoryId: found.categoryId, page: 1, pageSize: 5 });
                    const filteredRelated = unwrapPagedData(relatedRes).items.filter(p => p.id !== found.id).slice(0, 4);
                    setRelatedProducts(filteredRelated);
                }

                let reviewItems = [];
                try {
                    const reviewRes = await reviewApi.getByProduct(id);
                    reviewItems = unwrapApiData(reviewRes, []);
                    setReviews(Array.isArray(reviewItems) ? reviewItems : []);
                } catch {
                    setReviews([]);
                }

            } catch (err) {
                showToast("Sản phẩm không tồn tại hoặc đã bị xóa", "danger");
                navigate('/customer/home');
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [id, navigate, showToast]);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) {
            setNewReview({ rating: 5, comment: '' });
            return;
        }

        const ownReview = reviews.find(item => Number(item.userId ?? item.UserId) === Number(user.id));
        if (!ownReview) {
            setNewReview({ rating: 5, comment: '' });
            return;
        }

        setNewReview({
            rating: Number(ownReview.rating ?? ownReview.Rating ?? 5),
            comment: ownReview.comment ?? ownReview.Comment ?? ''
        });
    }, [reviews, isAuthenticated, user?.id]);

    if (loading || !product) {
        return <div style={{ textAlign: 'center', padding: '100px', fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>Đang tải dữ liệu sản phẩm...</div>;
    }

    const finalPrice = Number(product.finalPrice ?? product.FinalPrice ?? product.price ?? 0);
    const isAvailable = Boolean(product.isAvailable ?? product.IsAvailable);
    const availabilityText = product.availabilityText ?? product.AvailabilityText ?? '';
    const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
    const productImages = getProductImages(product);
    if (productImages.length === 0) productImages.push(getMainImage(product));
    const safeImageIndex = Math.min(selectedImageIndex, Math.max(productImages.length - 1, 0));
    const selectedImage = productImages[safeImageIndex] || product.imageUrl;
    const canSlideImages = productImages.length > 1;
    const canWriteReview = isAuthenticated && (String(user?.role || '').toLowerCase() === 'user' || Number(user?.userType) === 0);
    const currentUserReview = reviews.find(item => Number(item.userId ?? item.UserId) === Number(user?.id));

    const moveImage = (step) => {
        if (!canSlideImages) return;
        setSelectedImageIndex(prev => (prev + step + productImages.length) % productImages.length);
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để thêm vào giỏ hàng!', 'warning');
            navigate('/login');
            return;
        }
        if (!isAvailable) return showToast('Sản phẩm đã hết hàng!', 'danger');
        if (addingToCart) return;

        setAddingToCart(true);

        try {
            await cartApi.addItem(product.id, quantity, selectedImage);
            window.dispatchEvent(new Event('cart:changed'));
            showToast('Đã thêm vào giỏ hàng!', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể thêm vào giỏ hàng', 'danger');
        } finally {
            setAddingToCart(false);
        }
    };

    const handleQuantityChange = (value) => {
        const nextValue = Number.parseInt(value, 10);
        if (Number.isNaN(nextValue)) {
            setQuantity(1);
            return;
        }
        setQuantity(Math.max(1, nextValue));
    };

    const handleBuyNow = async () => {
        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để mua hàng!', 'warning');
            navigate('/login');
            return;
        }
        if (!isAvailable) return showToast('Sản phẩm đã hết hàng!', 'danger');

        try {
            const res = await cartApi.getCart();
            const cartItems = res.data?.data || [];
            const existingItem = cartItems.find(item => item.productId === product.id);

            if (existingItem) {
                await cartApi.updateItem(product.id, quantity);
            } else {
                await cartApi.addItem(product.id, quantity, selectedImage);
            }

            window.dispatchEvent(new Event('cart:changed'));
            sessionStorage.setItem('checkout_selected_product_ids', JSON.stringify([product.id]));
            navigate('/customer/checkout');
        } catch (err) {
            showToast(err.response?.data?.message || 'Không thể xử lý, vui lòng thử lại', 'danger');
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (submittingReview) return;
        if (!canWriteReview) {
            showToast('Vui lòng đăng nhập bằng tài khoản khách hàng để đánh giá sản phẩm', 'warning');
            if (!isAuthenticated) navigate('/login');
            return;
        }
        setSubmittingReview(true);
        try {
            await reviewApi.create({
                productId: parseInt(id),
                rating: newReview.rating,
                comment: newReview.comment
            });
            showToast(currentUserReview ? 'Cập nhật đánh giá thành công!' : 'Gửi đánh giá thành công!', 'success');
            setNewReview({ rating: 5, comment: '' });
            const reviewRes = await reviewApi.getByProduct(id);
            const reviewItems = unwrapApiData(reviewRes, []);
            const normalizedReviews = Array.isArray(reviewItems) ? reviewItems : [];
            setReviews(normalizedReviews);
            const averageRating = normalizedReviews.length
                ? Math.round((normalizedReviews.reduce((sum, item) => sum + Number(item.rating ?? item.Rating ?? 0), 0) / normalizedReviews.length) * 10) / 10
                : 0;
            setProduct(prev => prev ? {
                ...prev,
                averageRating,
                AverageRating: averageRating,
                reviewCount: normalizedReviews.length,
                ReviewCount: normalizedReviews.length,
                canReview: true,
                CanReview: true
            } : prev);
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi khi gửi đánh giá", "danger");
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <div className="product-detail-shell" style={{ maxWidth: '1200px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

            <div style={{ padding: '15px 30px', borderBottom: '1px solid #eee', fontSize: '14px', color: '#64748b' }}>
                <span style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0ea5e9' }} onClick={() => goBackOrHome(navigate)}>← Quay lại</span> / Chi tiết sản phẩm / {product.nameVi || product.name}
            </div>

            {    }
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', padding: '40px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch', gap: '14px', position: 'relative', minWidth: 0 }}>
                    {product.discountPercent > 0 && (
                        <span style={{ position: 'absolute', top: '20px', left: '20px', background: '#ef4444', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '18px', zIndex: 10 }}>
                            GIẢM {product.discountPercent}%
                        </span>
                    )}
                    <div style={{ position: 'relative', minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {canSlideImages && (
                            <button type="button" aria-label="Ảnh trước" onClick={() => moveImage(-1)} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: '1px solid #cbd5e1', background: 'rgba(255,255,255,0.92)', color: '#0f172a', fontWeight: 900, zIndex: 2 }}>
                                ‹
                            </button>
                        )}
                        <img src={getImageUrl(selectedImage)} alt={product.nameVi || product.name} style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', background: 'transparent' }} onError={e => e.target.src = PLACEHOLDER} />
                        {canSlideImages && (
                            <button type="button" aria-label="Ảnh sau" onClick={() => moveImage(1)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, borderRadius: '50%', border: '1px solid #cbd5e1', background: 'rgba(255,255,255,0.92)', color: '#0f172a', fontWeight: 900, zIndex: 2 }}>
                                ›
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '10px' }}>
                        {productImages.map((url, index) => (
                            <button
                                type="button"
                                key={`${url}-${index}`}
                                onClick={() => setSelectedImageIndex(index)}
                                style={{
                                    border: index === safeImageIndex ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    padding: '4px',
                                    background: '#fff',
                                    minHeight: 72,
                                    boxShadow: index === safeImageIndex ? '0 0 0 3px rgba(14,165,233,0.18)' : 'none',
                                }}
                            >
                                <img src={getImageUrl(url)} alt="" style={{ width: '100%', height: 62, objectFit: 'cover', borderRadius: '7px', display: 'block' }} onError={e => e.currentTarget.src = PLACEHOLDER} />
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#1e293b' }}>{product.nameVi || product.name}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '20px' }}>
                        <span style={{ background: isAvailable ? '#dcfce7' : '#fee2e2', color: isAvailable ? '#166534' : '#991b1b', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                            {availabilityText || (isAvailable ? 'Còn hàng' : 'Hết hàng')}
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
                            <input type="number" min="1" value={quantity} onChange={event => handleQuantityChange(event.target.value)} style={{ width: '78px', textAlign: 'center', border: 'none', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '16px' }} />
                            <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '10px 20px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>+</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <button onClick={handleAddToCart} disabled={!isAvailable || addingToCart} style={{ flex: 1, padding: '18px', background: '#fef08a', color: '#166534', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '900', cursor: (isAvailable && !addingToCart) ? 'pointer' : 'not-allowed', opacity: addingToCart ? 0.7 : 1 }}>
                            {addingToCart ? '⏳ Đang thêm...' : '🛒 THÊM VÀO GIỎ'}
                        </button>
                        <button onClick={handleBuyNow} disabled={!isAvailable} style={{ flex: 1, padding: '18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '900', cursor: isAvailable ? 'pointer' : 'not-allowed' }}>
                            ⚡ MUA NGAY
                        </button>
                    </div>
                </div>
            </div>

            {     }
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

            {    }
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
                        <div style={{ marginBottom: '40px', padding: '25px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#475569' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Đánh giá sản phẩm</h4>
                            <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6' }}>
                                Để đánh giá sản phẩm này, vui lòng truy cập <strong><Link to="/customer/orders" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold' }}>Đơn hàng của tôi</Link></strong>, tìm đơn hàng chứa sản phẩm đã nhận thành công và nhấn <strong>Đánh giá</strong>. Mỗi lượt mua hàng thành công sẽ được viết 1 đánh giá riêng biệt!
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {reviews.length === 0 ? (
                                <p style={{ color: '#64748b', fontStyle: 'italic' }}>Chưa có đánh giá nào cho sản phẩm này.</p>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{r.userName ?? r.UserName}</span>
                                                {(r.orderCode || r.OrderCode) && (
                                                    <span style={{ 
                                                        background: '#dcfce7', 
                                                        color: '#15803d', 
                                                        padding: '3px 10px', 
                                                        borderRadius: 6, 
                                                        fontSize: 12, 
                                                        fontWeight: 800,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}>
                                                        ✓ Đã mua hàng
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{formatAppDate(r.createdAt ?? r.CreatedAt)}</span>
                                        </div>
                                        <div style={{ color: '#fbbf24', marginBottom: '8px' }}>{"★".repeat(r.rating ?? r.Rating ?? 5) + "☆".repeat(5 - (r.rating ?? r.Rating ?? 5))}</div>
                                        <p style={{ margin: 0, color: '#334155', lineHeight: '1.6' }}>{r.comment ?? r.Comment}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {     }
            {relatedProducts.length > 0 && (
                <div style={{ padding: '40px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '30px', textAlign: 'center' }}>SẢN PHẨM CÙNG DANH MỤC</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        {relatedProducts.map(rp => (
                            <Link to={`/customer/products/${rp.id}`} key={rp.id} style={{ textDecoration: "none" }}>
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <img src={getImageUrl(getMainImage(rp))} alt={rp.nameVi || rp.name} style={{ width: '100%', height: '180px', objectFit: 'contain', marginBottom: '15px', background: '#fff', borderRadius: '8px', padding: '5px' }} onError={e => e.target.src = PLACEHOLDER} />
                                    <h4 style={{ fontSize: '15px', margin: '0 0 10px 0', color: '#1e293b', lineHeight: 1.45 }}>{rp.nameVi || rp.name}</h4>
                                    <div style={{ color: '#0ea5e9', fontWeight: '900', fontSize: '18px' }}>{fmt(Number(rp.finalPrice ?? rp.FinalPrice ?? rp.price ?? 0))}</div>
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
