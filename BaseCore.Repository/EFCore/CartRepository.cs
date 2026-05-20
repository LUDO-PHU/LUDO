using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Repository.EFCore
{
    public interface ICartRepository : IRepository<CartItem>
    {
        Task<List<CartItem>> GetByUserIdAsync(int userId);
        Task<CartItem?> GetByUserAndProductAsync(int userId, int productId);
    }

    public class CartRepository : Repository<CartItem>, ICartRepository
    {
        public CartRepository(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<List<CartItem>> GetByUserIdAsync(int userId)
        {
            return await _dbSet
                .Include(c => c.Product)
                .ThenInclude(p => p.ProductImages)
                .Where(c => c.UserId == userId)
                .ToListAsync();
        }

        public async Task<CartItem?> GetByUserAndProductAsync(int userId, int productId)
        {
            return await _dbSet
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ProductId == productId);
        }
    }
}
