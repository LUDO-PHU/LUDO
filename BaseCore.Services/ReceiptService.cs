using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class ReceiptService : IReceiptService
    {
        private readonly BaseCoreSalesContext _db;
        private readonly IReceiptRepositoryEF _receiptRepository;
        private readonly ISupplierRepositoryEF _supplierRepository;
        private readonly IProductRepositoryEF _productRepository;

        public ReceiptService(
            BaseCoreSalesContext db,
            IReceiptRepositoryEF receiptRepository,
            ISupplierRepositoryEF supplierRepository,
            IProductRepositoryEF productRepository)
        {
            _db = db;
            _receiptRepository = receiptRepository;
            _supplierRepository = supplierRepository;
            _productRepository = productRepository;
        }

        public async Task<ApiResponse<PagedResult<ReceiptDto>>> SearchAsync(ReceiptSearchRequestDto request)
        {
            request ??= new ReceiptSearchRequestDto();
            NormalizePaging(request);

            if (!TryParseReceiptStatus(request.Status, out var status))
            {
                return ApiResponse<PagedResult<ReceiptDto>>.Fail("Trạng thái biên lai không hợp lệ");
            }

            if (!TryParseReceiptType(request.ReceiptType, out var receiptType))
            {
                return ApiResponse<PagedResult<ReceiptDto>>.Fail("Loại biên lai không hợp lệ");
            }

            var (receipts, totalCount) = await _receiptRepository.SearchAsync(
                request.Keyword,
                request.SupplierId,
                request.ProductId,
                request.CategoryId,
                receiptType,
                status,
                request.FromDate,
                request.ToDate,
                request.SortBy,
                request.SortDir,
                request.Page,
                request.PageSize);

            return ApiResponse<PagedResult<ReceiptDto>>.Ok(new PagedResult<ReceiptDto>
            {
                Items = receipts.Select(MapReceipt).ToList(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<ReceiptDto>>> GetAllAsync()
        {
            var (receipts, _) = await _receiptRepository.SearchAsync(null, null, null, null, null, null, null, null, null, null, 1, int.MaxValue);
            return ApiResponse<IReadOnlyList<ReceiptDto>>.Ok(receipts.Select(MapReceipt).ToList());
        }

        public async Task<ApiResponse<ReceiptDto>> GetByIdAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Mã biên lai không hợp lệ");
            }

            var receipt = await _receiptRepository.GetByIdWithDetailsAsync(id);
            return receipt == null
                ? ApiResponse<ReceiptDto>.Fail("Không tìm thấy biên lai")
                : ApiResponse<ReceiptDto>.Ok(MapReceipt(receipt));
        }

        public async Task<ApiResponse<ReceiptDto>> CreateAsync(CreateReceiptDto request)
        {
            if (!request.SupplierId.HasValue || request.SupplierId <= 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Vui lòng chọn nhà cung cấp");
            }

            var supplier = await _supplierRepository.GetByIdWithUserAsync(request.SupplierId.Value);
            if (supplier == null)
            {
                return ApiResponse<ReceiptDto>.Fail("Nhà cung cấp không tồn tại");
            }

            return await CreateReceiptForSupplierAsync(supplier, request);
        }

        public async Task<ApiResponse<ReceiptDto>> CreateForSupplierAsync(int userId, CreateReceiptDto request)
        {
            var supplier = await _supplierRepository.GetByUserIdAsync(userId);
            if (supplier == null || !supplier.IsActive)
            {
                return ApiResponse<ReceiptDto>.Fail("Không tìm thấy nhà cung cấp hoặc nhà cung cấp đã ngừng hoạt động");
            }

            request ??= new CreateReceiptDto();
            request.SupplierId = supplier.Id;
            return await CreateReceiptForSupplierAsync(supplier, request);
        }

        public async Task<ApiResponse<ReceiptDto>> UpdateStatusAsync(int id, UpdateReceiptStatusDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Mã biên lai không hợp lệ");
            }

            if (request == null || !TryParseReceiptStatus(request.Status, out var targetStatus) || targetStatus == null)
            {
                return ApiResponse<ReceiptDto>.Fail("Trạng thái biên lai không hợp lệ");
            }

            if (targetStatus.Value == ReceiptStatus.Delivered ||
                targetStatus.Value == ReceiptStatus.ApprovedByAdmin ||
                targetStatus.Value == ReceiptStatus.Completed ||
                targetStatus.Value == ReceiptStatus.Shipping ||
                targetStatus.Value == ReceiptStatus.Confirmed)
            {
                return await ApproveByAdminAsync(id, null);
            }

            if (targetStatus.Value == ReceiptStatus.RejectedByAdmin)
            {
                return await RejectByAdminAsync(id, null, request.CancelReason);
            }

            if (targetStatus.Value == ReceiptStatus.CancelledBySupplier)
            {
                return await CancelBySupplierAsync(id, request.CancelReason);
            }

            return ApiResponse<ReceiptDto>.Fail("Không thể chuyển biên lai về trạng thái chờ xử lý");
        }

        public async Task<ApiResponse<ReceiptDto>> ApproveByAdminAsync(int id, int? adminId)
        {
            if (id <= 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Mã biên lai không hợp lệ");
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var receipt = await _db.Receipts
                    .Include(r => r.Supplier).ThenInclude(s => s.User)
                    .Include(r => r.Supplier).ThenInclude(s => s.Category)
                    .Include(r => r.Product).ThenInclude(p => p.Category)
                    .Include(r => r.Product).ThenInclude(p => p.ProductImages)
                    .Include(r => r.Request)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (receipt == null)
                {
                    return ApiResponse<ReceiptDto>.Fail("Không tìm thấy biên lai");
                }

                if (receipt.Status != ReceiptStatus.Pending)
                {
                    return ApiResponse<ReceiptDto>.Fail("Chỉ có thể duyệt biên lai đang chờ xử lý");
                }

                var validationError = ValidateReceiptOwnership(receipt.Supplier, receipt.Product);
                if (!string.IsNullOrWhiteSpace(validationError))
                {
                    return ApiResponse<ReceiptDto>.Fail(validationError);
                }

                var now = DateTime.UtcNow;
                receipt.AdminId = adminId ?? receipt.AdminId;
                receipt.Status = ReceiptStatus.ApprovedByAdmin;
                receipt.ConfirmedAt ??= now;
                receipt.DeliveredAt ??= now;

                var stockBeforeImport = receipt.Product.Stock;
                var currentImportPrice = receipt.Product.ImportPrice;
                receipt.Product.ImportPrice = CalculateNextProductImportPrice(
                    stockBeforeImport,
                    currentImportPrice,
                    receipt.Quantity,
                    receipt.ImportPrice);
                receipt.Product.Stock += receipt.Quantity;
                receipt.Product.Status = NormalizeProductStatus(receipt.Product.Stock, receipt.Product.Status);
                receipt.Product.UpdatedAt = now;

                _db.StockBatches.Add(new StockBatch
                {
                    ProductId = receipt.ProductId,
                    SupplierId = receipt.SupplierId,
                    ReceiptId = receipt.Id,
                    QuantityImported = receipt.Quantity,
                    QuantityRemaining = receipt.Quantity,
                    UnitImportPrice = receipt.ImportPrice,
                    CreatedAt = now
                });

                if (receipt.Request != null)
                {
                    receipt.Request.Status = SupplierRequestStatus.Completed;
                    receipt.Request.UpdatedAt = now;
                }

                await AddRevenueTransactionIfMissingAsync(
                    "Admin",
                    null,
                    -receipt.TotalImportAmount,
                    "AdminImportCost",
                    "Receipt",
                    receipt.Id,
                    $"Chi phí nhập hàng của biên lai {receipt.ReceiptCode}");

                await AddRevenueTransactionIfMissingAsync(
                    "Supplier",
                    receipt.SupplierId,
                    receipt.TotalImportAmount,
                    "SupplierReceiptRevenue",
                    "Receipt",
                    receipt.Id,
                    $"Doanh thu nhà cung cấp từ biên lai {receipt.ReceiptCode}");

                await AddNotificationAsync(
                    receipt.Supplier.UserId,
                    receipt.SupplierId,
                    "Biên lai đã được quản trị viên nhận",
                    $"Biên lai {receipt.ReceiptCode} đã được duyệt và nhập kho.",
                    "ReceiptApproved",
                    receipt.Id);

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                var updated = await _receiptRepository.GetByIdWithDetailsAsync(id) ?? receipt;
                return ApiResponse<ReceiptDto>.Ok(MapReceipt(updated), "Đã duyệt biên lai");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<ReceiptDto>.Fail("Không thể duyệt biên lai", ex.Message);
            }
        }

        public async Task<ApiResponse<ReceiptDto>> RejectByAdminAsync(int id, int? adminId, string? reason)
        {
            if (id <= 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Mã biên lai không hợp lệ");
            }

            var receipt = await _db.Receipts
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Product).ThenInclude(p => p.Category)
                .Include(r => r.Product).ThenInclude(p => p.ProductImages)
                .Include(r => r.Request)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null)
            {
                return ApiResponse<ReceiptDto>.Fail("Không tìm thấy biên lai");
            }

            if (receipt.Status != ReceiptStatus.Pending)
            {
                return ApiResponse<ReceiptDto>.Fail("Chỉ có thể từ chối biên lai đang chờ xử lý");
            }

            receipt.AdminId = adminId ?? receipt.AdminId;
            receipt.Status = ReceiptStatus.RejectedByAdmin;
            receipt.CancelledAt ??= DateTime.UtcNow;
            receipt.CancelReason = reason?.Trim() ?? string.Empty;

            if (receipt.Request != null && receipt.Request.Status == SupplierRequestStatus.ReceiptCreated)
            {
                receipt.Request.Status = SupplierRequestStatus.ApprovedBySupplier;
                receipt.Request.UpdatedAt = DateTime.UtcNow;
            }

            await AddNotificationAsync(
                receipt.Supplier.UserId,
                receipt.SupplierId,
                "Biên lai bị quản trị viên từ chối",
                string.IsNullOrWhiteSpace(receipt.CancelReason)
                    ? $"Biên lai {receipt.ReceiptCode} đã bị từ chối."
                    : $"Biên lai {receipt.ReceiptCode} đã bị từ chối: {receipt.CancelReason}",
                "ReceiptRejected",
                receipt.Id);

            await _db.SaveChangesAsync();

            var updated = await _receiptRepository.GetByIdWithDetailsAsync(id) ?? receipt;
            return ApiResponse<ReceiptDto>.Ok(MapReceipt(updated), "Đã từ chối biên lai");
        }

        public static ReceiptDto MapReceipt(Receipt receipt)
        {
            var productImages = receipt.Product == null
                ? Array.Empty<ProductImageDto>()
                : ProductService.MapProductImages(receipt.Product);
            var productMainImage = receipt.Product == null
                ? receipt.ImageUrl
                : ProductService.GetMainImage(receipt.Product, productImages);
            var receiptImage = !string.IsNullOrWhiteSpace(receipt.ImageUrl) ? receipt.ImageUrl : productMainImage;
            var receiptProductImages = IncludeReceiptImage(productImages, receiptImage, receipt.ProductId, receipt.Product?.NameVi ?? string.Empty, receipt.CreatedAt);
            var itemMainImage = !string.IsNullOrWhiteSpace(receiptImage) ? receiptImage : productMainImage;
            var supplierName = receipt.Supplier?.CompanyName ?? string.Empty;
            var productName = receipt.Product?.NameVi ?? string.Empty;
            var categoryName = receipt.Product?.Category?.NameVi ?? receipt.Supplier?.Category?.NameVi ?? string.Empty;

            return new ReceiptDto
            {
                Id = receipt.Id,
                ReceiptCode = receipt.ReceiptCode,
                SupplierId = receipt.SupplierId,
                SupplierName = supplierName,
                SupplierCompanyName = supplierName,
                AdminId = receipt.AdminId,
                RequestId = receipt.RequestId,
                ProductId = receipt.ProductId,
                ProductName = productName,
                CategoryId = receipt.Product?.CategoryId ?? 0,
                CategoryName = categoryName,
                Quantity = receipt.Quantity,
                ImportPrice = receipt.ImportPrice,
                UnitImportPrice = receipt.ImportPrice,
                TotalImportAmount = receipt.TotalImportAmount,
                TotalAmount = receipt.TotalImportAmount,
                ReceiptType = receipt.ReceiptType.ToString(),
                ReceiptTypeLabel = receipt.ReceiptType == ReceiptType.RequestedReceipt ? "Biên lai yêu cầu" : "Biên lai đề nghị",
                ImageUrl = receiptImage,
                ProductMainImage = !string.IsNullOrWhiteSpace(productMainImage) ? productMainImage : receiptImage,
                ProductImages = receiptProductImages,
                Items = new[]
                {
                    new ReceiptProductItemDto
                    {
                        ProductId = receipt.ProductId,
                        ProductName = productName,
                        CategoryId = receipt.Product?.CategoryId ?? 0,
                        CategoryName = categoryName,
                        SupplierId = receipt.SupplierId,
                        SupplierName = supplierName,
                        MainImage = itemMainImage,
                        ImageUrl = receiptImage,
                        Images = receiptProductImages,
                        Quantity = receipt.Quantity,
                        UnitImportPrice = receipt.ImportPrice,
                        TotalAmount = receipt.TotalImportAmount,
                        Note = receipt.Note
                    }
                },
                Content = receipt.Content,
                Specifications = string.IsNullOrWhiteSpace(receipt.Specifications) ? receipt.Content : receipt.Specifications,
                Note = receipt.Note,
                FromAddress = receipt.FromAddress,
                ToAddress = receipt.ToAddress,
                Status = ToPublicStatus(receipt.Status),
                CreatedAt = receipt.CreatedAt,
                ConfirmedAt = receipt.ConfirmedAt,
                ShippingAt = receipt.ShippingAt,
                DeliveredAt = receipt.DeliveredAt,
                CancelledAt = receipt.CancelledAt,
                CancelReason = receipt.CancelReason
            };
        }

        private static IReadOnlyList<ProductImageDto> IncludeReceiptImage(
            IReadOnlyList<ProductImageDto> productImages,
            string receiptImage,
            int productId,
            string altText,
            DateTime createdAt)
        {
            if (string.IsNullOrWhiteSpace(receiptImage))
            {
                return productImages;
            }

            var url = receiptImage.Trim();
            var images = productImages.ToList();
            if (images.Any(image => string.Equals(image.ImageUrl?.Trim(), url, StringComparison.OrdinalIgnoreCase)))
            {
                return images;
            }

            images.Insert(0, new ProductImageDto
            {
                Id = 0,
                ProductId = productId,
                ImageUrl = url,
                AltText = altText,
                IsPrimary = !images.Any(image => image.IsPrimary),
                SortOrder = -2,
                CreatedAt = createdAt
            });

            return images;
        }

        private async Task<ApiResponse<ReceiptDto>> CreateReceiptForSupplierAsync(Supplier supplier, CreateReceiptDto request)
        {
            var errors = await ValidateCreateAsync(supplier, request);
            if (errors.Count > 0)
            {
                return ApiResponse<ReceiptDto>.Fail("Dữ liệu biên lai không hợp lệ", errors.ToArray());
            }

            var selectedProduct = await _db.Products
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == request.ProductId);
            var selectedProductImages = selectedProduct == null
                ? Array.Empty<ProductImageDto>()
                : ProductService.MapProductImages(selectedProduct);
            var receiptImageUrl = !string.IsNullOrWhiteSpace(request.ImageUrl)
                ? request.ImageUrl.Trim()
                : selectedProduct == null
                    ? string.Empty
                    : ProductService.GetMainImage(selectedProduct, selectedProductImages);
            var unitImportPrice = request.UnitImportPrice ?? request.ImportPrice;
            var receipt = new Receipt
            {
                ReceiptCode = GenerateCode("REC"),
                SupplierId = supplier.Id,
                RequestId = request.RequestId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                ImportPrice = unitImportPrice,
                TotalImportAmount = request.Quantity * unitImportPrice,
                ReceiptType = request.RequestId.HasValue && request.RequestId > 0 ? ReceiptType.RequestedReceipt : ReceiptType.ProposalReceipt,
                ImageUrl = receiptImageUrl,
                Content = request.Content?.Trim() ?? string.Empty,
                Specifications = string.IsNullOrWhiteSpace(request.Specifications) ? request.Content?.Trim() ?? string.Empty : request.Specifications.Trim(),
                Note = request.Note?.Trim() ?? string.Empty,
                FromAddress = request.FromAddress?.Trim() ?? string.Empty,
                ToAddress = request.ToAddress?.Trim() ?? string.Empty,
                Status = ReceiptStatus.PendingAdminReview,
                CreatedAt = DateTime.UtcNow
            };

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.Receipts.Add(receipt);

                if (request.RequestId.HasValue && request.RequestId > 0)
                {
                    var supplierRequest = await _db.SupplierRequests.FirstOrDefaultAsync(r => r.Id == request.RequestId.Value);
                    if (supplierRequest != null)
                    {
                        supplierRequest.Status = SupplierRequestStatus.ReceiptCreated;
                        supplierRequest.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<ReceiptDto>.Fail("Không thể tạo biên lai", ex.Message);
            }

            var created = await _receiptRepository.GetByIdWithDetailsAsync(receipt.Id) ?? receipt;
            return ApiResponse<ReceiptDto>.Ok(MapReceipt(created), "Đã tạo biên lai");
        }

        private async Task<List<string>> ValidateCreateAsync(Supplier supplier, CreateReceiptDto request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            if (!supplier.IsActive)
            {
                errors.Add("Nhà cung cấp đã ngừng hoạt động");
            }

            if (!supplier.CategoryId.HasValue || supplier.CategoryId <= 0)
            {
                errors.Add("Nhà cung cấp chưa được gán danh mục");
            }

            var product = request.ProductId > 0
                ? await _db.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == request.ProductId)
                : null;
            if (product == null)
            {
                errors.Add("Sản phẩm không tồn tại");
            }
            else
            {
                if (product.SupplierId != supplier.Id)
                {
                    errors.Add("Sản phẩm không thuộc nhà cung cấp này");
                }

                if (supplier.CategoryId.HasValue && product.CategoryId != supplier.CategoryId.Value)
                {
                    errors.Add("Danh mục sản phẩm không trùng với danh mục của nhà cung cấp");
                }
            }

            if (request.RequestId.HasValue && request.RequestId > 0)
            {
                var supplierRequest = await _db.SupplierRequests.FirstOrDefaultAsync(r => r.Id == request.RequestId.Value);
                if (supplierRequest == null)
                {
                    errors.Add("Yêu cầu nhà cung cấp không tồn tại");
                }
                else
                {
                    if (supplierRequest.SupplierId != supplier.Id)
                    {
                        errors.Add("Yêu cầu không thuộc nhà cung cấp này");
                    }

                    if (supplierRequest.ProductId.HasValue && supplierRequest.ProductId.Value != request.ProductId)
                    {
                        errors.Add("Sản phẩm trong biên lai phải trùng với sản phẩm được yêu cầu");
                    }

                    if (supplierRequest.Status != SupplierRequestStatus.Pending &&
                        supplierRequest.Status != SupplierRequestStatus.ApprovedBySupplier)
                    {
                        errors.Add("Yêu cầu này chưa thể tạo biên lai");
                    }
                }
            }

            if (request.Quantity <= 0)
            {
                errors.Add("Số lượng phải lớn hơn 0");
            }

            var importPrice = request.UnitImportPrice ?? request.ImportPrice;
            if (importPrice < 0)
            {
                errors.Add("Giá nhập không được âm");
            }

            return errors;
        }

        private async Task<ApiResponse<ReceiptDto>> CancelBySupplierAsync(int id, string? reason)
        {
            var receipt = await _db.Receipts
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Product).ThenInclude(p => p.Category)
                .Include(r => r.Product).ThenInclude(p => p.ProductImages)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null)
            {
                return ApiResponse<ReceiptDto>.Fail("Không tìm thấy biên lai");
            }

            if (receipt.Status != ReceiptStatus.Pending)
            {
                return ApiResponse<ReceiptDto>.Fail("Chỉ có thể hủy biên lai đang chờ xử lý");
            }

            receipt.Status = ReceiptStatus.CancelledBySupplier;
            receipt.CancelledAt ??= DateTime.UtcNow;
            receipt.CancelReason = reason?.Trim() ?? string.Empty;
            await _db.SaveChangesAsync();

            return ApiResponse<ReceiptDto>.Ok(MapReceipt(receipt), "Đã hủy biên lai");
        }

        private async Task AddRevenueTransactionIfMissingAsync(
            string ownerType,
            int? ownerId,
            decimal amount,
            string transactionType,
            string referenceType,
            int referenceId,
            string note)
        {
            var exists = await _db.RevenueTransactions.AnyAsync(t =>
                t.OwnerType == ownerType &&
                t.OwnerId == ownerId &&
                t.TransactionType == transactionType &&
                t.ReferenceType == referenceType &&
                t.ReferenceId == referenceId);

            if (exists)
            {
                return;
            }

            _db.RevenueTransactions.Add(new RevenueTransaction
            {
                OwnerType = ownerType,
                OwnerId = ownerId,
                Amount = amount,
                TransactionType = transactionType,
                ReferenceType = referenceType,
                ReferenceId = referenceId,
                Note = note,
                CreatedAt = DateTime.UtcNow
            });
        }

        private async Task AddNotificationAsync(int userId, int? supplierId, string title, string message, string type, int relatedId)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = userId,
                SupplierId = supplierId,
                Title = title,
                Message = message,
                Type = type,
                RelatedId = relatedId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await Task.CompletedTask;
        }

        private static string? ValidateReceiptOwnership(Supplier supplier, Product product)
        {
            if (!supplier.IsActive)
            {
                return "Nhà cung cấp đã ngừng hoạt động";
            }

            if (!supplier.CategoryId.HasValue || supplier.CategoryId <= 0)
            {
                return "Nhà cung cấp chưa được gán danh mục";
            }

            if (product.SupplierId != supplier.Id)
            {
                return "Sản phẩm trong biên lai không thuộc nhà cung cấp này";
            }

            if (product.CategoryId != supplier.CategoryId.Value)
            {
                return "Danh mục sản phẩm trong biên lai không trùng với danh mục của nhà cung cấp";
            }

            return null;
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

        private static decimal CalculateNextProductImportPrice(
            int remainingQuantity,
            decimal currentImportPrice,
            int newQuantity,
            decimal newImportPrice)
        {
            if (remainingQuantity <= 0)
            {
                return newImportPrice;
            }

            if (newQuantity <= 0)
            {
                return currentImportPrice;
            }

            var totalQuantity = remainingQuantity + newQuantity;
            if (totalQuantity <= 0)
            {
                return newImportPrice;
            }

            var weightedImportPrice =
                ((remainingQuantity * currentImportPrice) + (newQuantity * newImportPrice))
                / totalQuantity;

            return Math.Round(weightedImportPrice, 2, MidpointRounding.AwayFromZero);
        }

        private static bool TryParseReceiptStatus(string? value, out ReceiptStatus? status)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                status = null;
                return true;
            }

            if (Enum.TryParse<ReceiptStatus>(value, true, out var parsed))
            {
                status = parsed;
                return true;
            }

            status = value.Trim().ToLowerInvariant() switch
            {
                "pending" or "pendingadminreview" or "choadmin" or "choduyet" => ReceiptStatus.PendingAdminReview,
                "confirmed" or "confirm" or "approved" or "approve" or "approvedbyadmin" or "completed" or "complete" or "delivered" => ReceiptStatus.ApprovedByAdmin,
                "shipping" => ReceiptStatus.Shipping,
                "cancelled" or "canceled" or "cancelledbysupplier" => ReceiptStatus.CancelledBySupplier,
                "rejected" or "reject" or "rejectedbyadmin" => ReceiptStatus.RejectedByAdmin,
                _ => null
            };

            return status.HasValue;
        }

        private static bool TryParseReceiptType(string? value, out ReceiptType? receiptType)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                receiptType = null;
                return true;
            }

            if (Enum.TryParse<ReceiptType>(value, true, out var parsed))
            {
                receiptType = parsed;
                return true;
            }

            receiptType = value.Trim().ToLowerInvariant() switch
            {
                "proposal" or "proposalreceipt" => ReceiptType.ProposalReceipt,
                "requested" or "requestedreceipt" or "request" => ReceiptType.RequestedReceipt,
                _ => null
            };

            return receiptType.HasValue;
        }

        private static string ToPublicStatus(ReceiptStatus status)
        {
            return status switch
            {
                ReceiptStatus.Pending => "PendingAdminReview",
                ReceiptStatus.Confirmed => "ApprovedByAdmin",
                ReceiptStatus.Shipping => "ApprovedByAdmin",
                ReceiptStatus.Delivered => "ApprovedByAdmin",
                ReceiptStatus.CancelledBySupplier => "CancelledBySupplier",
                ReceiptStatus.RejectedByAdmin => "RejectedByAdmin",
                _ => status.ToString()
            };
        }

        private static string GenerateCode(string prefix)
        {
            return $"{prefix}{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        }

        private static void NormalizePaging(ReceiptSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
