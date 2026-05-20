namespace BaseCore.Entities
{
    public class OrderDetail
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;
        public int ProductId { get; set; }
        public Product Product { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal UnitImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal FinalPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal TotalImportCost { get; set; }
        public decimal Profit { get; set; }
        public ICollection<OrderStockAllocation> StockAllocations { get; set; } = new List<OrderStockAllocation>();
    }
}
