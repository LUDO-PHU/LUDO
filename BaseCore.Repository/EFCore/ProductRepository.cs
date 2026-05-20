using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface IProductRepositoryEF : IRepository<Product>
    {
        Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            int? supplierId,
            string? brand,
            string? color,
            string? condition,
            string? status,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize);

        Task<Product?> GetByIdWithDetailsAsync(int id);
        Task<List<Product>> GetByCategoryAsync(int categoryId);
    }

    public class ProductRepositoryEF : Repository<Product>, IProductRepositoryEF
    {
        public ProductRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            int? supplierId,
            string? brand,
            string? color,
            string? condition,
            string? status,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(p => p.Category)
                .Include(p => p.Supplier)
                .Include(p => p.ProductImages)
                .Include(p => p.Reviews)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(p =>
                    p.NameVi.ToLower().Contains(kw) ||
                    p.NameEn.ToLower().Contains(kw) ||
                    p.Brand.ToLower().Contains(kw) ||
                    p.Specifications.ToLower().Contains(kw) ||
                    p.DescriptionVi.ToLower().Contains(kw) ||
                    p.DescriptionEn.ToLower().Contains(kw) ||
                    (p.Category != null && p.Category.NameVi.ToLower().Contains(kw)) ||
                    (p.Category != null && p.Category.NameEn.ToLower().Contains(kw)));
            }

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId.Value);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => (p.Price * (100 - p.DiscountPercent) / 100) >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => (p.Price * (100 - p.DiscountPercent) / 100) <= maxPrice.Value);
            }

            if (supplierId.HasValue && supplierId > 0)
            {
                query = query.Where(p => p.SupplierId == supplierId.Value);
            }

            if (!string.IsNullOrWhiteSpace(brand))
            {
                var value = brand.Trim().ToLower();
                query = query.Where(p => p.Brand.ToLower().Contains(value));
            }

            if (!string.IsNullOrWhiteSpace(color))
            {
                var value = color.Trim().ToLower();
                query = query.Where(p => p.Color.ToLower().Contains(value));
            }

            if (!string.IsNullOrWhiteSpace(condition))
            {
                var value = condition.Trim().ToLower();
                query = query.Where(p => p.Condition.ToLower().Contains(value));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var value = status.Trim().ToLower();
                query = query.Where(p => p.Status.ToLower() == value);
            }

            var sort = sortBy?.Trim().ToLowerInvariant();
            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            query = sort switch
            {
                "priceasc" => query.OrderBy(p => p.Price * (100 - p.DiscountPercent) / 100).ThenByDescending(p => p.Id),
                "pricedesc" => query.OrderByDescending(p => p.Price * (100 - p.DiscountPercent) / 100).ThenByDescending(p => p.Id),
                "price" => desc ? query.OrderByDescending(p => p.Price * (100 - p.DiscountPercent) / 100).ThenByDescending(p => p.Id) : query.OrderBy(p => p.Price * (100 - p.DiscountPercent) / 100).ThenByDescending(p => p.Id),
                "discountdesc" => query.OrderByDescending(p => p.DiscountPercent).ThenByDescending(p => p.Id),
                "nameasc" => query.OrderBy(p => p.NameVi).ThenByDescending(p => p.Id),
                "namedesc" => query.OrderByDescending(p => p.NameVi).ThenByDescending(p => p.Id),
                "name" => desc ? query.OrderByDescending(p => p.NameVi).ThenByDescending(p => p.Id) : query.OrderBy(p => p.NameVi).ThenByDescending(p => p.Id),
                "stock" => desc ? query.OrderByDescending(p => p.Stock).ThenByDescending(p => p.Id) : query.OrderBy(p => p.Stock).ThenByDescending(p => p.Id),
                "createdat" => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
                _ => query.OrderByDescending(p => p.Id),
            };

            var totalCount = await query.CountAsync();
            var products = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (products, totalCount);
        }

        public async Task<Product?> GetByIdWithDetailsAsync(int id)
        {
            return await _dbSet
                .Include(p => p.Category)
                .Include(p => p.Supplier)
                .Include(p => p.ProductImages)
                .Include(p => p.Reviews)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<List<Product>> GetByCategoryAsync(int categoryId)
        {
            return await _dbSet
                .Where(p => p.CategoryId == categoryId)
                .Include(p => p.Category)
                .Include(p => p.Supplier)
                .Include(p => p.ProductImages)
                .Include(p => p.Reviews)
                .ToListAsync();
        }
    }
}
