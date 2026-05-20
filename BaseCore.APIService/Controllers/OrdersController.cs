using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/orders")]
    [ApiController]
    [Authorize]
    public class OrdersController : BaseController
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            return ToActionResult(await _orderService.GetAllAsync());
        }

        [HttpGet("my")]
        [HttpGet("my-orders")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMyOrders([FromQuery] OrderSearchRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            request ??= new OrderSearchRequestDto();
            request.UserId = userId.Value;
            return ToActionResult(await _orderService.SearchAsync(request));
        }

        [HttpGet("search")]
        [HttpGet("/api/admin/orders")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Search([FromQuery] OrderSearchRequestDto request)
        {
            request ??= new OrderSearchRequestDto();
            return ToActionResult(await _orderService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _orderService.GetByIdDtoAsync(id);
            if (response.Success && response.Data != null && !User.IsInRole("Admin") && response.Data.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            return ToActionResult(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto request)
        {
            request ??= new CreateOrderDto();
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            if (!User.IsInRole("Admin"))
            {
                request.UserId = userId.Value;
            }

            var response = await _orderService.CreateAsync(request);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }

            return BadRequest(response);
        }

        [HttpPost("checkout")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutOrderDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var response = await _orderService.CheckoutAsync(userId.Value, request ?? new CheckoutOrderDto());
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }

            return BadRequest(response);
        }

        [HttpPut("{id:int}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<OrderDto>.Fail("Vui lòng gửi dữ liệu yêu cầu"));
            }

            if (IsCompletionTarget(request.Status))
            {
                return BadRequest(ApiResponse<OrderDto>.Fail("Quản trị viên không thể tự hoàn tất đơn hàng. Doanh thu chỉ được tính sau khi người dùng xác nhận đã nhận hàng"));
            }

            return ToActionResult(await _orderService.UpdateStatusAsync(id, request));
        }

        [HttpPut("{id:int}/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Confirm(int id)
        {
            return ToActionResult(await _orderService.ConfirmAsync(id));
        }

        [HttpPut("{id:int}/received")]
        [HttpPut("{id:int}/complete")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> Received(int id)
        {
            var order = await _orderService.GetByIdDtoAsync(id);
            if (!order.Success || order.Data == null) return NotFound(order);
            if (order.Data.UserId != GetCurrentUserId()) return Forbid();

            return ToActionResult(await _orderService.MarkReceivedAsync(id));
        }

        [HttpPut("{id:int}/cancel")]
        [Authorize(Roles = "Admin,User")]
        public async Task<IActionResult> Cancel(int id, [FromBody] UpdateOrderStatusDto? request)
        {
            var order = await _orderService.GetByIdDtoAsync(id);
            if (!order.Success || order.Data == null) return NotFound(order);

            if (!User.IsInRole("Admin") && order.Data.UserId != GetCurrentUserId())
            {
                return Forbid();
            }

            return ToActionResult(await _orderService.CancelAsync(id, User.IsInRole("Admin"), request?.CancelReason));
        }

        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(int id, [FromBody] UpdateOrderStatusDto? request)
        {
            return ToActionResult(await _orderService.CancelAsync(id, isAdmin: true, request?.CancelReason));
        }

        private static bool IsCompletionTarget(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return false;
            }

            var value = status.Trim().ToLowerInvariant();
            return value is "completed" or "complete" or "delivered" or "received" or "receive";
        }
    }
}
