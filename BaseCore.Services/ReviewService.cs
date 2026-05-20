using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IReviewRepositoryEF _reviewRepository;
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IProductRepositoryEF _productRepository;

        public ReviewService(
            IReviewRepositoryEF reviewRepository,
            IOrderRepositoryEF orderRepository,
            IProductRepositoryEF productRepository)
        {
            _reviewRepository = reviewRepository;
            _orderRepository = orderRepository;
            _productRepository = productRepository;
        }

        public async Task<ApiResponse<IReadOnlyList<ReviewDto>>> GetByProductAsync(int productId)
        {
            var reviews = await _reviewRepository.GetByProductAsync(productId);
            return ApiResponse<IReadOnlyList<ReviewDto>>.Ok(reviews.Select(MapReview).ToList());
        }

        public async Task<ApiResponse<IReadOnlyList<ReviewDto>>> GetByUserAsync(int userId)
        {
            var reviews = await _reviewRepository.GetByUserAsync(userId);
            return ApiResponse<IReadOnlyList<ReviewDto>>.Ok(reviews.Select(MapReview).ToList());
        }

        public async Task<ApiResponse<ReviewDto>> CreateAsync(int userId, CreateReviewDto request)
        {
            if (userId <= 0)
                return ApiResponse<ReviewDto>.Fail("Mã người dùng không hợp lệ");

            if (request == null)
                return ApiResponse<ReviewDto>.Fail("Vui lòng gửi dữ liệu yêu cầu");

            if (request.Rating < 1 || request.Rating > 5)
                return ApiResponse<ReviewDto>.Fail("Điểm đánh giá phải từ 1 đến 5");

            // 1. Kiểm tra đơn hàng có tồn tại và thuộc về user không, có trạng thái Completed không
            var order = await _orderRepository.GetWithDetailsAsync(request.OrderId);
            if (order == null || order.UserId != userId)
                return ApiResponse<ReviewDto>.Fail("Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập");

            if (order.Status != OrderStatus.Completed)
                return ApiResponse<ReviewDto>.Fail("Bạn chỉ có thể đánh giá sản phẩm trong đơn hàng đã hoàn tất");

            // 2. Kiểm tra sản phẩm có trong đơn hàng không
            if (!order.OrderDetails.Any(d => d.ProductId == request.ProductId))
                return ApiResponse<ReviewDto>.Fail("Sản phẩm này không có trong đơn hàng đã chọn");

            // 3. Kiểm tra xem user đã review sản phẩm này trong đơn hàng này chưa
            var existingReview = await _reviewRepository.GetByUserAndOrderAsync(userId, request.OrderId, request.ProductId);
            if (existingReview != null)
                return ApiResponse<ReviewDto>.Fail("Bạn đã đánh giá sản phẩm này cho đơn hàng này");

            var review = new Review
            {
                UserId = userId,
                ProductId = request.ProductId,
                OrderId = request.OrderId,
                Rating = request.Rating,
                Comment = request.Comment?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            await _reviewRepository.AddAsync(review);

            // Fetch lại để có User navigation property map
            var created = await _reviewRepository.GetByIdAsync(review.Id);
            
            // Note: Since _reviewRepository.GetByIdAsync doesn't include User, we can just use the user info from Order
            var result = MapReview(review);
            result.UserName = order.User?.UserName ?? string.Empty;

            return ApiResponse<ReviewDto>.Ok(result, "Đã gửi đánh giá");
        }

        private static ReviewDto MapReview(Review review)
        {
            return new ReviewDto
            {
                Id = review.Id,
                UserId = review.UserId,
                UserName = review.User?.UserName ?? string.Empty,
                ProductId = review.ProductId,
                ProductName = review.Product?.NameVi ?? string.Empty,
                OrderId = review.OrderId,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            };
        }
    }
}
