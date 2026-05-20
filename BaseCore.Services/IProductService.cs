using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;

namespace BaseCore.Services
{
    public interface IProductService
    {
        Task<ApiResponse<PagedResult<ProductDto>>> SearchAsync(ProductSearchRequestDto request);
        Task<ApiResponse<IReadOnlyList<ProductDto>>> GetAllAsync();
        Task<ApiResponse<ProductDto>> GetByIdDtoAsync(int id);
        Task<ApiResponse<ProductDto>> CreateAsync(CreateProductDto request);
        Task<ApiResponse<ProductDto>> UpdateAsync(int id, UpdateProductDto request);
        Task<ApiResponse<ProductDto>> CreateForSupplierAsync(int userId, SupplierProductUpsertDto request);
        Task<ApiResponse<ProductDto>> UpdateForSupplierAsync(int userId, int id, SupplierProductUpsertDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);

        Task<List<Product>> GetAllProductsAsync();
        Task<Product?> GetProductByIdAsync(int id);
        Task<Product> CreateProductAsync(Product product);
        Task UpdateProductAsync(Product product);
        Task DeleteProductAsync(int id);
        Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            string supplierId,
            string? status,
            string sortBy,
            string? sortDir,
            int page,
            int pageSize);
    }
}
