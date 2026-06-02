using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class ReviewService : IReviewService
    {
        private readonly IReviewRepositoryEF _reviewRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly BaseCoreSalesContext _db;

        public ReviewService(
            IReviewRepositoryEF reviewRepository,
            IProductRepositoryEF productRepository,
            BaseCoreSalesContext db)
        {
            _reviewRepository = reviewRepository;
            _productRepository = productRepository;
            _db = db;
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

        public async Task<ApiResponse<ReviewEligibilityDto>> GetEligibilityAsync(int userId, int productId)
        {
            if (userId <= 0)
                return ApiResponse<ReviewEligibilityDto>.Fail("M\u00e3 ng\u01b0\u1eddi d\u00f9ng kh\u00f4ng h\u1ee3p l\u1ec7");

            if (productId <= 0)
                return ApiResponse<ReviewEligibilityDto>.Fail("M\u00e3 s\u1ea3n ph\u1ea9m kh\u00f4ng h\u1ee3p l\u1ec7");

            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null)
                return ApiResponse<ReviewEligibilityDto>.Fail("Kh\u00f4ng t\u00ecm th\u1ea5y s\u1ea3n ph\u1ea9m");

            return ApiResponse<ReviewEligibilityDto>.Ok(new ReviewEligibilityDto
            {
                ProductId = productId,
                CanReview = true,
                Reason = string.Empty
            });
        }

        public async Task<ApiResponse<ReviewDto>> CreateAsync(int userId, CreateReviewDto request)
        {
            if (userId <= 0)
                return ApiResponse<ReviewDto>.Fail("Mã người dùng không hợp lệ");

            if (request == null)
                return ApiResponse<ReviewDto>.Fail("Vui lòng gửi dữ liệu yêu cầu");

            if (request.Rating < 1 || request.Rating > 5)
                return ApiResponse<ReviewDto>.Fail("Điểm đánh giá phải từ 1 đến 5");

            var product = await _productRepository.GetByIdAsync(request.ProductId);
            if (product == null)
                return ApiResponse<ReviewDto>.Fail("Không tìm thấy sản phẩm");

            if (!request.OrderId.HasValue || request.OrderId.Value <= 0)
            {
                return ApiResponse<ReviewDto>.Fail("Mã đơn mua hàng là bắt buộc để đánh giá sản phẩm");
            }

            // Verify order exists, belongs to the user, is Completed, and contains the product
            var order = await _db.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId.Value);

            if (order == null)
            {
                return ApiResponse<ReviewDto>.Fail("Không tìm thấy đơn hàng");
            }

            if (order.UserId != userId)
            {
                return ApiResponse<ReviewDto>.Fail("Đơn hàng này không thuộc về tài khoản của bạn");
            }

            if (order.Status != OrderStatus.Completed)
            {
                return ApiResponse<ReviewDto>.Fail("Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã giao thành công");
            }

            var hasProduct = order.OrderDetails.Any(d => d.ProductId == request.ProductId);
            if (!hasProduct)
            {
                return ApiResponse<ReviewDto>.Fail("Sản phẩm này không nằm trong đơn hàng đã mua");
            }

            var existingReview = await _reviewRepository.GetByUserAndOrderAsync(userId, request.OrderId.Value, request.ProductId);
            if (existingReview != null)
            {
                existingReview.Rating = request.Rating;
                existingReview.Comment = request.Comment?.Trim() ?? string.Empty;
                existingReview.CreatedAt = DateTime.UtcNow;

                await _reviewRepository.UpdateAsync(existingReview);
                
                if (existingReview.Order == null)
                {
                    existingReview.Order = order;
                }
                if (existingReview.User == null)
                {
                    existingReview.User = await _db.Users.FindAsync(userId);
                }
                if (existingReview.Product == null)
                {
                    existingReview.Product = product;
                }

                return ApiResponse<ReviewDto>.Ok(MapReview(existingReview), "Đã cập nhật đánh giá");
            }

            var review = new Review
            {
                UserId = userId,
                ProductId = request.ProductId,
                OrderId = request.OrderId.Value,
                Rating = request.Rating,
                Comment = request.Comment?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            await _reviewRepository.AddAsync(review);

            var savedReview = await _reviewRepository.GetByUserAndOrderAsync(userId, request.OrderId.Value, request.ProductId) ?? review;
            
            if (savedReview.User == null)
            {
                savedReview.User = await _db.Users.FindAsync(userId);
            }
            if (savedReview.Product == null)
            {
                savedReview.Product = product;
            }
            if (savedReview.Order == null)
            {
                savedReview.Order = order;
            }

            var result = MapReview(savedReview);
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
                OrderCode = review.Order?.OrderCode ?? string.Empty,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt
            };
        }
    }
}
