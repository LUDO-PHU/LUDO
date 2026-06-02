using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Services
{
    public class SupplierRequestService : ISupplierRequestService
    {
        private readonly BaseCoreSalesContext _db;

        public SupplierRequestService(BaseCoreSalesContext db)
        {
            _db = db;
        }

        public async Task<ApiResponse<PagedResult<SupplierRequestDto>>> SearchAsync(SupplierRequestSearchRequestDto request)
        {
            request ??= new SupplierRequestSearchRequestDto();
            NormalizePaging(request);

            if (!TryParseStatus(request.Status, out var status))
            {
                return ApiResponse<PagedResult<SupplierRequestDto>>.Fail("Trạng thái yêu cầu nhà cung cấp không hợp lệ");
            }

            var query = _db.SupplierRequests
                .Include(r => r.Admin)
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Supplier).ThenInclude(s => s.Category)
                .Include(r => r.Category)
                .Include(r => r.Product)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.Keyword))
            {
                var kw = request.Keyword.Trim().ToLowerInvariant();
                query = query.Where(r =>
                    r.Supplier.CompanyName.ToLower().Contains(kw) ||
                    r.Supplier.User.UserName.ToLower().Contains(kw) ||
                    r.Category.NameVi.ToLower().Contains(kw) ||
                    r.Category.NameEn.ToLower().Contains(kw) ||
                    r.RequestedProductName.ToLower().Contains(kw) ||
                    r.Note.ToLower().Contains(kw) ||
                    (r.Product != null && (r.Product.NameVi.ToLower().Contains(kw) || r.Product.NameEn.ToLower().Contains(kw))));
            }

            if (request.SupplierId.HasValue && request.SupplierId > 0)
            {
                query = query.Where(r => r.SupplierId == request.SupplierId.Value);
            }

            if (request.CategoryId.HasValue && request.CategoryId > 0)
            {
                query = query.Where(r => r.CategoryId == request.CategoryId.Value);
            }

            if (request.ProductId.HasValue && request.ProductId > 0)
            {
                query = query.Where(r => r.ProductId == request.ProductId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(r => r.CreatedAt >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                var endDate = request.ToDate.Value.Date.AddDays(1);
                query = query.Where(r => r.CreatedAt < endDate);
            }

            var desc = !string.Equals(request.SortDir, "asc", StringComparison.OrdinalIgnoreCase);
            query = request.SortBy?.Trim().ToLowerInvariant() switch
            {
                "supplier" => desc ? query.OrderByDescending(r => r.Supplier.CompanyName) : query.OrderBy(r => r.Supplier.CompanyName),
                "category" => desc ? query.OrderByDescending(r => r.Category.NameVi) : query.OrderBy(r => r.Category.NameVi),
                "quantity" => desc ? query.OrderByDescending(r => r.Quantity) : query.OrderBy(r => r.Quantity),
                "suggestedprice" or "price" => desc ? query.OrderByDescending(r => r.SuggestedPrice) : query.OrderBy(r => r.SuggestedPrice),
                "status" => desc ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status),
                "createdat" => desc ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt),
                _ => query.OrderByDescending(r => r.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            return ApiResponse<PagedResult<SupplierRequestDto>>.Ok(new PagedResult<SupplierRequestDto>
            {
                Items = items.Select(Map).ToList(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<SupplierRequestDto>> CreateAsync(int adminId, CreateSupplierRequestDto request)
        {
            var errors = await ValidateCreateAsync(request);
            if (errors.Count > 0)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Dữ liệu yêu cầu nhà cung cấp không hợp lệ", errors.ToArray());
            }

            var supplier = await _db.Suppliers
                .Include(s => s.User)
                .Include(s => s.Category)
                .FirstAsync(s => s.Id == request.SupplierId);

            var supplierRequest = new SupplierRequest
            {
                AdminId = adminId,
                SupplierId = request.SupplierId,
                CategoryId = request.CategoryId,
                ProductId = request.ProductId,
                RequestedProductName = request.RequestedProductName?.Trim() ?? string.Empty,
                Quantity = request.Quantity,
                SuggestedPrice = request.SuggestedPrice,
                Note = request.Note?.Trim() ?? string.Empty,
                Status = SupplierRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.SupplierRequests.Add(supplierRequest);
                await _db.SaveChangesAsync();

                _db.Notifications.Add(new Notification
                {
                    UserId = supplier.UserId,
                    SupplierId = supplier.Id,
                    Title = "Quản trị viên tạo yêu cầu nhập hàng",
                    Message = string.IsNullOrWhiteSpace(supplierRequest.RequestedProductName)
                        ? $"Quản trị viên yêu cầu nhập sản phẩm #{supplierRequest.ProductId} số lượng {supplierRequest.Quantity}."
                        : $"Quản trị viên yêu cầu nhập {supplierRequest.RequestedProductName} số lượng {supplierRequest.Quantity}.",
                    Type = "SupplierRequestCreated",
                    RelatedId = supplierRequest.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return ApiResponse<SupplierRequestDto>.Fail("Không thể tạo yêu cầu nhà cung cấp", ex.Message);
            }

            var created = await GetByIdForMapAsync(supplierRequest.Id);
            return ApiResponse<SupplierRequestDto>.Ok(Map(created!), "Đã tạo yêu cầu nhà cung cấp");
        }

        public async Task<ApiResponse<SupplierRequestReceiptPrefillDto>> ApproveBySupplierAsync(int userId, int id)
        {
            var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive);
            if (supplier == null)
            {
                return ApiResponse<SupplierRequestReceiptPrefillDto>.Fail("Không tìm thấy nhà cung cấp hoặc nhà cung cấp đã ngừng hoạt động");
            }

            var request = await _db.SupplierRequests
                .Include(r => r.Product)
                .FirstOrDefaultAsync(r => r.Id == id && r.SupplierId == supplier.Id);

            if (request == null)
            {
                return ApiResponse<SupplierRequestReceiptPrefillDto>.Fail("Không tìm thấy yêu cầu nhà cung cấp");
            }

            if (request.Status != SupplierRequestStatus.Pending)
            {
                return ApiResponse<SupplierRequestReceiptPrefillDto>.Fail("Chỉ có thể duyệt yêu cầu đang chờ xử lý");
            }

            request.Status = SupplierRequestStatus.ApprovedBySupplier;
            request.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ApiResponse<SupplierRequestReceiptPrefillDto>.Ok(new SupplierRequestReceiptPrefillDto
            {
                RequestId = request.Id,
                ProductId = request.ProductId,
                ProductName = request.Product?.NameVi ?? string.Empty,
                RequestedProductName = request.RequestedProductName,
                Quantity = request.Quantity,
                SuggestedPrice = request.SuggestedPrice,
                ReceiptType = ReceiptType.RequestedReceipt.ToString(),
                Note = request.Note
            }, "Đã duyệt yêu cầu nhà cung cấp");
        }

        public async Task<ApiResponse<SupplierRequestDto>> RejectBySupplierAsync(int userId, int id, RejectSupplierRequestDto request)
        {
            var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.UserId == userId && s.IsActive);
            if (supplier == null)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Không tìm thấy nhà cung cấp hoặc nhà cung cấp đã ngừng hoạt động");
            }

            var supplierRequest = await _db.SupplierRequests
                .Include(r => r.Admin)
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Category)
                .Include(r => r.Product)
                .FirstOrDefaultAsync(r => r.Id == id && r.SupplierId == supplier.Id);

            if (supplierRequest == null)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Không tìm thấy yêu cầu nhà cung cấp");
            }

            if (supplierRequest.Status != SupplierRequestStatus.Pending &&
                supplierRequest.Status != SupplierRequestStatus.ApprovedBySupplier)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Không thể từ chối yêu cầu này");
            }

            supplierRequest.Status = SupplierRequestStatus.RejectedBySupplier;
            supplierRequest.RejectionReason = request?.RejectionReason?.Trim() ?? string.Empty;
            supplierRequest.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ApiResponse<SupplierRequestDto>.Ok(Map(supplierRequest), "Đã từ chối yêu cầu nhà cung cấp");
        }

        private async Task<List<string>> ValidateCreateAsync(CreateSupplierRequestDto request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            var supplier = request.SupplierId > 0
                ? await _db.Suppliers.Include(s => s.Category).FirstOrDefaultAsync(s => s.Id == request.SupplierId)
                : null;
            if (supplier == null)
            {
                errors.Add("Nhà cung cấp không tồn tại");
            }
            else if (!supplier.IsActive)
            {
                errors.Add("Nhà cung cấp đã ngừng hoạt động");
            }

            var category = request.CategoryId > 0 ? await _db.Categories.FindAsync(request.CategoryId) : null;
            if (category == null)
            {
                errors.Add("Danh mục không tồn tại");
            }

            if (supplier != null && supplier.CategoryId.HasValue && supplier.CategoryId.Value != request.CategoryId)
            {
                errors.Add("Nhà cung cấp không phụ trách danh mục này");
            }

            if (request.ProductId.HasValue && request.ProductId > 0)
            {
                var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == request.ProductId.Value);
                if (product == null)
                {
                    errors.Add("Sản phẩm không tồn tại");
                }
                else
                {
                    if (product.SupplierId != request.SupplierId)
                    {
                        errors.Add("Sản phẩm không thuộc nhà cung cấp đã chọn");
                    }

                    if (product.CategoryId != request.CategoryId)
                    {
                        errors.Add("Sản phẩm không thuộc danh mục đã chọn");
                    }
                }
            }
            else if (string.IsNullOrWhiteSpace(request.RequestedProductName))
            {
                errors.Add("Vui lòng nhập tên sản phẩm yêu cầu khi chưa chọn sản phẩm có sẵn");
            }

            if (request.Quantity <= 0)
            {
                errors.Add("Số lượng phải lớn hơn 0");
            }

            if (request.SuggestedPrice < 0)
            {
                errors.Add("Giá đề xuất không được âm");
            }

            return errors;
        }

        private async Task<SupplierRequest?> GetByIdForMapAsync(int id)
        {
            return await _db.SupplierRequests
                .Include(r => r.Admin)
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Category)
                .Include(r => r.Product)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        private static SupplierRequestDto Map(SupplierRequest request)
        {
            return new SupplierRequestDto
            {
                Id = request.Id,
                AdminId = request.AdminId,
                AdminName = request.Admin?.FullName ?? request.Admin?.UserName ?? string.Empty,
                SupplierId = request.SupplierId,
                SupplierName = request.Supplier?.User?.UserName ?? string.Empty,
                SupplierCompanyName = request.Supplier?.CompanyName ?? string.Empty,
                CategoryId = request.CategoryId,
                CategoryName = request.Category?.NameVi ?? string.Empty,
                ProductId = request.ProductId,
                ProductName = request.Product?.NameVi ?? string.Empty,
                RequestedProductName = request.RequestedProductName,
                Quantity = request.Quantity,
                SuggestedPrice = request.SuggestedPrice,
                Note = request.Note,
                Status = request.Status.ToString(),
                RejectionReason = request.RejectionReason,
                CreatedAt = request.CreatedAt,
                UpdatedAt = request.UpdatedAt,
                AllowedActions = GetAllowedActions(request.Status),
                ProductImageUrl = request.Product?.ImageUrl ?? string.Empty
            };
        }

        public async Task<ApiResponse<SupplierRequestDto>> CancelByAdminAsync(int adminId, int id, string? reason)
        {
            var supplierRequest = await _db.SupplierRequests
                .Include(r => r.Admin)
                .Include(r => r.Supplier).ThenInclude(s => s.User)
                .Include(r => r.Category)
                .Include(r => r.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (supplierRequest == null)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Không tìm thấy yêu cầu nhà cung cấp");
            }

            if (supplierRequest.AdminId != adminId)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Bạn không có quyền hủy yêu cầu này");
            }

            if (supplierRequest.Status != SupplierRequestStatus.Pending &&
                supplierRequest.Status != SupplierRequestStatus.ApprovedBySupplier)
            {
                return ApiResponse<SupplierRequestDto>.Fail("Chỉ có thể hủy yêu cầu đang chờ hoặc đã được nhà cung cấp chấp nhận");
            }

            supplierRequest.Status = SupplierRequestStatus.Cancelled;
            supplierRequest.RejectionReason = reason?.Trim() ?? string.Empty;
            supplierRequest.UpdatedAt = DateTime.UtcNow;

            _db.Notifications.Add(new Notification
            {
                UserId = supplierRequest.Supplier.UserId,
                SupplierId = supplierRequest.SupplierId,
                Title = "Yêu cầu nhập hàng đã bị hủy",
                Message = string.IsNullOrWhiteSpace(reason)
                    ? $"Quản trị viên đã hủy yêu cầu nhập hàng #{supplierRequest.Id}."
                    : $"Quản trị viên đã hủy yêu cầu nhập hàng #{supplierRequest.Id}: {reason}",
                Type = "SupplierRequestCancelled",
                RelatedId = supplierRequest.Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return ApiResponse<SupplierRequestDto>.Ok(Map(supplierRequest), "Đã hủy yêu cầu nhà cung cấp");
        }

        private static IReadOnlyList<string> GetAllowedActions(SupplierRequestStatus status)
        {
            return status switch
            {
                SupplierRequestStatus.Pending => new[] { "approve", "reject", "cancel" },
                SupplierRequestStatus.ApprovedBySupplier => new[] { "createReceipt", "cancel" },
                _ => Array.Empty<string>()
            };
        }


        private static bool TryParseStatus(string? value, out SupplierRequestStatus? status)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                status = null;
                return true;
            }

            if (Enum.TryParse<SupplierRequestStatus>(value, true, out var parsed))
            {
                status = parsed;
                return true;
            }

            status = value.Trim().ToLowerInvariant() switch
            {
                "pending" => SupplierRequestStatus.Pending,
                "approved" or "approvedbysupplier" => SupplierRequestStatus.ApprovedBySupplier,
                "rejected" or "rejectedbysupplier" => SupplierRequestStatus.RejectedBySupplier,
                "receiptcreated" => SupplierRequestStatus.ReceiptCreated,
                "completed" => SupplierRequestStatus.Completed,
                "cancelled" or "canceled" => SupplierRequestStatus.Cancelled,
                _ => null
            };

            return status.HasValue;
        }

        private static void NormalizePaging(SupplierRequestSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
