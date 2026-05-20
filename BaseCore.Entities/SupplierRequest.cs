using System;

namespace BaseCore.Entities
{
    public class SupplierRequest
    {
        public int Id { get; set; }
        public int AdminId { get; set; }
        public User Admin { get; set; } = null!;
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;
        public int CategoryId { get; set; }
        public Category Category { get; set; } = null!;
        public int? ProductId { get; set; }
        public Product? Product { get; set; }
        public string RequestedProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal SuggestedPrice { get; set; }
        public string Note { get; set; } = string.Empty;
        public SupplierRequestStatus Status { get; set; } = SupplierRequestStatus.Pending;
        public string RejectionReason { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
