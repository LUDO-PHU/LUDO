using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;

namespace BaseCore.Services
{
    public interface IOrderService
    {
        Task<ApiResponse<PagedResult<OrderDto>>> SearchAsync(OrderSearchRequestDto request, string? viewerRole = "Admin");
        Task<ApiResponse<IReadOnlyList<OrderDto>>> GetAllAsync();
        Task<ApiResponse<IReadOnlyList<OrderDto>>> GetByUserIdDtoAsync(int userId);
        Task<ApiResponse<OrderDto>> GetByIdDtoAsync(int id, string? viewerRole = null);
        Task<ApiResponse<OrderDto>> CreateAsync(CreateOrderDto request);
        Task<ApiResponse<OrderDto>> CheckoutAsync(int userId, CheckoutOrderDto request);
        Task<ApiResponse<OrderDto>> UpdateStatusAsync(int id, UpdateOrderStatusDto request);
        Task<ApiResponse<OrderDto>> ConfirmAsync(int id);
        Task<ApiResponse<OrderDto>> MarkReceivedAsync(int id);
        Task<ApiResponse<OrderDto>> CancelAsync(int id, bool isAdmin, string? cancelReason = null);
        Task<ApiResponse<OrderDto>> ReturnToStockAsync(int id);

        Task<Order> CreateOrderAsync(Order order);
        Task<List<Order>> GetOrdersByUserIdAsync(string userId);
        Task<Order?> GetOrderByIdAsync(int id);
    }
}
