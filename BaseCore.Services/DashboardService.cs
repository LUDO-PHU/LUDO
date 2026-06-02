using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly IReceiptRepositoryEF _receiptRepository;
        private readonly ISupplierRepositoryEF _supplierRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly BaseCoreSalesContext _db;
        private readonly IRevenueService _revenueService;

        public DashboardService(
            IOrderRepositoryEF orderRepository,
            IProductRepositoryEF productRepository,
            IReceiptRepositoryEF receiptRepository,
            ISupplierRepositoryEF supplierRepository,
            INotificationRepository notificationRepository,
            BaseCoreSalesContext db,
            IRevenueService revenueService)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _receiptRepository = receiptRepository;
            _supplierRepository = supplierRepository;
            _notificationRepository = notificationRepository;
            _db = db;
            _revenueService = revenueService;
        }

        public async Task<ApiResponse<DashboardStatsDto>> GetStatsAsync()
        {
            var orders = await _orderRepository.GetAllWithDetailsAsync();
            var receipts = await _receiptRepository.GetAllAsync();
            var products = await _productRepository.GetAllAsync();

            var completedOrders = orders.Where(o => OrderService.ToPublicStatus(o.Status) == "Completed").ToList();
            var pendingOrders = orders.Count(o => OrderService.ToPublicStatus(o.Status) == "Pending");
            var pendingReceipts = receipts.Count(r => r.Status == ReceiptStatus.Pending);
            var shippingOrders = orders.Count(o => OrderService.ToPublicStatus(o.Status) == "Shipping");
            var cancelledOrders = orders.Count(o => OrderService.ToPublicStatus(o.Status) == "Cancelled");
            var returnedToStockOrders = orders.Count(o => o.Status == OrderStatus.ReturnedToStock);
            var exchangeRequestsCount = await _db.ReturnRequests.CountAsync(r => r.Status == ReturnRequestStatus.Pending);
            var revenue = await _revenueService.GetAdminRevenueAsync();
            
            var stats = new DashboardStatsDto
            {
                TotalRevenue = revenue.Data?.CurrentRevenue ?? 0,
                TotalProfit = revenue.Data?.TotalSaleProfit ?? 0,
                TotalProducts = products.Count(),
                TotalOrders = orders.Count(),
                PendingOrders = pendingOrders,
                PendingReceipts = pendingReceipts,
                ShippingOrders = shippingOrders,
                CompletedOrders = completedOrders.Count,
                CancelledOrders = cancelledOrders,
                TotalReceipts = receipts.Count(),
                ReturnedToStockOrders = returnedToStockOrders,
                ExchangeRequestsCount = exchangeRequestsCount,
                
                // Recent items
                RecentOrders = orders.OrderByDescending(o => o.CreatedAt).Take(5).Select(order => OrderService.MapOrder(order, "Admin")).ToList(),
                RecentReceipts = receipts.OrderByDescending(r => r.CreatedAt).Take(5).Select(receipt => ReceiptService.MapReceipt(receipt, "Admin")).ToList()
            };

            // Basic chart data (Last 7 days revenue - simplified demo logic)
            stats.RevenueChart = completedOrders
                .GroupBy(o => o.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .TakeLast(7)
                .Select(g => new ChartDataDto { Label = g.Key.ToString("dd/MM"), Value = g.Sum(o => o.TotalAmount) })
                .ToList();

            stats.OrderStatusChart = orders
                .GroupBy(o => OrderService.ToPublicStatus(o.Status))
                .Select(g => new ChartDataDto { Label = g.Key, Value = g.Count() })
                .ToList();

            return ApiResponse<DashboardStatsDto>.Ok(stats);
        }

        public async Task<ApiResponse<SupplierDashboardDto>> GetSupplierStatsAsync(int userId)
        {
            var supplier = await _supplierRepository.GetByUserIdAsync(userId);
            if (supplier == null)
            {
                return ApiResponse<SupplierDashboardDto>.Fail("Không tìm thấy nhà cung cấp của tài khoản này");
            }

            var (receipts, _) = await _receiptRepository.SearchAsync(null, supplier.Id, null, null, null, null, null, null, null, null, 1, 5);
            var (products, _) = await _productRepository.SearchAsync(null, supplier.CategoryId, null, null, supplier.Id, null, null, null, null, null, null, 1, 5);
            var notifications = await _notificationRepository.GetByUserIdAsync(userId);
            var totalProducts = await _db.Products.CountAsync(p => p.SupplierId == supplier.Id && p.CategoryId == supplier.CategoryId);
            var totalReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id);
            var pendingRequests = await _db.SupplierRequests.CountAsync(r => r.SupplierId == supplier.Id && r.Status == SupplierRequestStatus.Pending);
            var supplierRevenue = await _revenueService.GetSupplierRevenueAsync(supplier.Id);

            var dto = new SupplierDashboardDto
            {
                SupplierId = supplier.Id,
                CompanyName = supplier.CompanyName,
                Email = supplier.Email,
                Phone = supplier.Phone,
                Address = supplier.Address,
                CategoryId = supplier.CategoryId,
                CategoryName = supplier.Category?.NameVi ?? string.Empty,
                IsActive = supplier.IsActive,
                TotalProducts = totalProducts,
                TotalReceipts = totalReceipts,
                SupplierRevenue = supplierRevenue,
                PendingRequests = pendingRequests,
                UnreadNotifications = notifications.Count(n => !n.IsRead),
                PendingReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id && r.Status == ReceiptStatus.Pending),
                ShippingReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id && (r.Status == ReceiptStatus.Shipping || r.Status == ReceiptStatus.Confirmed)),
                DeliveredReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id && r.Status == ReceiptStatus.Delivered),
                CancelledReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id && r.Status == ReceiptStatus.CancelledBySupplier),
                RejectedReceipts = await _db.Receipts.CountAsync(r => r.SupplierId == supplier.Id && r.Status == ReceiptStatus.RejectedByAdmin),
                RecentReceipts = receipts.OrderByDescending(r => r.CreatedAt).Take(5).Select(receipt => ReceiptService.MapReceipt(receipt, "Supplier")).ToList(),
                RecentProducts = products.OrderByDescending(p => p.CreatedAt).Take(5).Select(ProductService.MapProduct).ToList(),
                Notifications = notifications.Take(5).Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Content = n.Message,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                }).ToList()
            };

            return ApiResponse<SupplierDashboardDto>.Ok(dto);
        }
    }
}
