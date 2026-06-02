using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class OrderService : IOrderService
    {
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly IUserRepositoryEF _userRepository;
        private readonly ICartRepository _cartRepository;
        private readonly INotificationService _notificationService;
        private readonly BaseCoreSalesContext _db;

        public OrderService(
            IOrderRepositoryEF orderRepository,
            IProductRepositoryEF productRepository,
            IUserRepositoryEF userRepository,
            ICartRepository cartRepository,
            INotificationService notificationService,
            BaseCoreSalesContext db)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _cartRepository = cartRepository;
            _notificationService = notificationService;
            _db = db;
        }

        public async Task<ApiResponse<PagedResult<OrderDto>>> SearchAsync(OrderSearchRequestDto request, string? viewerRole = "Admin")
        {
            request ??= new OrderSearchRequestDto();
            NormalizePaging(request);

            if (!TryParseOrderStatusFilter(request.Status, out var statuses))
            {
                return ApiResponse<PagedResult<OrderDto>>.Fail("Trạng thái đơn hàng không hợp lệ");
            }

            var (orders, totalCount) = await _orderRepository.SearchAsync(
                request.Keyword,
                request.UserId,
                statuses,
                request.FromDate,
                request.ToDate,
                request.MinTotal,
                request.MaxTotal,
                request.SortBy,
                request.SortDir,
                request.Page,
                request.PageSize);

            return ApiResponse<PagedResult<OrderDto>>.Ok(new PagedResult<OrderDto>
            {
                Items = orders.Select(order => MapOrder(order, viewerRole)).ToList(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<OrderDto>>> GetAllAsync()
        {
            var orders = await _orderRepository.GetAllWithDetailsAsync();
            return ApiResponse<IReadOnlyList<OrderDto>>.Ok(orders.Select(order => MapOrder(order, "Admin")).ToList());
        }

        public async Task<ApiResponse<IReadOnlyList<OrderDto>>> GetByUserIdDtoAsync(int userId)
        {
            if (userId <= 0)
            {
                return ApiResponse<IReadOnlyList<OrderDto>>.Fail("Mã người dùng không hợp lệ");
            }

            var orders = await _orderRepository.GetByUserAsync(userId);
            return ApiResponse<IReadOnlyList<OrderDto>>.Ok(orders.Select(order => MapOrder(order, "User")).ToList());
        }

        public async Task<ApiResponse<OrderDto>> GetByIdDtoAsync(int id, string? viewerRole = null)
        {
            if (id <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã đơn hàng không hợp lệ");
            }

            var order = await _orderRepository.GetWithDetailsAsync(id);
            return order == null
                ? ApiResponse<OrderDto>.Fail("Không tìm thấy đơn hàng")
                : ApiResponse<OrderDto>.Ok(MapOrder(order, viewerRole));
        }

        public async Task<ApiResponse<OrderDto>> CreateAsync(CreateOrderDto request)
        {
            if (request == null)
            {
                return ApiResponse<OrderDto>.Fail("Vui lòng gửi dữ liệu yêu cầu");
            }

            var user = request.UserId > 0 ? await _userRepository.GetByIdAsync(request.UserId) : null;
            if (user == null)
            {
                return ApiResponse<OrderDto>.Fail("Người dùng không tồn tại");
            }

            if (!user.IsActive)
            {
                return ApiResponse<OrderDto>.Fail("Tài khoản đã ngừng hoạt động");
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                return ApiResponse<OrderDto>.Fail("Đơn hàng phải có ít nhất một sản phẩm");
            }

            if (string.IsNullOrWhiteSpace(request.ShippingAddress))
            {
                return ApiResponse<OrderDto>.Fail("Vui lòng nhập địa chỉ giao hàng");
            }

            var requestedItems = request.Items
                .GroupBy(i => i.ProductId)
                .Select(g => new CreateOrderItemDto 
                { 
                    ProductId = g.Key, 
                    Quantity = g.Sum(x => x.Quantity),
                    SelectedImageUrl = g.First().SelectedImageUrl 
                })
                .ToList();

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                decimal userTotalSpent = 0;
                if (user != null)
                {
                    var userOrders = await _db.Orders.Where(o => o.UserId == user.Id && o.Status == OrderStatus.Completed).ToListAsync();
                    userTotalSpent = userOrders.Sum(o => o.TotalAmount);
                }
                string userTier = GetMemberTier(userTotalSpent);
                decimal tierDiscountRate = GetTierDiscountRate(userTier);

                var orderDetails = new List<OrderDetail>();
                decimal totalAmount = 0;
                decimal totalImportCost = 0;

                foreach (var item in requestedItems)
                {
                    if (item.Quantity <= 0)
                    {
                        return ApiResponse<OrderDto>.Fail("Số lượng phải lớn hơn 0");
                    }

                    var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
                    if (product == null)
                    {
                        return ApiResponse<OrderDto>.Fail($"Không tìm thấy sản phẩm #{item.ProductId}");
                    }

                    if (!IsAvailableForSale(product))
                    {
                        return ApiResponse<OrderDto>.Fail($"Sản phẩm '{product.NameVi}' không khả dụng để bán");
                    }

                    if (product.Stock < item.Quantity)
                    {
                        return ApiResponse<OrderDto>.Fail($"Sản phẩm '{product.NameVi}' chỉ còn {product.Stock} sản phẩm trong kho");
                    }

                    var batches = await GetFifoBatchesAsync(product);
                    var availableInBatches = batches.Sum(b => b.QuantityRemaining);
                    if (availableInBatches < item.Quantity)
                    {
                        return ApiResponse<OrderDto>.Fail($"Sản phẩm '{product.NameVi}' chỉ còn {availableInBatches} sản phẩm có lô nhập trong kho");
                    }

                    var remaining = item.Quantity;
                    decimal lineImportCost = 0;
                    var allocations = new List<OrderStockAllocation>();
                    foreach (var batch in batches)
                    {
                        if (remaining <= 0)
                        {
                            break;
                        }

                        var usedQuantity = Math.Min(remaining, batch.QuantityRemaining);
                        if (usedQuantity <= 0)
                        {
                            continue;
                        }

                        batch.QuantityRemaining -= usedQuantity;
                        remaining -= usedQuantity;
                        lineImportCost += usedQuantity * batch.UnitImportPrice;
                        allocations.Add(new OrderStockAllocation
                        {
                            StockBatch = batch,
                            StockBatchId = batch.Id,
                            Quantity = usedQuantity,
                            UnitImportPrice = batch.UnitImportPrice
                        });
                    }

                    decimal basePrice = Math.Round(product.Price * (1m - product.DiscountPercent / 100m), 2);
                    decimal quantityDiscountRate = item.Quantity >= 3 ? 0.10m : 0m;
                    decimal itemDiscountRate = tierDiscountRate + quantityDiscountRate;
                    
                    var finalPrice = Math.Round(basePrice * (1m - itemDiscountRate), 2);
                    var lineTotal = finalPrice * item.Quantity;
                    var weightedUnitImportPrice = item.Quantity <= 0 ? 0 : Math.Round(lineImportCost / item.Quantity, 2);

                    totalAmount += lineTotal;
                    totalImportCost += lineImportCost;

                    product.Stock -= item.Quantity;
                    product.Status = NormalizeProductStatus(product.Stock, product.Status);
                    product.UpdatedAt = DateTime.UtcNow;

                    orderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = product.Price,
                        UnitImportPrice = weightedUnitImportPrice,
                        DiscountPercent = product.DiscountPercent,
                        FinalPrice = finalPrice,
                        TotalPrice = lineTotal,
                        TotalImportCost = lineImportCost,
                        Profit = lineTotal - lineImportCost,
                        StockAllocations = allocations,
                        SelectedImageUrl = item.SelectedImageUrl
                    });
                }

                if (totalAmount > 5000000m)
                {
                    totalAmount = Math.Round(totalAmount * 0.80m, 2);
                }

                var order = new Order
                {
                    UserId = request.UserId,
                    OrderCode = GenerateCode("ORD"),
                    CustomerName = string.IsNullOrWhiteSpace(request.CustomerName)
                        ? string.IsNullOrWhiteSpace(user.FullName) ? user.UserName : user.FullName
                        : request.CustomerName.Trim(),
                    CustomerPhone = string.IsNullOrWhiteSpace(request.CustomerPhone)
                        ? user.Phone
                        : request.CustomerPhone.Trim(),
                    ShippingAddress = request.ShippingAddress?.Trim() ?? string.Empty,
                    Note = request.Note?.Trim() ?? string.Empty,
                    TotalAmount = totalAmount,
                    TotalImportCost = totalImportCost,
                    Profit = totalAmount - totalImportCost,
                    Status = OrderStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    OrderDetails = orderDetails
                };

                _db.Orders.Add(order);

                var orderedProductIds = requestedItems.Select(i => i.ProductId).ToHashSet();
                var cartItems = await _db.CartItems
                    .Where(item => item.UserId == request.UserId && orderedProductIds.Contains(item.ProductId))
                    .ToListAsync();
                _db.CartItems.RemoveRange(cartItems);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                var created = await _orderRepository.GetWithDetailsAsync(order.Id) ?? order;
                return ApiResponse<OrderDto>.Ok(MapOrder(created, "User"), "Đã tạo đơn hàng");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<OrderDto>.Fail("Không thể tạo đơn hàng", ex.Message);
            }
        }

        public async Task<ApiResponse<OrderDto>> CheckoutAsync(int userId, CheckoutOrderDto request)
        {
            if (userId <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã người dùng không hợp lệ");
            }

            var cartItems = await _cartRepository.GetByUserIdAsync(userId);
            var selectedProductIds = GetCheckoutProductIds(request);
            if (selectedProductIds.Count > 0)
            {
                cartItems = cartItems.Where(item => selectedProductIds.Contains(item.ProductId)).ToList();
            }

            if (cartItems.Count == 0)
            {
                return ApiResponse<OrderDto>.Fail("Giỏ hàng đang trống");
            }

            return await CreateAsync(new CreateOrderDto
            {
                UserId = userId,
                CustomerName = request?.CustomerName ?? string.Empty,
                CustomerPhone = request?.CustomerPhone ?? string.Empty,
                ShippingAddress = request?.ShippingAddress ?? string.Empty,
                Note = request?.Note ?? string.Empty,
                Items = cartItems.Select(item => new CreateOrderItemDto
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    SelectedImageUrl = item.SelectedImageUrl
                }).ToList()
            });
        }

        private static HashSet<int> GetCheckoutProductIds(CheckoutOrderDto? request)
        {
            if (request?.ProductIds is { Count: > 0 })
            {
                return request.ProductIds.Where(id => id > 0).Distinct().ToHashSet();
            }

            if (request?.Items is { Count: > 0 })
            {
                return request.Items.Select(item => item.ProductId).Where(id => id > 0).Distinct().ToHashSet();
            }

            return new HashSet<int>();
        }

        public async Task<ApiResponse<OrderDto>> UpdateStatusAsync(int id, UpdateOrderStatusDto request)
        {
            if (request == null || !TryParseOrderStatusCommand(request.Status, out var targetStatus) || targetStatus == null)
            {
                return ApiResponse<OrderDto>.Fail("Trạng thái đơn hàng không hợp lệ");
            }

            return targetStatus.Value switch
            {
                OrderStatus.Confirmed or OrderStatus.Shipping => await ConfirmAsync(id),
                OrderStatus.Completed => await MarkReceivedAsync(id),
                OrderStatus.Cancelled or OrderStatus.CancelledByUser or OrderStatus.CancelledByAdmin or OrderStatus.Rejected
                    => await CancelAsync(id, isAdmin: true, request.CancelReason),
                OrderStatus.Delivered => ApiResponse<OrderDto>.Fail("Trạng thái đã giao không hợp lệ trong luồng này. Người dùng phải xác nhận đã nhận hàng để hoàn tất đơn"),
                OrderStatus.Pending => ApiResponse<OrderDto>.Fail("Không thể chuyển đơn hàng về trạng thái chờ xử lý"),
                OrderStatus.ReturnedToStock => ApiResponse<OrderDto>.Fail("Không thể chuyển thủ công sang trạng thái hoàn về kho. Trạng thái này được xử lý tự động."),
                _ => ApiResponse<OrderDto>.Fail("Trạng thái đơn hàng không hợp lệ")
            };
        }

        public async Task<ApiResponse<OrderDto>> ConfirmAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã đơn hàng không hợp lệ");
            }

            var order = await _db.Orders
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.Product)
                .Include(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .ThenInclude(a => a.StockBatch)
                .FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
            {
                return ApiResponse<OrderDto>.Fail("Không tìm thấy đơn hàng");
            }

            if (!IsPendingStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Chỉ có thể duyệt đơn hàng đang chờ xử lý");
            }

            order.Status = OrderStatus.Shipping;
            ApplyOrderTimestamp(order, OrderStatus.Shipping, null);
            await _orderRepository.UpdateAsync(order);

            await _notificationService.CreateSystemNotificationAsync(
                order.UserId,
                "Đơn hàng đang giao",
                $"Đơn #{order.OrderCode} đang được giao.",
                $"/customer/orders?orderId={order.Id}");

            return ApiResponse<OrderDto>.Ok(MapOrder(order, "Admin"), "Đã duyệt đơn hàng");
        }

        public async Task<ApiResponse<OrderDto>> MarkReceivedAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã đơn hàng không hợp lệ");
            }

            var order = await _orderRepository.GetWithDetailsAsync(id);
            if (order == null)
            {
                return ApiResponse<OrderDto>.Fail("Không tìm thấy đơn hàng");
            }

            if (!IsShippingStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Chỉ có thể xác nhận đã nhận với đơn hàng đang giao");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                order.Status = OrderStatus.Completed;
                ApplyOrderTimestamp(order, OrderStatus.Completed, null);

                var exists = await _db.RevenueTransactions.AnyAsync(t =>
                    t.OwnerType == "Admin" &&
                    t.TransactionType == "AdminSaleProfit" &&
                    t.ReferenceType == "Order" &&
                    t.ReferenceId == order.Id);

                if (!exists)
                {
                    _db.RevenueTransactions.Add(new RevenueTransaction
                    {
                        OwnerType = "Admin",
                        OwnerId = null,
                        Amount = order.Profit,
                        TransactionType = "AdminSaleProfit",
                        ReferenceType = "Order",
                        ReferenceId = order.Id,
                        Note = $"Lợi nhuận bán hàng của đơn {order.OrderCode}",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<OrderDto>.Fail("Không thể hoàn tất đơn hàng", ex.Message);
            }

            await _notificationService.CreateSystemNotificationAsync(
                order.UserId,
                "Đơn hàng đã giao",
                $"Đơn #{order.OrderCode} đã giao thành công.",
                $"/customer/orders?orderId={order.Id}");

            return ApiResponse<OrderDto>.Ok(MapOrder(order, "User"), "Đã xác nhận nhận hàng");
        }

        public async Task<ApiResponse<OrderDto>> CancelAsync(int id, bool isAdmin, string? cancelReason = null)
        {
            if (id <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã đơn hàng không hợp lệ");
            }

            var order = await _orderRepository.GetWithDetailsAsync(id);
            if (order == null)
            {
                return ApiResponse<OrderDto>.Fail("Không tìm thấy đơn hàng");
            }

            if (IsCancelledStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Đơn hàng đã bị hủy");
            }

            if (IsCompletedStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Không thể hủy đơn hàng đã hoàn tất");
            }

            if (!isAdmin && !IsPendingStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Người dùng chỉ được hủy đơn hàng đang chờ xử lý");
            }

            if (isAdmin && !IsPendingStatus(order.Status) && !IsShippingStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Quản trị viên chỉ được hủy đơn hàng đang chờ xử lý hoặc đang giao");
            }

            var previousStatus = order.Status;
            order.Status = OrderStatus.Cancelled;
            ApplyOrderTimestamp(order, OrderStatus.Cancelled, cancelReason);
            await _orderRepository.UpdateAsync(order);

            if (!IsCancelledStatus(previousStatus))
            {
                await RestoreStockAsync(order);
            }

            if (isAdmin)
            {
                await _notificationService.CreateSystemNotificationAsync(
                    order.UserId,
                    "Đơn hàng đã hủy",
                    $"Đơn #{order.OrderCode} đã bị hủy.",
                    $"/customer/orders?orderId={order.Id}");
            }

            return ApiResponse<OrderDto>.Ok(MapOrder(order, isAdmin ? "Admin" : "User"), "Đã hủy đơn hàng");
        }

        public async Task<ApiResponse<OrderDto>> ReturnToStockAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<OrderDto>.Fail("Mã đơn hàng không hợp lệ");
            }

            var order = await _orderRepository.GetWithDetailsAsync(id);
            if (order == null)
            {
                return ApiResponse<OrderDto>.Fail("Không tìm thấy đơn hàng");
            }

            if (!IsShippingStatus(order.Status))
            {
                return ApiResponse<OrderDto>.Fail("Chỉ có thể hoàn về kho đơn hàng đang trong trạng thái giao hàng");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                order.Status = OrderStatus.ReturnedToStock;
                order.ReturnedAt = DateTime.UtcNow;
                ApplyOrderTimestamp(order, OrderStatus.ReturnedToStock, null);

                await _orderRepository.UpdateAsync(order);
                await RestoreStockAsync(order);
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<OrderDto>.Fail("Không thể hoàn hàng về kho", ex.Message);
            }

            await _notificationService.CreateSystemNotificationAsync(
                order.UserId,
                "Đơn hàng đã hoàn về kho",
                $"Đơn #{order.OrderCode} đã tự động hoàn về kho do không xác nhận nhận hàng sau 3 ngày.",
                $"/customer/orders?orderId={order.Id}");

            return ApiResponse<OrderDto>.Ok(MapOrder(order, "Admin"), "Đã hoàn hàng về kho");
        }

        public async Task<Order> CreateOrderAsync(Order order)
        {
            order.CreatedAt = DateTime.UtcNow;
            order.Status = OrderStatus.Pending;
            if (string.IsNullOrWhiteSpace(order.OrderCode))
            {
                order.OrderCode = GenerateCode("ORD");
            }

            await _orderRepository.AddAsync(order);
            return order;
        }

        public async Task<List<Order>> GetOrdersByUserIdAsync(string userId)
        {
            return int.TryParse(userId, out var id)
                ? await _orderRepository.GetByUserAsync(id)
                : new List<Order>();
        }

        public async Task<Order?> GetOrderByIdAsync(int id)
        {
            return await _orderRepository.GetWithDetailsAsync(id);
        }

        public static OrderDto MapOrder(Order order, string? viewerRole = null)
        {
            return new OrderDto
            {
                Id = order.Id,
                UserId = order.UserId,
                Username = order.User?.UserName ?? string.Empty,
                CustomerName = !string.IsNullOrWhiteSpace(order.CustomerName)
                    ? order.CustomerName
                    : string.IsNullOrWhiteSpace(order.User?.FullName)
                        ? order.User?.UserName ?? string.Empty
                        : order.User.FullName,
                CustomerPhone = !string.IsNullOrWhiteSpace(order.CustomerPhone)
                    ? order.CustomerPhone
                    : order.User?.Phone ?? string.Empty,
                ShippingAddress = order.ShippingAddress,
                Note = order.Note,
                OrderCode = order.OrderCode,
                TotalAmount = order.TotalAmount,
                TotalImportCost = order.TotalImportCost,
                Profit = order.Profit,
                Status = ToPublicStatus(order.Status),
                CancelReason = order.CancelReason,
                CreatedAt = order.CreatedAt,
                ConfirmedAt = order.ConfirmedAt,
                ShippingAt = order.ShippingAt,
                DeliveredAt = order.DeliveredAt,
                CompletedAt = order.CompletedAt,
                CancelledAt = order.CancelledAt,
                ReturnedAt = order.ReturnedAt,
                AllowedActions = GetAllowedOrderActions(order.Status, viewerRole),
                Details = order.OrderDetails.Select(MapOrderDetail).ToList()
            };
        }

        private static OrderDetailDto MapOrderDetail(OrderDetail detail)
        {
            var productImages = detail.Product == null
                ? Array.Empty<ProductImageDto>()
                : ProductService.MapProductImages(detail.Product);
            var mainImage = detail.Product == null
                ? string.Empty
                : ProductService.GetMainImage(detail.Product, productImages);

            var imageUrl = !string.IsNullOrEmpty(detail.SelectedImageUrl) ? detail.SelectedImageUrl : mainImage;

            return new OrderDetailDto
            {
                Id = detail.Id,
                ProductId = detail.ProductId,
                ProductName = detail.Product?.NameVi ?? string.Empty,
                ImageUrl = imageUrl,
                MainImage = imageUrl,
                ProductImages = productImages,
                Quantity = detail.Quantity,
                UnitPrice = detail.UnitPrice,
                UnitImportPrice = detail.UnitImportPrice,
                DiscountPercent = detail.DiscountPercent,
                FinalPrice = detail.FinalPrice,
                TotalPrice = detail.TotalPrice,
                TotalImportCost = detail.TotalImportCost,
                Profit = detail.Profit
            };
        }

        private static void ApplyOrderTimestamp(Order order, OrderStatus status, string? cancelReason)
        {
            var now = DateTime.UtcNow;
            switch (status)
            {
                case OrderStatus.Shipping:
                    order.ConfirmedAt ??= now;
                    order.ShippingAt ??= now;
                    break;
                case OrderStatus.Completed:
                    order.DeliveredAt ??= now;
                    order.CompletedAt ??= now;
                    break;
                case OrderStatus.Cancelled:
                case OrderStatus.CancelledByUser:
                case OrderStatus.CancelledByAdmin:
                case OrderStatus.Rejected:
                    order.CancelledAt ??= now;
                    order.CancelReason = cancelReason?.Trim() ?? order.CancelReason;
                    break;
                case OrderStatus.ReturnedToStock:
                    order.ReturnedAt ??= now;
                    break;
            }
        }

        private async Task RestoreStockAsync(Order order)
        {
            foreach (var detail in order.OrderDetails)
            {
                var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == detail.ProductId);
                if (product == null)
                {
                    continue;
                }

                if (detail.StockAllocations.Count > 0)
                {
                    foreach (var allocation in detail.StockAllocations)
                    {
                        var batch = allocation.StockBatch ?? await _db.StockBatches.FirstOrDefaultAsync(b => b.Id == allocation.StockBatchId);
                        if (batch != null)
                        {
                            batch.QuantityRemaining += allocation.Quantity;
                        }
                    }
                }

                product.Stock += detail.Quantity;
                product.Status = NormalizeProductStatus(product.Stock, product.Status);
                product.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        private async Task<List<StockBatch>> GetFifoBatchesAsync(Product product)
        {
            var batches = await _db.StockBatches
                .Where(b => b.ProductId == product.Id && b.QuantityRemaining > 0)
                .OrderBy(b => b.CreatedAt)
                .ThenBy(b => b.Id)
                .ToListAsync();

            var batchBackedStock = batches.Sum(b => b.QuantityRemaining);
            var unbatchedStock = product.Stock - batchBackedStock;
            if (unbatchedStock > 0)
            {
                var supplierId = product.SupplierId
                    ?? await _db.Suppliers
                        .Where(s => s.CategoryId == product.CategoryId)
                        .OrderBy(s => s.Id)
                        .Select(s => (int?)s.Id)
                        .FirstOrDefaultAsync()
                    ?? await _db.Suppliers.OrderBy(s => s.Id).Select(s => (int?)s.Id).FirstOrDefaultAsync()
                    ?? 0;

                if (supplierId > 0)
                {
                    var legacyBatch = new StockBatch
                    {
                        ProductId = product.Id,
                        SupplierId = supplierId,
                        QuantityImported = unbatchedStock,
                        QuantityRemaining = unbatchedStock,
                        UnitImportPrice = product.ImportPrice,
                        CreatedAt = product.CreatedAt
                    };
                    _db.StockBatches.Add(legacyBatch);
                    batches.Insert(0, legacyBatch);
                }
            }

            return batches;
        }

        private static bool IsAvailableForSale(Product product)
        {
            if (product.Stock <= 0)
            {
                return false;
            }

            var status = product.Status?.Trim().ToLowerInvariant();
            return status is "" or null or "active" or "instock" or "available" or "dangban" or "conhang";
        }

        private static string NormalizeProductStatus(int stock, string currentStatus)
        {
            if (stock <= 0)
            {
                return "OutOfStock";
            }

            return string.Equals(currentStatus, "Inactive", StringComparison.OrdinalIgnoreCase)
                ? currentStatus
                : "Active";
        }

        private async Task RemoveOrderedItemsFromCartAsync(int userId, IEnumerable<int> productIds)
        {
            if (userId <= 0)
            {
                return;
            }

            var idSet = productIds.Where(id => id > 0).Distinct().ToHashSet();
            if (idSet.Count == 0)
            {
                return;
            }

            var cartItems = await _cartRepository.GetByUserIdAsync(userId);
            foreach (var item in cartItems.Where(item => idSet.Contains(item.ProductId)).ToList())
            {
                await _cartRepository.DeleteAsync(item);
            }
        }

        private static bool TryParseOrderStatusFilter(string? value, out IReadOnlyCollection<OrderStatus>? statuses)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                statuses = null;
                return true;
            }

            if (!TryParseOrderStatusCommand(value, out var status) || status == null)
            {
                statuses = null;
                return false;
            }

            statuses = ToStatusFilter(status.Value);
            return true;
        }

        private static bool TryParseOrderStatusCommand(string? value, out OrderStatus? status)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                status = null;
                return false;
            }

            if (Enum.TryParse<OrderStatus>(value, true, out var parsed))
            {
                status = parsed;
                return true;
            }

            status = value.Trim().ToLower() switch
            {
                "confirm" or "approved" or "approve" => OrderStatus.Shipping,
                "received" or "receive" => OrderStatus.Completed,
                "cancelled" or "canceled" => OrderStatus.Cancelled,
                "admincancelled" or "cancelledbyadmin" or "canceledbyadmin" => OrderStatus.Cancelled,
                "rejectedbyadmin" => OrderStatus.Cancelled,
                _ => null
            };

            return status.HasValue;
        }

        private static IReadOnlyCollection<OrderStatus> ToStatusFilter(OrderStatus status)
        {
            if (IsPendingStatus(status))
            {
                return new[] { OrderStatus.Pending };
            }

            if (IsShippingStatus(status))
            {
                return new[] { OrderStatus.Confirmed, OrderStatus.Shipping, OrderStatus.Delivered };
            }

            if (IsCompletedStatus(status))
            {
                return new[] { OrderStatus.Completed };
            }

            if (IsCancelledStatus(status))
            {
                return new[] { OrderStatus.Cancelled, OrderStatus.CancelledByUser, OrderStatus.CancelledByAdmin, OrderStatus.Rejected };
            }

            if (status == OrderStatus.ReturnedToStock)
            {
                return new[] { OrderStatus.ReturnedToStock };
            }

            return Array.Empty<OrderStatus>();
        }

        private static bool IsPendingStatus(OrderStatus status)
        {
            return status == OrderStatus.Pending;
        }

        private static bool IsShippingStatus(OrderStatus status)
        {
            return status == OrderStatus.Confirmed ||
                   status == OrderStatus.Shipping ||
                   status == OrderStatus.Delivered;
        }

        private static bool IsCompletedStatus(OrderStatus status)
        {
            return status == OrderStatus.Completed;
        }

        private static bool IsCancelledStatus(OrderStatus status)
        {
            return status == OrderStatus.Cancelled ||
                   status == OrderStatus.CancelledByUser ||
                   status == OrderStatus.CancelledByAdmin ||
                   status == OrderStatus.Rejected;
        }

        private static string GetMemberTier(decimal totalSpent)
        {
            if (totalSpent >= 50000000) return "Kim cương";
            if (totalSpent >= 20000000) return "Vàng";
            if (totalSpent >= 5000000) return "Bạc";
            return "Đồng";
        }

        private static decimal GetTierDiscountRate(string tier)
        {
            return tier switch
            {
                "Kim cương" => 0.10m,
                "Vàng" => 0.07m,
                "Bạc" => 0.05m,
                "Đồng" => 0.02m,
                _ => 0m
            };
        }

        private static IReadOnlyList<string> GetAllowedOrderActions(OrderStatus status, string? viewerRole)
        {
            var role = viewerRole?.Trim().ToLowerInvariant();

            if (IsPendingStatus(status))
            {
                if (role == "user")
                {
                    return new[] { "cancel" };
                }

                if (role == "admin")
                {
                    return new[] { "confirm", "cancel" };
                }

                return new[] { "confirm", "cancel" };
            }

            if (IsShippingStatus(status))
            {
                if (role == "user")
                {
                    return new[] { "receive" };
                }

                if (role == "admin")
                {
                    return new[] { "cancel" };
                }

                return new[] { "cancel", "receive" };
            }

            if (status == OrderStatus.ReturnedToStock)
            {
                if (role == "user")
                {
                    return new[] { "reorder" };
                }

                return Array.Empty<string>();
            }

            if (IsCompletedStatus(status))
            {
                if (role == "user")
                {
                    return new[] { "reorder", "review" };
                }

                return Array.Empty<string>();
            }

            if (IsCancelledStatus(status))
            {
                if (role == "user")
                {
                    return new[] { "reorder" };
                }

                return Array.Empty<string>();
            }

            return Array.Empty<string>();
        }

        public static string ToPublicStatus(OrderStatus status)
        {
            if (IsPendingStatus(status))
            {
                return "Pending";
            }

            if (IsShippingStatus(status))
            {
                return "Shipping";
            }

            if (IsCompletedStatus(status))
            {
                return "Completed";
            }

            if (IsCancelledStatus(status))
            {
                return "Cancelled";
            }

            if (status == OrderStatus.ReturnedToStock)
            {
                return "ReturnedToStock";
            }

            return status.ToString();
        }

        private static string GenerateCode(string prefix)
        {
            return $"{prefix}{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        }

        private static void NormalizePaging(OrderSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
