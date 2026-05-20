using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet("product/{productId}")]
        [HttpGet("/api/products/{productId:int}/reviews")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ReviewDto>>>> GetByProduct(int productId)
        {
            var response = await _reviewService.GetByProductAsync(productId);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<ReviewDto>>>> GetMyReviews()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var response = await _reviewService.GetByUserAsync(userId);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpPost]
        [Authorize(Roles = "User")]
        public async Task<ActionResult<ApiResponse<ReviewDto>>> Create([FromBody] CreateReviewDto request)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var response = await _reviewService.CreateAsync(userId, request);
            return response.Success ? Ok(response) : BadRequest(response);
        }
    }
}
