using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface IReviewRepositoryEF : IRepository<Review>
    {
        Task<List<Review>> GetByProductAsync(int productId);
        Task<List<Review>> GetByUserAsync(int userId);
        Task<Review?> GetByUserAndOrderAsync(int userId, int orderId, int productId);
    }

    public class ReviewRepositoryEF : Repository<Review>, IReviewRepositoryEF
    {
        public ReviewRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<List<Review>> GetByProductAsync(int productId)
        {
            return await _dbSet
                .Include(r => r.User)
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Review>> GetByUserAsync(int userId)
        {
            return await _dbSet
                .Include(r => r.Product)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<Review?> GetByUserAndOrderAsync(int userId, int orderId, int productId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(r => r.UserId == userId && r.OrderId == orderId && r.ProductId == productId);
        }
    }
}
