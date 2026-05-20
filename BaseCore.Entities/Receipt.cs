using System;

namespace BaseCore.Entities
{
    public class Receipt
    {
        public int Id { get; set; }
        public string ReceiptCode { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;
        public int? AdminId { get; set; }
        public User? Admin { get; set; }
        public int? RequestId { get; set; }
        public SupplierRequest? Request { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal TotalImportAmount { get; set; }
        public ReceiptType ReceiptType { get; set; } = ReceiptType.ProposalReceipt;
        public string ImageUrl { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public string Note { get; set; } = string.Empty;
        public string FromAddress { get; set; } = string.Empty;
        public string ToAddress { get; set; } = string.Empty;
        public ReceiptStatus Status { get; set; } = ReceiptStatus.Pending;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippingAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string CancelReason { get; set; } = string.Empty;
    }
}
