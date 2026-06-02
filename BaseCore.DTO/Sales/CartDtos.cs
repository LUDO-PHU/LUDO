
namespace BaseCore.DTO.Sales
{
    public class CartItemDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal FinalPrice => Price;
        public int Quantity { get; set; }
        public DateTime CreatedAt { get; set; }
        public int ProductStock { get; set; }
        public bool IsAvailable { get; set; }
        public bool CanCheckout => IsAvailable && ProductStock > 0 && Quantity <= ProductStock;
        public bool CanIncreaseQuantity => IsAvailable && Quantity < ProductStock;
        public string StockText => IsAvailable && ProductStock > 0
            ? $"C\u00f2n {ProductStock} s\u1ea3n ph\u1ea9m"
            : "H\u1ebft h\u00e0ng";
        public string CheckoutDisabledReason
        {
            get
            {
                if (CanCheckout) return string.Empty;
                if (!IsAvailable || ProductStock <= 0) return "H\u1ebft h\u00e0ng";
                return $"Ch\u1ec9 c\u00f2n {ProductStock}, \u0111ang ch\u1ecdn {Quantity}";
            }
        }
        public decimal LineTotal => Price * Quantity;
        public decimal Total => Price * Quantity;
    }

    public class AddToCartDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? SelectedImageUrl { get; set; }
    }

    public class UpdateCartQuantityDto
    {
        public int Quantity { get; set; }
    }
}
