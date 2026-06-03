using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class CartService : ICartService
    {
        private readonly ICartRepository _cartRepository;
        private readonly IProductRepositoryEF _productRepository;

        public CartService(ICartRepository cartRepository, IProductRepositoryEF productRepository)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
        }

        public async Task<ApiResponse<List<CartItemDto>>> GetCartAsync(int userId)
        {
            var items = await _cartRepository.GetByUserIdAsync(userId);
            var dtos = items.Select(i => new CartItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product?.NameVi ?? "Không xác định",
                ImageUrl = !string.IsNullOrEmpty(i.SelectedImageUrl) ? i.SelectedImageUrl : (i.Product == null ? string.Empty : ProductService.GetMainImage(i.Product)),
                Price = i.Product == null
                    ? 0
                    : ProductService.CalculateFinalPrice(i.Product),
                OriginalPrice = i.Product?.Price ?? 0,
                DiscountPercent = i.Product?.DiscountPercent ?? 0,
                Quantity = i.Quantity,
                CreatedAt = i.CreatedAt,
                ProductStock = i.Product?.Stock ?? 0,
                IsAvailable = i.Product != null && ProductService.IsAvailableForSale(i.Product)
            }).ToList();

            return ApiResponse<List<CartItemDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<bool>> AddToCartAsync(int userId, AddToCartDto request)
        {
            if (request.Quantity <= 0) return ApiResponse<bool>.Fail("Số lượng phải lớn hơn 0");

            var product = await _productRepository.GetByIdAsync(request.ProductId);
            if (product == null) return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm");
            if (!string.Equals(product.Status, "Active", StringComparison.OrdinalIgnoreCase))
                return ApiResponse<bool>.Fail("Sản phẩm không khả dụng để bán");

            var existing = await _cartRepository.GetByUserAndProductAsync(userId, request.ProductId);
            var nextQuantity = (existing?.Quantity ?? 0) + request.Quantity;
            if (nextQuantity > product.Stock)
                return ApiResponse<bool>.Fail($"Sản phẩm '{product.NameVi}' chỉ còn {product.Stock} sản phẩm trong kho");

            if (existing != null)
            {
                existing.Quantity = nextQuantity;
                existing.SelectedImageUrl = request.SelectedImageUrl;
                await _cartRepository.UpdateAsync(existing);
            }
            else
            {
                await _cartRepository.AddAsync(new CartItem
                {
                    UserId = userId,
                    ProductId = request.ProductId,
                    Quantity = request.Quantity,
                    CreatedAt = DateTime.UtcNow,
                    SelectedImageUrl = request.SelectedImageUrl
                });
            }

            return ApiResponse<bool>.Ok(true, "Đã thêm vào giỏ hàng");
        }

        public async Task<ApiResponse<bool>> UpdateQuantityAsync(int userId, int productId, int quantity)
        {
            if (quantity <= 0) return await RemoveFromCartAsync(userId, productId);

            var existing = await _cartRepository.GetByUserAndProductAsync(userId, productId);
            if (existing == null) return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm trong giỏ hàng");

            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null) return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm");
            if (quantity > product.Stock)
                return ApiResponse<bool>.Fail($"Sản phẩm '{product.NameVi}' chỉ còn {product.Stock} sản phẩm trong kho");

            existing.Quantity = quantity;
            await _cartRepository.UpdateAsync(existing);
            return ApiResponse<bool>.Ok(true, "Đã cập nhật số lượng");
        }

        public async Task<ApiResponse<bool>> RemoveFromCartAsync(int userId, int productId)
        {
            var existing = await _cartRepository.GetByUserAndProductAsync(userId, productId);
            if (existing == null) return ApiResponse<bool>.Fail("Không tìm thấy sản phẩm trong giỏ hàng");

            await _cartRepository.DeleteAsync(existing);
            return ApiResponse<bool>.Ok(true, "Đã xóa sản phẩm khỏi giỏ hàng");
        }

        public async Task<ApiResponse<bool>> ClearCartAsync(int userId)
        {
            var items = await _cartRepository.GetByUserIdAsync(userId);
            foreach (var item in items)
            {
                await _cartRepository.DeleteAsync(item);
            }
            return ApiResponse<bool>.Ok(true, "Đã xóa toàn bộ giỏ hàng");
        }
    }
}
