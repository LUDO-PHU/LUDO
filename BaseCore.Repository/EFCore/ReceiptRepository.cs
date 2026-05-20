using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface IReceiptRepositoryEF : IRepository<Receipt>
    {
        Task<Receipt?> GetByIdWithDetailsAsync(int id);
        Task<(List<Receipt> Receipts, int TotalCount)> SearchAsync(
            string? keyword,
            int? supplierId,
            int? productId,
            int? categoryId,
            ReceiptType? receiptType,
            ReceiptStatus? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize);
    }

    public class ReceiptRepositoryEF : Repository<Receipt>, IReceiptRepositoryEF
    {
        public ReceiptRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<Receipt?> GetByIdWithDetailsAsync(int id)
        {
            return await _dbSet
                .Include(r => r.Supplier)
                .ThenInclude(s => s.User)
                .Include(r => r.Supplier)
                .ThenInclude(s => s.Category)
                .Include(r => r.Product)
                .ThenInclude(p => p.Category)
                .Include(r => r.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(r => r.Request)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<(List<Receipt> Receipts, int TotalCount)> SearchAsync(
            string? keyword,
            int? supplierId,
            int? productId,
            int? categoryId,
            ReceiptType? receiptType,
            ReceiptStatus? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(r => r.Supplier)
                .ThenInclude(s => s.User)
                .Include(r => r.Supplier)
                .ThenInclude(s => s.Category)
                .Include(r => r.Product)
                .ThenInclude(p => p.Category)
                .Include(r => r.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(r => r.Request)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(r =>
                    r.ReceiptCode.ToLower().Contains(kw) ||
                    r.Content.ToLower().Contains(kw) ||
                    r.FromAddress.ToLower().Contains(kw) ||
                    r.ToAddress.ToLower().Contains(kw) ||
                    r.Note.ToLower().Contains(kw) ||
                    r.Specifications.ToLower().Contains(kw) ||
                    r.Supplier.CompanyName.ToLower().Contains(kw) ||
                    r.Product.NameVi.ToLower().Contains(kw) ||
                    r.Product.NameEn.ToLower().Contains(kw) ||
                    r.Product.Category.NameVi.ToLower().Contains(kw) ||
                    r.Product.Category.NameEn.ToLower().Contains(kw));
            }

            if (supplierId.HasValue && supplierId > 0)
            {
                query = query.Where(r => r.SupplierId == supplierId.Value);
            }

            if (productId.HasValue && productId > 0)
            {
                query = query.Where(r => r.ProductId == productId.Value);
            }

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(r => r.Product.CategoryId == categoryId.Value);
            }

            if (receiptType.HasValue)
            {
                query = query.Where(r => r.ReceiptType == receiptType.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(r => r.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                var endDate = toDate.Value.Date.AddDays(1);
                query = query.Where(r => r.CreatedAt < endDate);
            }

            var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = sortBy?.Trim().ToLowerInvariant() switch
            {
                "code" or "receiptcode" => desc ? query.OrderByDescending(r => r.ReceiptCode) : query.OrderBy(r => r.ReceiptCode),
                "quantity" => desc ? query.OrderByDescending(r => r.Quantity) : query.OrderBy(r => r.Quantity),
                "unitimportprice" or "importprice" => desc ? query.OrderByDescending(r => r.ImportPrice) : query.OrderBy(r => r.ImportPrice),
                "totalamount" or "totalimportamount" => desc ? query.OrderByDescending(r => r.TotalImportAmount) : query.OrderBy(r => r.TotalImportAmount),
                "status" => desc ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status),
                "createdat" => desc ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt),
                _ => query.OrderByDescending(r => r.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var receipts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (receipts, totalCount);
        }
    }
}
