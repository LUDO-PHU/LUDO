import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { cartApi, categoryApi, productApi, unwrapApiData, unwrapPagedData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
    finalPrice,
    formatVnd,
    getImageUrl,
} from '../../data/fallbackCatalog';

const TOP_BANNERS = [
    { id: 'B1', imageUrl: '/images/banner/B1n.png' },
    { id: 'B2', imageUrl: '/images/banner/B2n.png' },
    { id: 'B3', imageUrl: '/images/banner/B3n.png' },
    { id: 'B4', imageUrl: '/images/banner/B4n.png' },
    { id: 'B5', imageUrl: '/images/banner/B5n.png' },
    { id: 'B6', imageUrl: '/images/banner/B6n.png' },
];

const isProductAvailable = (product) => Boolean(product?.isAvailable ?? product?.IsAvailable);
const getAvailabilityText = (product) => product?.availabilityText ?? product?.AvailabilityText ?? '';

const Home = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { isAuthenticated } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeCatId = Number(searchParams.get('catId')) || 0;
    const searchKw = searchParams.get('keyword') || '';
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || 0;
    const sortBy = searchParams.get('sortBy') || 'none';
    const currentPage = Number(searchParams.get('page')) || 1;

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [topBannerIdx, setTopBannerIdx] = useState(0);
    const [isBannerDark, setIsBannerDark] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const displayBanners = TOP_BANNERS;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await categoryApi.getAll();
                const data = unwrapApiData(res, []);
                setCategories(data);
            } catch (err) {
                console.error('Lỗi tải danh mục:', err);
                setCategories([]);
            }
        };

        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = {
                page: currentPage,
                pageSize: 12,
                categoryId: activeCatId > 0 ? activeCatId : undefined,
                keyword: searchKw || undefined,
                minPrice: minPrice || undefined,
                maxPrice: maxPrice || undefined,
                sortBy: sortBy !== 'none' ? sortBy : undefined
            };
            const res = await productApi.search(params);
            const paged = unwrapPagedData(res);
            setProducts(paged.items);
            setTotalPages(Math.max(1, paged.totalPages));
        } catch (err) {
            console.error('Lỗi tải sản phẩm:', err);
            setError('Không thể kết nối với máy chủ dữ liệu. Vui lòng kiểm tra lại dịch vụ máy chủ.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delay = window.setTimeout(fetchProducts, 180);
        return () => window.clearTimeout(delay);
    }, [activeCatId, currentPage, searchKw, minPrice, maxPrice, sortBy]);

    useEffect(() => {
        if (displayBanners.length <= 1) return undefined;
        const timer = window.setInterval(() => {
            setIsBannerDark(true);
            window.setTimeout(() => {
                setTopBannerIdx(index => (index + 1) % displayBanners.length);
                setIsBannerDark(false);
            }, 480);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [displayBanners.length]);

    const setCategoryFilter = (catId) => {
        const params = new URLSearchParams(searchParams);
        if (catId === 0) params.delete('catId'); else params.set('catId', catId);
        params.delete('page');
        setSearchParams(params);
    };

    const setCurrentPage = (page) => {
        const params = new URLSearchParams(searchParams);
        if (page === 1) params.delete('page'); else params.set('page', page);
        setSearchParams(params);
    };

    const handleAddToCart = async (product, event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAuthenticated) {
            showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ.', 'warning');
            navigate('/login');
            return;
        }

        if (!isProductAvailable(product)) {
            showToast('Sản phẩm đã hết hàng.', 'danger');
            return;
        }

        try {
            await cartApi.addItem(product.id, 1);
            window.dispatchEvent(new Event('cart:changed'));
            showToast(`Đã thêm ${product.nameVi || product.name} vào giỏ.`, 'success');
        } catch {
            showToast('Chưa thể thêm vào giỏ hàng. Vui lòng kiểm tra lại dịch vụ máy chủ.', 'danger');
        }
    };

    return (
        <div className="shop-home">
            <section className="shop-hero banner-carousel" aria-label="Banner khuyến mãi">
                <div className="banner-track">
                    {displayBanners.map((banner, index) => (
                        <div className={`banner-slide ${index === topBannerIdx ? 'is-active' : ''}`} key={banner.id}>
                            <img
                                src={getImageUrl(banner.imageUrl)}
                                alt={`PhoneStore banner ${index + 1}`}
                                loading={index === 0 ? 'eager' : 'lazy'}
                            />
                        </div>
                    ))}
                </div>
                <div className={`banner-dark-overlay ${isBannerDark ? 'is-dark' : ''}`} aria-hidden="true" />
            </section>

            <div className="shop-main-layout">
                <aside className="quick-categories" aria-label="Danh mục sản phẩm">
                    <div className="sidebar-sticky">
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">Danh mục</h3>
                            <button type="button" className={activeCatId === 0 ? 'is-active' : ''} onClick={() => setCategoryFilter(0)}>
                                <i className="fa fa-border-all"></i>
                                Tất cả linh kiện
                            </button>
                            {Array.isArray(categories) && categories.map(category => (
                                <button
                                    type="button"
                                    key={category.id}
                                    className={activeCatId === category.id ? 'is-active' : ''}
                                    onClick={() => setCategoryFilter(category.id)}
                                >
                                    <i className={category.iconClass || category.IconClass || 'fa fa-tag'}></i>
                                    {category.nameVi || category.name}
                                </button>
                            ))}
                        </div>

                        <div className="sidebar-support-stack" aria-label="Dịch vụ cửa hàng">
                            <div className="sidebar-promo">
                                <i className="fa fa-truck-fast"></i>
                                <h4>Giao hàng hỏa tốc</h4>
                                <p>Nhận hàng trong 2h tại nội thành, giao trong ngày với đơn ngoại thành.</p>
                            </div>

                            <div className="sidebar-promo">
                                <i className="fa fa-gift" style={{ color: '#0ea5e9' }}></i>
                                <h4>Ưu đãi đặc quyền</h4>
                                <ul style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '13px', color: 'var(--text)', lineHeight: '1.6', textAlign: 'left' }}>
                                    <li style={{ marginBottom: '10px' }}>
                                        <strong>Hạng thành viên:</strong>
                                        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><i className="fa fa-medal" style={{ color: '#cd7f32', fontSize: '15px', margin: 0 }}></i> Đồng (-2%)</span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><i className="fa fa-medal" style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}></i> Bạc (-5%)</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><i className="fa fa-medal" style={{ color: '#fbbf24', fontSize: '15px', margin: 0 }}></i> Vàng (-7%)</span>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><i className="fa fa-gem" style={{ color: '#22d3ee', fontSize: '15px', margin: 0 }}></i> Kim cương (-10%)</span>
                                            </div>
                                        </div>
                                    </li>
                                    <li style={{ marginBottom: '8px' }}><strong>Mua sỉ:</strong> Giảm thêm 10% khi mua từ 3 sản phẩm cùng loại</li>
                                    <li><strong>Siêu ưu đãi:</strong> Giảm ngay 20% cho tổng đơn trên 5.000.000đ</li>
                                </ul>
                            </div>

                            <div className="sidebar-service-card">
                                <i className="fa fa-shield-halved"></i>
                                <div>
                                    <h4>Bảo hành rõ ràng</h4>
                                    <p>Linh kiện có tem, phiếu bảo hành và lịch sử đơn hàng để đối chiếu.</p>
                                </div>
                            </div>

                            <div className="sidebar-service-card">
                                <i className="fa fa-screwdriver-wrench"></i>
                                <div>
                                    <h4>Hỗ trợ lắp đặt</h4>
                                    <p>Kỹ thuật viên kiểm tra tương thích trước khi giao cho khách.</p>
                                </div>
                            </div>

                            <div className="sidebar-service-card">
                                <i className="fa fa-rotate-left"></i>
                                <div>
                                    <h4>Đổi trả 7 ngày</h4>
                                    <p>Đổi nhanh khi sản phẩm lỗi kỹ thuật hoặc không đúng mô tả.</p>
                                </div>
                            </div>

                            <div className="sidebar-service-card">
                                <i className="fa fa-headset"></i>
                                <div>
                                    <h4>Tư vấn đơn sỉ</h4>
                                    <p>Hỗ trợ báo giá cho cửa hàng sửa chữa, đại lý và kỹ thuật viên.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="product-area" id="products">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">Sản phẩm nổi bật</span>
                            <h2>Linh kiện đang bán</h2>
                        </div>
                        <span className="result-count">{loading ? 'Đang tải...' : `${products.length} sản phẩm`}</span>
                    </div>

                    {error && (
                        <div className="error-alert">
                            <i className="fa fa-triangle-exclamation"></i>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && products.length === 0 && !error && (
                        <div className="empty-state">
                            <i className="fa fa-magnifying-glass"></i>
                            <h3>Chưa có sản phẩm phù hợp</h3>
                            <p>Thử đổi từ khóa, danh mục hoặc khoảng giá.</p>
                        </div>
                    )}

                    <div className="catalog-grid" style={{ opacity: loading ? 0.6 : 1 }}>
                        {products.map(product => (
                            <Link className="catalog-card" to={`/customer/products/${product.id}`} key={product.id}>
                                <div className="catalog-card__image">
                                    {product.discountPercent > 0 && <span className="sale-badge">-{product.discountPercent}%</span>}
                                    <img
                                        src={getImageUrl(product.imageUrl)}
                                        alt={product.nameVi || product.name}
                                        onError={event => { event.currentTarget.src = '/images/products/capsac.jpg'; }}
                                    />
                                </div>
                                <div className="catalog-card__body">
                                    <span className="product-category">{product.categoryNameVi || product.categoryName || 'Linh kiện'}</span>
                                    <h3>{product.nameVi || product.name}</h3>
                                    <div className="price-row">
                                        <strong>{formatVnd(finalPrice(product))}</strong>
                                        {product.discountPercent > 0 && <del>{formatVnd(product.price)}</del>}
                                    </div>
                                    <div className={`stock-chip ${isProductAvailable(product) ? 'in-stock' : 'out-stock'}`}>
                                        <i className="fa fa-box"></i>
                                        {getAvailabilityText(product) || (isProductAvailable(product) ? 'Còn hàng' : 'Hết hàng')}
                                    </div>
                                    <button
                                        type="button"
                                        className="add-cart-button"
                                        disabled={!isProductAvailable(product)}
                                        onClick={event => handleAddToCart(product, event)}
                                    >
                                        <i className="fa fa-cart-plus"></i>
                                        {isProductAvailable(product) ? 'Thêm vào giỏ' : 'Hết hàng'}
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
                                <i className="fa fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    type="button"
                                    key={index}
                                    className={currentPage === index + 1 ? 'is-active' : ''}
                                    onClick={() => setCurrentPage(index + 1)}
                                >
                                    {index + 1}
                                </button>
                            ))}
                            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                                <i className="fa fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Home;
