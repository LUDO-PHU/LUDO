using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface IOrderRepositoryEF : IRepository<Order>
    {
        Task<List<Order>> GetByUserAsync(int userId);
        Task<Order?> GetWithDetailsAsync(int orderId);
        Task<Order?> GetByCodeWithDetailsAsync(string orderCode);
        Task<List<Order>> GetAllWithDetailsAsync();
        Task<(List<Order> Orders, int TotalCount)> SearchAsync(
            string? keyword,
            int? userId,
            IReadOnlyCollection<OrderStatus>? statuses,
            DateTime? fromDate,
            DateTime? toDate,
            decimal? minTotal,
            decimal? maxTotal,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize);
    }

    public class OrderRepositoryEF : Repository<Order>, IOrderRepositoryEF
    {
        public OrderRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<List<Order>> GetByUserAsync(int userId)
        {
            return await _dbSet
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .ThenInclude(p => p.ProductImages)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<Order?> GetWithDetailsAsync(int orderId)
        {
            return await _dbSet
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .ThenInclude(a => a.StockBatch)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public async Task<Order?> GetByCodeWithDetailsAsync(string orderCode)
        {
            var value = orderCode.Trim().ToLower();
            return await _dbSet
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .ThenInclude(a => a.StockBatch)
                .FirstOrDefaultAsync(o => o.OrderCode.ToLower() == value);
        }

        public async Task<List<Order>> GetAllWithDetailsAsync()
        {
            return await _dbSet
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .ThenInclude(a => a.StockBatch)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<(List<Order> Orders, int TotalCount)> SearchAsync(
            string? keyword,
            int? userId,
            IReadOnlyCollection<OrderStatus>? statuses,
            DateTime? fromDate,
            DateTime? toDate,
            decimal? minTotal,
            decimal? maxTotal,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .ThenInclude(p => p.ProductImages)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .ThenInclude(a => a.StockBatch)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                query = query.Where(o =>
                    o.OrderCode.ToLower().Contains(kw) ||
                    o.CustomerName.ToLower().Contains(kw) ||
                    o.CustomerPhone.ToLower().Contains(kw) ||
                    o.ShippingAddress.ToLower().Contains(kw) ||
                    o.Note.ToLower().Contains(kw) ||
                    o.User.UserName.ToLower().Contains(kw) ||
                    o.User.FullName.ToLower().Contains(kw) ||
                    o.User.Email.ToLower().Contains(kw) ||
                    o.User.Phone.ToLower().Contains(kw));
            }

            if (userId.HasValue && userId > 0)
            {
                query = query.Where(o => o.UserId == userId.Value);
            }

            if (statuses is { Count: > 0 })
            {
                query = query.Where(o => statuses.Contains(o.Status));
            }

            if (fromDate.HasValue)
            {
                query = query.Where(o => o.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                var endDate = toDate.Value.Date.AddDays(1);
                query = query.Where(o => o.CreatedAt < endDate);
            }

            if (minTotal.HasValue)
            {
                query = query.Where(o => o.TotalAmount >= minTotal.Value);
            }

            if (maxTotal.HasValue)
            {
                query = query.Where(o => o.TotalAmount <= maxTotal.Value);
            }

            var desc = !string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = sortBy?.Trim().ToLowerInvariant() switch
            {
                "code" or "ordercode" => desc ? query.OrderByDescending(o => o.OrderCode) : query.OrderBy(o => o.OrderCode),
                "customer" or "customername" => desc ? query.OrderByDescending(o => o.CustomerName) : query.OrderBy(o => o.CustomerName),
                "total" or "totalamount" => desc ? query.OrderByDescending(o => o.TotalAmount) : query.OrderBy(o => o.TotalAmount),
                "profit" => desc ? query.OrderByDescending(o => o.Profit) : query.OrderBy(o => o.Profit),
                "status" => desc ? query.OrderByDescending(o => o.Status) : query.OrderBy(o => o.Status),
                "createdat" => desc ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt),
                _ => query.OrderByDescending(o => o.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var orders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (orders, totalCount);
        }
    }

    public interface IOrderDetailRepositoryEF : IRepository<OrderDetail>
    {
        Task<List<OrderDetail>> GetByOrderAsync(int orderId);
    }

    public class OrderDetailRepositoryEF : Repository<OrderDetail>, IOrderDetailRepositoryEF
    {
        public OrderDetailRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<List<OrderDetail>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(od => od.OrderId == orderId)
                .Include(od => od.Product)
                .ThenInclude(p => p.ProductImages)
                .ToListAsync();
        }
    }
}
