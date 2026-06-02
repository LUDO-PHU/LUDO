namespace BaseCore.DTO.Sales
{
    public class SupplierRequestDto
    {
        public int Id { get; set; }
        public int AdminId { get; set; }
        public string AdminName { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string SupplierCompanyName { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string RequestedProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal SuggestedPrice { get; set; }
        public string Note { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string RejectionReason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public IReadOnlyList<string> AllowedActions { get; set; } = Array.Empty<string>();
        public string ProductImageUrl { get; set; } = string.Empty;
    }

    public class CreateSupplierRequestDto
    {
        public int SupplierId { get; set; }
        public int CategoryId { get; set; }
        public int? ProductId { get; set; }
        public string RequestedProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal SuggestedPrice { get; set; }
        public string Note { get; set; } = string.Empty;
    }

    public class SupplierRequestSearchRequestDto
    {
        public string? Keyword { get; set; }
        public int? SupplierId { get; set; }
        public int? CategoryId { get; set; }
        public int? ProductId { get; set; }
        public string? Status { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? SortBy { get; set; }
        public string? SortDir { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class RejectSupplierRequestDto
    {
        public string RejectionReason { get; set; } = string.Empty;
    }

    public class SupplierRequestReceiptPrefillDto
    {
        public int RequestId { get; set; }
        public int? ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string RequestedProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal SuggestedPrice { get; set; }
        public string ReceiptType { get; set; } = "RequestedReceipt";
        public string Note { get; set; } = string.Empty;
    }
}
