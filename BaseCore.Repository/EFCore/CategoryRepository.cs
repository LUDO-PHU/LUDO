using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface ICategoryRepositoryEF : IRepository<Category>
    {
        Task<Category?> GetByNameAsync(string name);
        Task<bool> ExistsByNameAsync(string nameVi, string nameEn, int? excludeId = null);
        Task<bool> HasProductsAsync(int categoryId);
        Task<int> CountProductsAsync(int categoryId);
        Task<(List<Category> Categories, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            string? sortBy,
            int page,
            int pageSize);
    }

    public class CategoryRepositoryEF : Repository<Category>, ICategoryRepositoryEF
    {
        public CategoryRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<Category?> GetByNameAsync(string name)
        {
            var value = name.Trim().ToLower();
            return await _dbSet.FirstOrDefaultAsync(c =>
                c.NameVi.ToLower() == value || c.NameEn.ToLower() == value);
        }

        public async Task<bool> ExistsByNameAsync(string nameVi, string nameEn, int? excludeId = null)
        {
            var vi = nameVi.Trim().ToLower();
            var en = nameEn.Trim().ToLower();

            return await _dbSet.AnyAsync(c =>
                (!excludeId.HasValue || c.Id != excludeId.Value) &&
                (c.NameVi.ToLower() == vi || c.NameEn.ToLower() == en));
        }

        public async Task<bool> HasProductsAsync(int categoryId)
        {
            return await _context.Products.AnyAsync(p => p.CategoryId == categoryId);
        }

        public async Task<int> CountProductsAsync(int categoryId)
        {
            return await _context.Products.CountAsync(p => p.CategoryId == categoryId);
        }

        public async Task<(List<Category> Categories, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            string? sortBy,
            int page,
            int pageSize)
        {
            var query = _dbSet.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(c =>
                    c.NameVi.ToLower().Contains(kw) ||
                    c.NameEn.ToLower().Contains(kw) ||
                    c.Description.ToLower().Contains(kw));
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            query = sortBy switch
            {
                "oldest" => query.OrderBy(c => c.Id),
                "nameAsc" => query.OrderBy(c => c.NameVi),
                "nameDesc" => query.OrderByDescending(c => c.NameVi),
                _ => query.OrderByDescending(c => c.Id)
            };

            var totalCount = await query.CountAsync();
            var categories = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (categories, totalCount);
        }
    }
}
