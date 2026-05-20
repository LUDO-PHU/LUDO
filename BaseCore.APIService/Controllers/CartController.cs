using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize(Roles = "User")]
    public class CartController : BaseController
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _cartService.GetCartAsync(userId.Value));
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _cartService.AddToCartAsync(userId.Value, request));
        }

        [HttpPost("items")]
        public async Task<IActionResult> AddItem([FromBody] AddToCartDto request)
        {
            return await AddToCart(request);
        }

        [HttpPut("items/{productId:int}")]
        public async Task<IActionResult> UpdateQuantity(int productId, [FromBody] UpdateCartQuantityDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _cartService.UpdateQuantityAsync(userId.Value, productId, request.Quantity));
        }

        [HttpDelete("items/{productId:int}")]
        public async Task<IActionResult> RemoveFromCart(int productId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _cartService.RemoveFromCartAsync(userId.Value, productId));
        }

        [HttpDelete("clear")]
        public async Task<IActionResult> ClearCart()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _cartService.ClearCartAsync(userId.Value));
        }
    }
}
