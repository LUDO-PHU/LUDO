import React, { useCallback, useEffect, useState } from 'react';
import { categoriesApi, productsApi } from '../services/api';

const emptyForm = {
  name: '',
  brand: 'EconentTech',
  price: '',
  oldPrice: '',
  discountPercent: '',
  stock: '',
  imageUrl: '',
  description: '',
  specifications: '',
  categoryId: '',
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    keyword: '',
    categoryId: '',
    stockStatus: '',
    sortBy: 'price_asc',
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsApi.search({
        keyword: filters.keyword || undefined,
        categoryId: filters.categoryId || undefined,
        stockStatus: filters.stockStatus || undefined,
        sortBy: filters.sortBy || undefined,
        page,
        pageSize,
      });

      setProducts(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.totalCount || 0);
    } catch (err) {
      setError('Không tải được danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data || []);
    } catch (err) {
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const setField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    setError('');
    setFormData(
      product
        ? {
            name: product.name || '',
            brand: product.brand || 'EconentTech',
            price: product.price ?? '',
            oldPrice: product.oldPrice ?? '',
            discountPercent: product.discountPercent ?? '',
            stock: product.stock ?? '',
            imageUrl: product.imageUrl || '',
            description: product.description || '',
            specifications: product.specifications || '',
            categoryId: product.categoryId || '',
          }
        : { ...emptyForm, categoryId: categories[0]?.id || '' }
    );
    setShowModal(true);
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    brand: formData.brand.trim() || 'EconentTech',
    price: Number(formData.price),
    oldPrice: formData.oldPrice === '' ? null : Number(formData.oldPrice),
    discountPercent:
      formData.discountPercent === '' ? null : Number(formData.discountPercent),
    stock: Number(formData.stock),
    imageUrl: formData.imageUrl.trim(),
    description: formData.description.trim(),
    specifications: formData.specifications.trim(),
    categoryId: Number(formData.categoryId),
    installmentAvailable: false,
  });

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const data = buildPayload();
    if (!data.name || !data.categoryId || data.price < 0 || data.stock < 0) {
      setError('Vui lòng nhập đủ tên, danh mục, giá và số lượng hợp lệ.');
      return;
    }

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
      } else {
        await productsApi.create(data);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Lưu sản phẩm thất bại.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa sản phẩm này khỏi hệ thống?')) {
      return;
    }

    await productsApi.delete(id);
    fetchProducts();
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-8">
              <h1 className="m-0">Quản lý sản phẩm EconentTech</h1>
              <small className="text-muted">
                Thêm, sửa, xóa, tìm kiếm và phân trang sản phẩm từ backend.
              </small>
            </div>
            <div className="col-sm-4 text-right">
              <button className="btn btn-warning" onClick={() => openModal()}>
                <i className="fas fa-plus mr-1"></i>
                Thêm sản phẩm
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <form className="row" onSubmit={handleSearch}>
                <div className="col-md-3 mb-2">
                  <label>Tìm gần đúng</label>
                  <input
                    className="form-control"
                    value={filters.keyword}
                    onChange={(event) => setFilter('keyword', event.target.value)}
                    placeholder="Tên, hãng, mô tả..."
                  />
                </div>
                <div className="col-md-3 mb-2">
                  <label>Danh mục</label>
                  <select
                    className="form-control"
                    value={filters.categoryId}
                    onChange={(event) => setFilter('categoryId', event.target.value)}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 mb-2">
                  <label>Tồn kho</label>
                  <select
                    className="form-control"
                    value={filters.stockStatus}
                    onChange={(event) =>
                      setFilter('stockStatus', event.target.value)
                    }
                  >
                    <option value="">Tất cả</option>
                    <option value="available">Còn hàng</option>
                    <option value="soldout">Sold out</option>
                    <option value="sale">Đang giảm</option>
                  </select>
                </div>
                <div className="col-md-2 mb-2">
                  <label>Sắp xếp</label>
                  <select
                    className="form-control"
                    value={filters.sortBy}
                    onChange={(event) => setFilter('sortBy', event.target.value)}
                  >
                    <option value="price_asc">Giá tăng</option>
                    <option value="price_desc">Giá giảm</option>
                    <option value="newest">Mới nhất</option>
                  </select>
                </div>
                <div className="col-md-2 mb-2 d-flex align-items-end">
                  <button className="btn btn-dark btn-block" type="submit">
                    Tìm kiếm
                  </button>
                </div>
              </form>
            </div>

            <div className="card-body table-responsive p-0">
              {error && !showModal && <div className="alert alert-warning m-3">{error}</div>}
              {loading ? (
                <div className="text-center p-4">Đang tải...</div>
              ) : (
                <table className="table table-hover text-nowrap">
                  <thead>
                    <tr>
                      <th>Ảnh</th>
                      <th>Sản phẩm</th>
                      <th>Danh mục</th>
                      <th>Giá</th>
                      <th>Giảm</th>
                      <th>Tồn kho</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            style={{
                              width: 74,
                              height: 54,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid #ddd',
                            }}
                          />
                        </td>
                        <td>
                          <strong>{product.name}</strong>
                          <div className="text-muted small">
                            {product.brand || 'EconentTech'}
                          </div>
                        </td>
                        <td>{product.category?.name || '-'}</td>
                        <td>
                          <strong>{formatCurrency(product.price)}</strong>
                          {product.oldPrice > product.price && (
                            <div className="small text-muted">
                              <del>{formatCurrency(product.oldPrice)}</del>
                            </div>
                          )}
                        </td>
                        <td>{product.discountPercent ? `${product.discountPercent}%` : '-'}</td>
                        <td>
                          <span
                            className={`badge ${
                              product.stock > 0 ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {product.stock > 0 ? product.stock : 'Sold out'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-info mr-1"
                            onClick={() => openModal(product)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(product.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          Không có sản phẩm phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-footer d-flex justify-content-between align-items-center">
              <span>Tổng: {totalCount} sản phẩm</span>
              <div className="btn-group">
                <button
                  className="btn btn-outline-secondary"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (item) => (
                    <button
                      key={item}
                      className={`btn ${
                        page === item ? 'btn-dark' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  className="btn btn-outline-secondary"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h4 className="modal-title">
                    {editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                  </h4>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setShowModal(false)}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="row">
                    <div className="col-md-8 form-group">
                      <label>Tên sản phẩm</label>
                      <input
                        className="form-control"
                        value={formData.name}
                        onChange={(event) => setField('name', event.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Hãng</label>
                      <input
                        className="form-control"
                        value={formData.brand}
                        onChange={(event) => setField('brand', event.target.value)}
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Danh mục</label>
                      <select
                        className="form-control"
                        value={formData.categoryId}
                        onChange={(event) =>
                          setField('categoryId', event.target.value)
                        }
                        required
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Giá hiện tại</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.price}
                        onChange={(event) => setField('price', event.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Giá cũ</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.oldPrice}
                        onChange={(event) => setField('oldPrice', event.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Giảm giá (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.discountPercent}
                        onChange={(event) =>
                          setField('discountPercent', event.target.value)
                        }
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="col-md-4 form-group">
                      <label>Số lượng tồn</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.stock}
                        onChange={(event) => setField('stock', event.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div className="col-12 form-group">
                      <label>Image URL</label>
                      <input
                        className="form-control"
                        value={formData.imageUrl}
                        onChange={(event) => setField('imageUrl', event.target.value)}
                      />
                    </div>
                    <div className="col-12 form-group">
                      <label>Mô tả</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.description}
                        onChange={(event) =>
                          setField('description', event.target.value)
                        }
                      />
                    </div>
                    <div className="col-12 form-group">
                      <label>Thông số</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.specifications}
                        onChange={(event) =>
                          setField('specifications', event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-warning">
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Products;
