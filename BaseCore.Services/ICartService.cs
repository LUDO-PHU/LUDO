using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ICartService
    {
        Task<ApiResponse<List<CartItemDto>>> GetCartAsync(int userId);
        Task<ApiResponse<bool>> AddToCartAsync(int userId, AddToCartDto request);
        Task<ApiResponse<bool>> UpdateQuantityAsync(int userId, int productId, int quantity);
        Task<ApiResponse<bool>> RemoveFromCartAsync(int userId, int productId);
        Task<ApiResponse<bool>> ClearCartAsync(int userId);
    }
}
