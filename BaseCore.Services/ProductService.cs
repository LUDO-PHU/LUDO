using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;
        private readonly ISupplierRepositoryEF _supplierRepository;

        public ProductService(
            IProductRepositoryEF productRepository,
            ICategoryRepositoryEF categoryRepository,
            ISupplierRepositoryEF supplierRepository)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _supplierRepository = supplierRepository;
        }

        public async Task<ApiResponse<PagedResult<ProductDto>>> SearchAsync(ProductSearchRequestDto request)
        {
            request ??= new ProductSearchRequestDto();
            NormalizePaging(request);

            if (request.MinPrice.HasValue && request.MinPrice < 0)
            {
                return ApiResponse<PagedResult<ProductDto>>.Fail("Giá tối thiểu không được âm");
            }

            if (request.MaxPrice.HasValue && request.MaxPrice < 0)
            {
                return ApiResponse<PagedResult<ProductDto>>.Fail("Giá tối đa không được âm");
            }

            if (request.MinPrice.HasValue && request.MaxPrice.HasValue && request.MinPrice > request.MaxPrice)
            {
                return ApiResponse<PagedResult<ProductDto>>.Fail("Giá tối thiểu không được lớn hơn giá tối đa");
            }

            var (products, totalCount) = await _productRepository.SearchAsync(
                request.Keyword,
                request.CategoryId,
                request.MinPrice,
                request.MaxPrice,
                request.SupplierId,
                request.Brand,
                request.Color,
                request.Condition,
                request.Status,
                request.SortBy,
                request.SortDir,
                request.Page,
                request.PageSize);

            return ApiResponse<PagedResult<ProductDto>>.Ok(new PagedResult<ProductDto>
            {
                Items = products.Select(MapProduct).ToList(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<ProductDto>>> GetAllAsync()
        {
            var (products, _) = await _productRepository.SearchAsync(
                null, null, null, null, null, null, null, null, null, null, null, 1, int.MaxValue);
            return ApiResponse<IReadOnlyList<ProductDto>>.Ok(products.Select(MapProduct).ToList());
        }

        public async Task<ApiResponse<ProductDto>> GetByIdDtoAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<ProductDto>.Fail("Mã sản phẩm không hợp lệ");
            }

            var product = await _productRepository.GetByIdWithDetailsAsync(id);
            return product == null
                ? ApiResponse<ProductDto>.Fail("Không tìm thấy sản phẩm")
                : ApiResponse<ProductDto>.Ok(MapProduct(product));
        }

        public async Task<ApiResponse<ProductDto>> CreateAsync(CreateProductDto request)
        {
            var errors = await ValidateProductAsync(request);
            if (errors.Count > 0)
            {
                return ApiResponse<ProductDto>.Fail("Dữ liệu sản phẩm không hợp lệ", errors.ToArray());
            }

            var product = new Product
            {
                NameVi = request.NameVi.Trim(),
                NameEn = request.NameEn.Trim(),
                DescriptionVi = request.DescriptionVi?.Trim() ?? string.Empty,
                DescriptionEn = request.DescriptionEn?.Trim() ?? string.Empty,
                Specifications = request.Specifications?.Trim() ?? string.Empty,
                Price = request.Price,
                ImportPrice = request.ImportPrice,
                DiscountPercent = request.DiscountPercent,
                Stock = 0,
                ImageUrl = request.ImageUrl?.Trim() ?? string.Empty,
                CategoryId = request.CategoryId,
                Brand = request.Brand?.Trim() ?? string.Empty,
                Color = request.Color?.Trim() ?? string.Empty,
                Condition = request.Condition?.Trim() ?? string.Empty,
                Status = NormalizeStatusForStock(0, request.Status),
                SupplierId = request.SupplierId,
                CreatedAt = DateTime.UtcNow
            };
            SyncProductImages(product, request.ImageUrls);

            await _productRepository.AddAsync(product);
            var created = await _productRepository.GetByIdWithDetailsAsync(product.Id) ?? product;

            return ApiResponse<ProductDto>.Ok(MapProduct(created), "Đã tạo sản phẩm");
        }

        public async Task<ApiResponse<ProductDto>> UpdateAsync(int id, UpdateProductDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<ProductDto>.Fail("Mã sản phẩm không hợp lệ");
            }

            var existing = await _productRepository.GetByIdWithDetailsAsync(id);
            if (existing == null)
            {
                return ApiResponse<ProductDto>.Fail("Không tìm thấy sản phẩm");
            }

            var errors = await ValidateProductAsync(request);
            if (errors.Count > 0)
            {
                return ApiResponse<ProductDto>.Fail("Dữ liệu sản phẩm không hợp lệ", errors.ToArray());
            }

            var currentStock = existing.Stock;
            existing.NameVi = request.NameVi.Trim();
            existing.NameEn = request.NameEn.Trim();
            existing.DescriptionVi = request.DescriptionVi?.Trim() ?? string.Empty;
            existing.DescriptionEn = request.DescriptionEn?.Trim() ?? string.Empty;
            existing.Specifications = request.Specifications?.Trim() ?? string.Empty;
            existing.Price = request.Price;
            existing.ImportPrice = request.ImportPrice;
            existing.DiscountPercent = request.DiscountPercent;
            existing.ImageUrl = request.ImageUrl?.Trim() ?? string.Empty;
            existing.CategoryId = request.CategoryId;
            existing.Brand = request.Brand?.Trim() ?? string.Empty;
            existing.Color = request.Color?.Trim() ?? string.Empty;
            existing.Condition = request.Condition?.Trim() ?? string.Empty;
            existing.Status = NormalizeStatusForStock(currentStock, string.IsNullOrWhiteSpace(request.Status) ? existing.Status : request.Status);
            existing.SupplierId = request.SupplierId;
            existing.Stock = currentStock;
            existing.UpdatedAt = DateTime.UtcNow;
            SyncProductImages(existing, request.ImageUrls);

            await _productRepository.UpdateAsync(existing);
            var updated = await _productRepository.GetByIdWithDetailsAsync(existing.Id) ?? existing;

            return ApiResponse<ProductDto>.Ok(MapProduct(updated), "Đã cập nhật sản phẩm. Tồn kho không thay đổi");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<bool>.Fail("Mã sản phẩm không hợp lệ");
            }

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
            {
                return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm");
            }

            await _productRepository.DeleteAsync(product);
            return ApiResponse<bool>.Ok(true, "Đã xóa sản phẩm");
        }

        public async Task<List<Product>> GetAllProductsAsync()
        {
            var products = await _productRepository.SearchAsync(null, null, null, null, null, null, null, null, null, null, null, 1, int.MaxValue);
            return products.Products;
        }

        public async Task<Product?> GetProductByIdAsync(int id)
        {
            return await _productRepository.GetByIdWithDetailsAsync(id);
        }

        public async Task<Product> CreateProductAsync(Product product)
        {
            product.Stock = 0;
            product.Status = NormalizeStatusForStock(0, product.Status);
            product.CreatedAt = DateTime.UtcNow;
            await _productRepository.AddAsync(product);
            return product;
        }

        public async Task UpdateProductAsync(Product product)
        {
            var existing = await _productRepository.GetByIdAsync(product.Id);
            if (existing == null)
            {
                return;
            }

            var currentStock = existing.Stock;
            existing.NameVi = product.NameVi;
            existing.NameEn = product.NameEn;
            existing.DescriptionVi = product.DescriptionVi;
            existing.DescriptionEn = product.DescriptionEn;
            existing.Specifications = product.Specifications;
            existing.Price = product.Price;
            existing.ImportPrice = product.ImportPrice;
            existing.DiscountPercent = product.DiscountPercent;
            existing.ImageUrl = product.ImageUrl;
            existing.CategoryId = product.CategoryId;
            existing.Brand = product.Brand;
            existing.Color = product.Color;
            existing.Condition = product.Condition;
            existing.Status = NormalizeStatusForStock(currentStock, product.Status);
            existing.SupplierId = product.SupplierId;
            existing.Stock = currentStock;
            existing.UpdatedAt = DateTime.UtcNow;

            await _productRepository.UpdateAsync(existing);
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product != null)
            {
                await _productRepository.DeleteAsync(product);
            }
        }

        public async Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            string supplierId,
            string? status,
            string sortBy,
            string? sortDir,
            int page,
            int pageSize)
        {
            _ = int.TryParse(supplierId, out var parsedSupplierId);
            return await _productRepository.SearchAsync(
                keyword,
                categoryId,
                minPrice,
                maxPrice,
                parsedSupplierId > 0 ? parsedSupplierId : null,
                null,
                null,
                null,
                status,
                sortBy,
                sortDir,
                Math.Max(page, 1),
                pageSize <= 0 ? 10 : pageSize);
        }

        public async Task<ApiResponse<ProductDto>> CreateForSupplierAsync(int userId, SupplierProductUpsertDto request)
        {
            var supplier = await _supplierRepository.GetByUserIdAsync(userId);
            if (supplier == null || !supplier.IsActive)
            {
                return ApiResponse<ProductDto>.Fail("Không tìm thấy nhà cung cấp hoặc nhà cung cấp đã ngừng hoạt động");
            }

            if (!supplier.CategoryId.HasValue || supplier.CategoryId <= 0)
            {
                return ApiResponse<ProductDto>.Fail("Nhà cung cấp chưa được gán danh mục");
            }

            var dto = ToCreateProductDto(request, supplier);
            return await CreateAsync(dto);
        }

        public async Task<ApiResponse<ProductDto>> UpdateForSupplierAsync(int userId, int id, SupplierProductUpsertDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<ProductDto>.Fail("Mã sản phẩm không hợp lệ");
            }

            var supplier = await _supplierRepository.GetByUserIdAsync(userId);
            if (supplier == null || !supplier.IsActive)
            {
                return ApiResponse<ProductDto>.Fail("Không tìm thấy nhà cung cấp hoặc nhà cung cấp đã ngừng hoạt động");
            }

            if (!supplier.CategoryId.HasValue || supplier.CategoryId <= 0)
            {
                return ApiResponse<ProductDto>.Fail("Nhà cung cấp chưa được gán danh mục");
            }

            var product = await _productRepository.GetByIdWithDetailsAsync(id);
            if (product == null)
            {
                return ApiResponse<ProductDto>.Fail("Không tìm thấy sản phẩm");
            }

            if (product.SupplierId != supplier.Id || product.CategoryId != supplier.CategoryId.Value)
            {
                return ApiResponse<ProductDto>.Fail("Nhà cung cấp chỉ được sửa sản phẩm thuộc danh mục của mình");
            }

            var dto = ToUpdateProductDto(request, supplier, product);
            return await UpdateAsync(id, dto);
        }

        public static ProductDto MapProduct(Product product)
        {
            var images = MapProductImages(product);
            var mainImage = GetMainImage(product, images);

            return new ProductDto
            {
                Id = product.Id,
                NameVi = product.NameVi,
                NameEn = product.NameEn,
                DescriptionVi = product.DescriptionVi,
                DescriptionEn = product.DescriptionEn,
                Specifications = product.Specifications,
                Price = product.Price,
                ImportPrice = product.ImportPrice,
                DiscountPercent = product.DiscountPercent,
                Stock = product.Stock,
                ImageUrl = mainImage,
                MainImage = mainImage,
                Images = images,
                CategoryId = product.CategoryId,
                CategoryNameVi = product.Category?.NameVi ?? string.Empty,
                CategoryNameEn = product.Category?.NameEn ?? string.Empty,
                Brand = product.Brand,
                Color = product.Color,
                Condition = product.Condition,
                Status = product.Status,
                SupplierId = product.SupplierId,
                SupplierName = product.Supplier?.CompanyName,
                CreatedAt = product.CreatedAt,
                UpdatedAt = product.UpdatedAt,
                AverageRating = product.Reviews != null && product.Reviews.Any() ? Math.Round(product.Reviews.Average(r => r.Rating), 1) : 0,
                ReviewCount = product.Reviews != null ? product.Reviews.Count : 0
            };
        }

        public static IReadOnlyList<ProductImageDto> MapProductImages(Product product)
        {
            var result = new List<ProductImageDto>();
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var image in (product.ProductImages ?? Array.Empty<ProductImage>())
                .Where(i => !string.IsNullOrWhiteSpace(i.ImageUrl))
                .OrderByDescending(i => i.IsPrimary)
                .ThenBy(i => i.SortOrder)
                .ThenBy(i => i.Id))
            {
                var url = image.ImageUrl.Trim();
                if (!seen.Add(url))
                {
                    continue;
                }

                result.Add(new ProductImageDto
                {
                    Id = image.Id,
                    ProductId = image.ProductId,
                    ImageUrl = url,
                    AltText = image.AltText,
                    IsPrimary = image.IsPrimary,
                    SortOrder = image.SortOrder,
                    CreatedAt = image.CreatedAt
                });
            }

            if (!string.IsNullOrWhiteSpace(product.ImageUrl) && seen.Add(product.ImageUrl.Trim()))
            {
                result.Insert(0, new ProductImageDto
                {
                    Id = 0,
                    ProductId = product.Id,
                    ImageUrl = product.ImageUrl.Trim(),
                    AltText = product.NameVi,
                    IsPrimary = !result.Any(i => i.IsPrimary),
                    SortOrder = -1,
                    CreatedAt = product.CreatedAt
                });
            }

            if (result.Count > 0 && !result.Any(i => i.IsPrimary))
            {
                result[0].IsPrimary = true;
            }

            return result;
        }

        public static string GetMainImage(Product product, IReadOnlyList<ProductImageDto>? images = null)
        {
            images ??= MapProductImages(product);
            return images.FirstOrDefault(i => i.IsPrimary)?.ImageUrl
                ?? images.FirstOrDefault()?.ImageUrl
                ?? (!string.IsNullOrWhiteSpace(product.ImageUrl) ? product.ImageUrl.Trim() : string.Empty)
                ?? string.Empty;
        }

        private static void SyncProductImages(Product product, IReadOnlyList<string>? requestedUrls)
        {
            var normalized = NormalizeImageUrls(product, requestedUrls).ToList();
            if (normalized.Count == 0)
            {
                return;
            }

            product.ImageUrl = normalized[0];
            product.ProductImages ??= new List<ProductImage>();

            var keep = normalized.ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var image in product.ProductImages.Where(i => !keep.Contains(i.ImageUrl)).ToList())
            {
                product.ProductImages.Remove(image);
            }

            for (var index = 0; index < normalized.Count; index++)
            {
                var url = normalized[index];
                var existing = product.ProductImages.FirstOrDefault(i => string.Equals(i.ImageUrl, url, StringComparison.OrdinalIgnoreCase));
                if (existing == null)
                {
                    existing = new ProductImage
                    {
                        Product = product,
                        ProductId = product.Id,
                        ImageUrl = url,
                        CreatedAt = DateTime.UtcNow
                    };
                    product.ProductImages.Add(existing);
                }

                existing.AltText = product.NameVi;
                existing.IsPrimary = index == 0;
                existing.SortOrder = index;
            }
        }

        private static IEnumerable<string> NormalizeImageUrls(Product product, IReadOnlyList<string>? requestedUrls)
        {
            var urls = new List<string>();
            if (requestedUrls is { Count: > 0 })
            {
                urls.AddRange(requestedUrls);
            }
            else if (product.ProductImages is { Count: > 0 })
            {
                urls.AddRange(product.ProductImages
                    .OrderByDescending(i => i.IsPrimary)
                    .ThenBy(i => i.SortOrder)
                    .Select(i => i.ImageUrl));
            }

            if (!string.IsNullOrWhiteSpace(product.ImageUrl))
            {
                urls.Insert(0, product.ImageUrl);
            }

            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var url in urls)
            {
                var value = url?.Trim();
                if (!string.IsNullOrWhiteSpace(value) && seen.Add(value))
                {
                    yield return value;
                }
            }
        }

        private async Task<List<string>> ValidateProductAsync(CreateProductDto request)
        {
            var errors = ValidateProductValues(request);

            if (request != null && request.CategoryId > 0 && await _categoryRepository.GetByIdAsync(request.CategoryId) == null)
            {
                errors.Add("Danh mục không tồn tại");
            }

            if (request?.SupplierId != null && request.SupplierId > 0 && await _supplierRepository.GetByIdAsync(request.SupplierId.Value) == null)
            {
                errors.Add("Nhà cung cấp không tồn tại");
            }
            else if (request?.SupplierId != null && request.SupplierId > 0)
            {
                var supplier = await _supplierRepository.GetByIdWithUserAsync(request.SupplierId.Value);
                if (supplier?.CategoryId.HasValue == true && supplier.CategoryId.Value != request.CategoryId)
                {
                    errors.Add("Danh mục sản phẩm phải trùng với danh mục của nhà cung cấp");
                }
            }

            return errors;
        }

        private async Task<List<string>> ValidateProductAsync(UpdateProductDto request)
        {
            var errors = ValidateProductValues(request);

            if (request != null && request.CategoryId > 0 && await _categoryRepository.GetByIdAsync(request.CategoryId) == null)
            {
                errors.Add("Danh mục không tồn tại");
            }

            if (request?.SupplierId != null && request.SupplierId > 0 && await _supplierRepository.GetByIdAsync(request.SupplierId.Value) == null)
            {
                errors.Add("Nhà cung cấp không tồn tại");
            }
            else if (request?.SupplierId != null && request.SupplierId > 0)
            {
                var supplier = await _supplierRepository.GetByIdWithUserAsync(request.SupplierId.Value);
                if (supplier?.CategoryId.HasValue == true && supplier.CategoryId.Value != request.CategoryId)
                {
                    errors.Add("Danh mục sản phẩm phải trùng với danh mục của nhà cung cấp");
                }
            }

            return errors;
        }

        private static CreateProductDto ToCreateProductDto(SupplierProductUpsertDto request, Supplier supplier)
        {
            return new CreateProductDto
            {
                NameVi = request.NameVi,
                NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? request.NameVi : request.NameEn,
                DescriptionVi = request.DescriptionVi,
                DescriptionEn = request.DescriptionEn,
                Specifications = request.Specifications,
                Price = request.Price,
                ImportPrice = request.ImportPrice,
                DiscountPercent = request.DiscountPercent,
                ImageUrl = request.ImageUrl,
                ImageUrls = request.ImageUrls ?? Array.Empty<string>(),
                CategoryId = supplier.CategoryId!.Value,
                Brand = request.Brand,
                Color = request.Color,
                Condition = request.Condition,
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status,
                SupplierId = supplier.Id
            };
        }

        private static UpdateProductDto ToUpdateProductDto(SupplierProductUpsertDto request, Supplier supplier, Product existing)
        {
            var nameVi = string.IsNullOrWhiteSpace(request.NameVi) ? existing.NameVi : request.NameVi.Trim();
            var imageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? existing.ImageUrl : request.ImageUrl.Trim();

            return new UpdateProductDto
            {
                NameVi = nameVi,
                NameEn = string.IsNullOrWhiteSpace(request.NameEn) ? nameVi : request.NameEn.Trim(),
                DescriptionVi = existing.DescriptionVi,
                DescriptionEn = existing.DescriptionEn,
                Specifications = existing.Specifications,
                Price = existing.Price,
                ImportPrice = existing.ImportPrice,
                DiscountPercent = existing.DiscountPercent,
                ImageUrl = imageUrl,
                ImageUrls = request.ImageUrls is { Count: > 0 } ? request.ImageUrls : existing.ProductImages.Select(i => i.ImageUrl).ToList(),
                CategoryId = supplier.CategoryId!.Value,
                Brand = existing.Brand,
                Color = existing.Color,
                Condition = existing.Condition,
                Status = existing.Status,
                SupplierId = supplier.Id
            };
        }

        private static List<string> ValidateProductValues(dynamic request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            if (string.IsNullOrWhiteSpace(request.NameVi))
            {
                errors.Add("Vui lòng nhập tên sản phẩm tiếng Việt");
            }

            if (string.IsNullOrWhiteSpace(request.NameEn))
            {
                errors.Add("Vui lòng nhập tên sản phẩm tiếng Anh");
            }

            if (request.CategoryId <= 0)
            {
                errors.Add("Vui lòng chọn danh mục");
            }

            if (request.Price < 0)
            {
                errors.Add("Giá bán không được âm");
            }

            if (request.ImportPrice < 0)
            {
                errors.Add("Giá nhập không được âm");
            }

            if (request.DiscountPercent < 0 || request.DiscountPercent > 100)
            {
                errors.Add("Phần trăm giảm giá phải từ 0 đến 100");
            }

            return errors;
        }

        private static void NormalizePaging(ProductSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }

        private static string NormalizeStatusForStock(int stock, string? requestedStatus)
        {
            var status = string.IsNullOrWhiteSpace(requestedStatus) ? "Active" : requestedStatus.Trim();
            if (string.Equals(status, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                return "Inactive";
            }

            return stock <= 0 ? "OutOfStock" : status;
        }
    }
}
