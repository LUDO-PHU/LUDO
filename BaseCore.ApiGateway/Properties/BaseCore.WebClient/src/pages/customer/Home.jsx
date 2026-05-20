import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bannerApi, cartApi, categoryApi, productApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
    FALLBACK_BANNERS,
    FALLBACK_CATEGORIES,
    FALLBACK_PRODUCTS,
    finalPrice,
    formatVnd,
    getImageUrl,
} from '../../data/fallbackCatalog';

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

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [topBanners, setTopBanners] = useState([]);
    const [topBannerIdx, setTopBannerIdx] = useState(0);
    const [loading, setLoading] = useState(true);

    const displayBanners = topBanners.length > 0 ? topBanners : FALLBACK_BANNERS;
    const currentBanner = displayBanners[topBannerIdx] || FALLBACK_BANNERS[0];

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await categoryApi.getAll();
                const validCategories = (res.data || []).filter(item => item && (item.nameVi || item.name));
                setCategories(validCategories.length ? validCategories.map(item => ({
                    ...item,
                    nameVi: item.nameVi || item.name,
                })) : FALLBACK_CATEGORIES);
            } catch {
                setCategories(FALLBACK_CATEGORIES);
            }
        };

        bannerApi.getActive('Top').then(res => setTopBanners(res.data || [])).catch(() => setTopBanners([]));
        fetchCategories();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeCatId, searchKw, minPrice, maxPrice, sortBy]);

    const fallbackProducts = useMemo(() => {
        let items = [...FALLBACK_PRODUCTS];
        if (activeCatId !== 0) items = items.filter(item => item.categoryId === activeCatId);
        if (searchKw.trim()) {
            const keyword = searchKw.trim().toLowerCase();
            items = items.filter(item => String(item.nameVi || item.name).toLowerCase().includes(keyword));
        }
        if (minPrice > 0) items = items.filter(item => finalPrice(item) >= minPrice);
        if (maxPrice > 0) items = items.filter(item => finalPrice(item) <= maxPrice);
        if (sortBy === 'priceAsc') items.sort((a, b) => finalPrice(a) - finalPrice(b));
        if (sortBy === 'priceDesc') items.sort((a, b) => finalPrice(b) - finalPrice(a));
        if (sortBy === 'discountDesc') items.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
        return items;
    }, [activeCatId, searchKw, minPrice, maxPrice, sortBy]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const params = { page: currentPage, pageSize: 12 };
                if (activeCatId !== 0) params.categoryId = activeCatId;
                if (sortBy !== 'none') params.sortBy = sortBy;
                if (searchKw) params.keyword = searchKw;
                if (minPrice) params.minPrice = minPrice;
                if (maxPrice) params.maxPrice = maxPrice;

                const res = await productApi.search(params);
                const items = res.data?.items || [];
                setProducts(items.length ? items : fallbackProducts);
                setTotalPages(items.length ? Math.ceil((res.data?.totalCount || 0) / 12) || 1 : 1);
            } catch {
                setProducts(fallbackProducts);
                setTotalPages(1);
            } finally {
                setLoading(false);
            }
        };

        const delay = window.setTimeout(fetchProducts, 180);
        return () => window.clearTimeout(delay);
    }, [activeCatId, currentPage, fallbackProducts, maxPrice, minPrice, searchKw, sortBy]);

    useEffect(() => {
        if (displayBanners.length <= 1) return undefined;
        const timer = window.setInterval(() => {
            setTopBannerIdx(index => (index + 1) % displayBanners.length);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [displayBanners.length]);

    const setCategoryFilter = (catId) => {
        const params = new URLSearchParams(searchParams);
        if (catId === 0) params.delete('catId'); else params.set('catId', catId);
        params.delete('page');
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
            showToast('Chưa thể thêm vào giỏ hàng. Kiểm tra lại backend API.', 'danger');
        }
    };

    return (
        <div className="shop-home">
            <section className="shop-hero">
                <div className="shop-hero__copy">
                    <span className="eyebrow">Phụ kiện và linh kiện điện thoại</span>
                    <h1>PhoneStore</h1>
                    <p>Chọn nhanh cáp sạc, kính cường lực, ốp lưng và pin dự phòng với giao diện mới gọn hơn, dễ mua hơn.</p>
                    <div className="hero-actions">
                        <a href="#products" className="primary-action">
                            <i className="fa fa-bag-shopping"></i>
                            Mua ngay
                        </a>
                        <Link to="/login" className="secondary-action">
                            <i className="fa fa-user"></i>
                            Đăng nhập
                        </Link>
                    </div>
                </div>
                <div className="shop-hero__media">
                    <img src={getImageUrl(currentBanner.imageUrl)} alt="PhoneStore banner" />
                    <div className="hero-product-card">
                        <span>Ưu đãi hôm nay</span>
                        <strong>Giảm đến 20%</strong>
                    </div>
                    {displayBanners.length > 1 && (
                        <div className="hero-dots" aria-label="Chuyển banner">
                            {displayBanners.map((item, index) => (
                                <button
                                    type="button"
                                    key={item.id || index}
                                    className={index === topBannerIdx ? 'is-active' : ''}
                                    onClick={() => setTopBannerIdx(index)}
                                    aria-label={`Banner ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="quick-categories" aria-label="Danh mục sản phẩm">
                <button type="button" className={activeCatId === 0 ? 'is-active' : ''} onClick={() => setCategoryFilter(0)}>
                    <i className="fa fa-border-all"></i>
                    Tất cả
                </button>
                {categories.map(category => (
                    <button
                        type="button"
                        key={category.id}
                        className={activeCatId === category.id ? 'is-active' : ''}
                        onClick={() => setCategoryFilter(category.id)}
                    >
                        <i className="fa fa-tag"></i>
                        {category.nameVi || category.name}
                    </button>
                ))}
            </section>

            <section className="product-area" id="products">
                <div className="section-heading">
                    <div>
                        <span className="eyebrow">Sản phẩm nổi bật</span>
                        <h2>Linh kiện đang bán</h2>
                    </div>
                    <span className="result-count">{loading ? 'Đang tải...' : `${products.length} sản phẩm`}</span>
                </div>

                {products.length === 0 ? (
                    <div className="empty-state">
                        <i className="fa fa-magnifying-glass"></i>
                        <h3>Chưa có sản phẩm phù hợp</h3>
                        <p>Thử đổi từ khóa, danh mục hoặc khoảng giá.</p>
                    </div>
                ) : (
                    <div className="catalog-grid">
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
                )}

                {totalPages > 1 && (
                    <div className="pagination">
                        <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(page => page - 1)}>
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
                        <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => page + 1)}>
                            <i className="fa fa-chevron-right"></i>
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
