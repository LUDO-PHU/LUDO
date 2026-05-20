using System;

namespace BaseCore.Entities
{
    public class StockBatch
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int SupplierId { get; set; }
        public Supplier Supplier { get; set; } = null!;
        public int? ReceiptId { get; set; }
        public Receipt? Receipt { get; set; }
        public int QuantityImported { get; set; }
        public int QuantityRemaining { get; set; }
        public decimal UnitImportPrice { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
