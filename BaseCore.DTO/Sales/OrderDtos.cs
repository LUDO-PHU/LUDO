namespace BaseCore.DTO.Sales
{
    public class OrderDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal TotalImportCost { get; set; }
        public decimal Profit { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CancelReason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippingAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public IReadOnlyList<OrderDetailDto> Details { get; set; } = Array.Empty<OrderDetailDto>();
    }

    public class OrderDetailDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string MainImage { get; set; } = string.Empty;
        public IReadOnlyList<ProductImageDto> ProductImages { get; set; } = Array.Empty<ProductImageDto>();
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal UnitImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal TotalImportCost { get; set; }
        public decimal Profit { get; set; }
    }

    public class CreateOrderDto
    {
        public int UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public IReadOnlyList<CreateOrderItemDto> Items { get; set; } = Array.Empty<CreateOrderItemDto>();
    }

    public class CheckoutOrderDto
    {
        public IReadOnlyList<int>? ProductIds { get; set; }
        public IReadOnlyList<CreateOrderItemDto>? Items { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
    }

    public class CreateOrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateOrderStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? CancelReason { get; set; }
    }

    public class OrderSearchRequestDto
    {
        public string? Keyword { get; set; }
        public int? UserId { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal? MinTotal { get; set; }
        public decimal? MaxTotal { get; set; }
        public string? SortBy { get; set; }
        public string? SortDir { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
