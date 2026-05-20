namespace BaseCore.Entities
{
    public class OrderStockAllocation
    {
        public int Id { get; set; }
        public int OrderDetailId { get; set; }
        public OrderDetail OrderDetail { get; set; } = null!;
        public int StockBatchId { get; set; }
        public StockBatch StockBatch { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal UnitImportPrice { get; set; }
    }
}
