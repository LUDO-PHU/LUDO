using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IReviewService
    {
        Task<ApiResponse<IReadOnlyList<ReviewDto>>> GetByProductAsync(int productId);
        Task<ApiResponse<IReadOnlyList<ReviewDto>>> GetByUserAsync(int userId);
        Task<ApiResponse<ReviewEligibilityDto>> GetEligibilityAsync(int userId, int productId);
        Task<ApiResponse<ReviewDto>> CreateAsync(int userId, CreateReviewDto request);
    }
}
