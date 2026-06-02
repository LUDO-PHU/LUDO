namespace BaseCore.DTO.Sales
{
    public class ReceiptProductItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string MainImage { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public IReadOnlyList<ProductImageDto> Images { get; set; } = Array.Empty<ProductImageDto>();
        public int Quantity { get; set; }
        public decimal UnitImportPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public string Note { get; set; } = string.Empty;
    }

    public class ReceiptDto
    {
        public int Id { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string SupplierCompanyName { get; set; } = string.Empty;
        public int? RequestId { get; set; }
        public int? AdminId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal UnitImportPrice { get; set; }
        public decimal TotalImportAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string ReceiptType { get; set; } = string.Empty;
        public string ReceiptTypeLabel { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string ProductMainImage { get; set; } = string.Empty;
        public IReadOnlyList<ProductImageDto> ProductImages { get; set; } = Array.Empty<ProductImageDto>();
        public IReadOnlyList<ReceiptProductItemDto> Items { get; set; } = Array.Empty<ReceiptProductItemDto>();
        public string Content { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippingAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string CancelReason { get; set; } = string.Empty;
        public IReadOnlyList<string> AllowedActions { get; set; } = Array.Empty<string>();
    }

    public class ReceiptItemCreationDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitImportPrice { get; set; }
        public string Note { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class CreateReceiptDto
    {
        public int? SupplierId { get; set; }
        public int? RequestId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal? UnitImportPrice { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public List<ReceiptItemCreationDto>? Items { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
    }

    public class UpdateReceiptStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? CancelReason { get; set; }
    }

    public class ReceiptSearchRequestDto
    {
        public string? Keyword { get; set; }
        public int? SupplierId { get; set; }
        public int? ProductId { get; set; }
        public int? CategoryId { get; set; }
        public string? ReceiptType { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? SortBy { get; set; }
        public string? SortDir { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
