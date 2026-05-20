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

    { id: 'B2', imageUrl: '/images/banner/B2.jpg' },
    { id: 'B3', imageUrl: '/images/banner/B3.png' },
    { id: 'B4', imageUrl: '/images/banner/B4.png' },
    { id: 'B5', imageUrl: '/images/banner/B5.png' },
    { id: 'B6', imageUrl: '/images/banner/B6.png' },
];

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
            setTopBannerIdx(index => (index + 1) % displayBanners.length);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [displayBanners.length]);

    const moveBanner = (direction) => {
        setTopBannerIdx(index => (index + direction + displayBanners.length) % displayBanners.length);
    };

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

        if (product.stock <= 0) {
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
                <div className="banner-track" style={{ transform: `translateX(-${topBannerIdx * 100}%)` }}>
                    {displayBanners.map((banner, index) => (
                        <div className="banner-slide" key={banner.id}>
                            <img
                                src={getImageUrl(banner.imageUrl)}
                                alt={`PhoneStore banner ${index + 1}`}
                                loading={index === 0 ? 'eager' : 'lazy'}
                            />
                        </div>
                    ))}
                </div>

                {displayBanners.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="banner-nav banner-nav--prev"
                            onClick={() => moveBanner(-1)}
                            aria-label="Banner trước"
                        >
                            <i className="fa fa-chevron-left"></i>
                        </button>
                        <button
                            type="button"
                            className="banner-nav banner-nav--next"
                            onClick={() => moveBanner(1)}
                            aria-label="Banner tiếp theo"
                        >
                            <i className="fa fa-chevron-right"></i>
                        </button>

                        <div className="hero-dots" aria-label="Chuyển banner">
                            {displayBanners.map((item, index) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={index === topBannerIdx ? 'is-active' : ''}
                                    onClick={() => setTopBannerIdx(index)}
                                    aria-label={`Banner ${index + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
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
                            {Array.isArray(categories) && categories.map(category => {
                                let icon = 'fa-tag';
                                if (category.id === 1) icon = 'fa-mobile-screen';
                                if (category.id === 2) icon = 'fa-battery-full';
                                if (category.id === 3) icon = 'fa-camera';
                                if (category.id === 4) icon = 'fa-mobile';
                                if (category.id === 5) icon = 'fa-bolt';
                                if (category.id === 6) icon = 'fa-volume-high';
                                if (category.id === 8) icon = 'fa-microchip';
                                if (category.id === 9) icon = 'fa-shield-halved';

                                return (
                                    <button
                                        type="button"
                                        key={category.id}
                                        className={activeCatId === category.id ? 'is-active' : ''}
                                        onClick={() => setCategoryFilter(category.id)}
                                    >
                                        <i className={`fa ${icon}`}></i>
                                        {category.nameVi || category.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="sidebar-support-stack" aria-label="Dịch vụ cửa hàng">
                            <div className="sidebar-promo">
                                <i className="fa fa-truck-fast"></i>
                                <h4>Giao hàng hỏa tốc</h4>
                                <p>Nhận hàng trong 2h tại nội thành, giao trong ngày với đơn ngoại thành.</p>
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
                                    <div className={`stock-chip ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                                        <i className="fa fa-box"></i>
                                        {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
                                    </div>
                                    <button
                                        type="button"
                                        className="add-cart-button"
                                        disabled={product.stock <= 0}
                                        onClick={event => handleAddToCart(product, event)}
                                    >
                                        <i className="fa fa-cart-plus"></i>
                                        {product.stock > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
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
