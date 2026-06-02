using System.Collections.Generic;

namespace BaseCore.DTO.Sales
{
    public class DashboardStatsDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal TotalProfit { get; set; }
        public int TotalProducts { get; set; }
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public int PendingReceipts { get; set; }
        public int ShippingOrders { get; set; }
        public int CompletedOrders { get; set; }
        public int CancelledOrders { get; set; }
        public int TotalReceipts { get; set; }
        public int ReturnedToStockOrders { get; set; }
        public int ExchangeRequestsCount { get; set; }
        public List<ChartDataDto> RevenueChart { get; set; } = new();
        public List<ChartDataDto> OrderStatusChart { get; set; } = new();
        public List<OrderDto> RecentOrders { get; set; } = new();
        public List<ReceiptDto> RecentReceipts { get; set; } = new();
    }

    public class SupplierDashboardDto
    {
        public int SupplierId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int? CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int TotalProducts { get; set; }
        public int TotalReceipts { get; set; }
        public decimal SupplierRevenue { get; set; }
        public int PendingRequests { get; set; }
        public int UnreadNotifications { get; set; }
        public int PendingReceipts { get; set; }
        public int ShippingReceipts { get; set; }
        public int DeliveredReceipts { get; set; }
        public int CancelledReceipts { get; set; }
        public int RejectedReceipts { get; set; }
        public List<ReceiptDto> RecentReceipts { get; set; } = new();
        public List<ProductDto> RecentProducts { get; set; } = new();
        public List<NotificationDto> Notifications { get; set; } = new();
    }

    public class ChartDataDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }
}
