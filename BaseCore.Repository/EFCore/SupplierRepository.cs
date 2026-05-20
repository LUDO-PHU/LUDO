using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface ISupplierRepositoryEF : IRepository<Supplier>
    {
        Task<Supplier?> GetByIdWithUserAsync(int id);
        Task<Supplier?> GetByUserIdAsync(int userId);
        Task<bool> ExistsByUserIdAsync(int userId, int? excludeId = null);
        Task<(List<Supplier> Suppliers, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            int? categoryId,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize);
    }

    public class SupplierRepositoryEF : Repository<Supplier>, ISupplierRepositoryEF
    {
        public SupplierRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<Supplier?> GetByIdWithUserAsync(int id)
        {
            return await _dbSet
                .Include(s => s.User)
                .Include(s => s.Category)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<Supplier?> GetByUserIdAsync(int userId)
        {
            return await _dbSet
                .Include(s => s.User)
                .Include(s => s.Category)
                .FirstOrDefaultAsync(s => s.UserId == userId);
        }

        public async Task<bool> ExistsByUserIdAsync(int userId, int? excludeId = null)
        {
            return await _dbSet.AnyAsync(s =>
                (!excludeId.HasValue || s.Id != excludeId.Value) &&
                s.UserId == userId);
        }

        public async Task<(List<Supplier> Suppliers, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            int? categoryId,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(s => s.User)
                .Include(s => s.Category)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(s =>
                    s.CompanyName.ToLower().Contains(kw) ||
                    s.ContactName.ToLower().Contains(kw) ||
                    s.Email.ToLower().Contains(kw) ||
                    s.Phone.ToLower().Contains(kw) ||
                    s.Address.ToLower().Contains(kw) ||
                    s.User.UserName.ToLower().Contains(kw) ||
                    (s.Category != null && (s.Category.NameVi.ToLower().Contains(kw) || s.Category.NameEn.ToLower().Contains(kw))));
            }

            if (isActive.HasValue)
            {
                query = query.Where(s => s.IsActive == isActive.Value);
            }

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(s => s.CategoryId == categoryId.Value);
            }

            var desc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);
            query = sortBy?.Trim().ToLowerInvariant() switch
            {
                "companyname" or "company" => desc ? query.OrderByDescending(s => s.CompanyName) : query.OrderBy(s => s.CompanyName),
                "category" => desc ? query.OrderByDescending(s => s.Category!.NameVi) : query.OrderBy(s => s.Category!.NameVi),
                "createdat" => desc ? query.OrderByDescending(s => s.CreatedAt) : query.OrderBy(s => s.CreatedAt),
                _ => query.OrderByDescending(s => s.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var suppliers = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (suppliers, totalCount);
        }
    }
}
