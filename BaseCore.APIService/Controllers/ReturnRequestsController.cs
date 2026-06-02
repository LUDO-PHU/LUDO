using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/returns")]
    [ApiController]
    [Authorize]
    public class ReturnRequestsController : BaseController
    {
        private readonly BaseCoreSalesContext _db;
        private readonly IWebHostEnvironment _environment;
        private readonly INotificationService _notificationService;

        public ReturnRequestsController(
            BaseCoreSalesContext db,
            IWebHostEnvironment environment,
            INotificationService notificationService)
        {
            _db = db;
            _environment = environment;
            _notificationService = notificationService;
        }

        [HttpPost]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> Create([FromBody] CreateReturnRequestDto request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Dữ liệu yêu cầu không hợp lệ"));
            }

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var order = await _db.Orders
                .Include(o => o.User)
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.Id == request.OrderId);

            if (order == null)
            {
                return NotFound(ApiResponse<ReturnRequestDto>.Fail("Không tìm thấy đơn hàng"));
            }

            if (order.UserId != userId.Value)
            {
                return Forbid();
            }

            if (order.Status != OrderStatus.Completed)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Chỉ có thể yêu cầu đổi trả cho đơn hàng đã giao thành công"));
            }

            // Rule: Only allow within 7 days
            var completedDate = order.CompletedAt ?? order.CreatedAt;
            if (DateTime.UtcNow - completedDate > TimeSpan.FromDays(7))
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Chỉ có thể gửi yêu cầu đổi trả trong 7 ngày đầu tiên"));
            }

            // Check if there is already a return request for this order
            var exists = await _db.ReturnRequests.AnyAsync(r => r.OrderId == request.OrderId);
            if (exists)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Đơn hàng này đã gửi yêu cầu đổi/trả hàng trước đó"));
            }

            var returnRequest = new ReturnRequest
            {
                OrderId = request.OrderId,
                UserId = userId.Value,
                Type = (ReturnRequestType)request.Type,
                Reason = request.Reason.Trim(),
                ImageUrl = request.ImageUrl?.Trim() ?? string.Empty,
                Status = ReturnRequestStatus.Pending,
                AdminComment = string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            _db.ReturnRequests.Add(returnRequest);
            await _db.SaveChangesAsync();

            var dto = MapToDto(returnRequest, order);
            return Ok(ApiResponse<ReturnRequestDto>.Ok(dto, "Gửi yêu cầu đổi trả thành công"));
        }

        [HttpPost("upload")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<string>.Fail("Vui lòng chọn một ảnh để tải lên"));
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            if (!allowed.Contains(extension))
            {
                return BadRequest(ApiResponse<string>.Fail("Định dạng ảnh không hỗ trợ (.jpg, .jpeg, .png, .webp, .gif)"));
            }

            var root = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(root))
            {
                root = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            }

            var uploadDir = Path.Combine(root, "uploads", "returns");
            Directory.CreateDirectory(uploadDir);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var fullPath = Path.Combine(uploadDir, fileName);
            await using var stream = System.IO.File.Create(fullPath);
            await file.CopyToAsync(stream);

            var url = $"/uploads/returns/{fileName}";
            return Ok(ApiResponse<string>.Ok(url, "Tải ảnh lên thành công"));
        }

        [HttpGet("my")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMyRequests()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var requests = await _db.ReturnRequests
                .Include(r => r.Order)
                .Include(r => r.User)
                .Where(r => r.UserId == userId.Value)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = requests.Select(r => MapToDto(r, r.Order)).ToList();
            return Ok(ApiResponse<List<ReturnRequestDto>>.Ok(dtos));
        }

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminRequests()
        {
            var requests = await _db.ReturnRequests
                .Include(r => r.Order)
                .Include(r => r.User)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = requests.Select(r => MapToDto(r, r.Order)).ToList();
            return Ok(ApiResponse<List<ReturnRequestDto>>.Ok(dtos));
        }

        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(int id, [FromBody] ProcessReturnRequestDto request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Dữ liệu phản hồi không hợp lệ"));
            }

            var returnRequest = await _db.ReturnRequests
                .Include(r => r.Order)
                .ThenInclude(o => o.OrderDetails)
                .ThenInclude(d => d.StockAllocations)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (returnRequest == null)
            {
                return NotFound(ApiResponse<ReturnRequestDto>.Fail("Không tìm thấy yêu cầu đổi trả"));
            }

            if (returnRequest.Status != ReturnRequestStatus.Pending)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Yêu cầu này đã được xử lý từ trước"));
            }

            await using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                returnRequest.Status = ReturnRequestStatus.Approved;
                returnRequest.AdminComment = request.AdminComment.Trim();
                returnRequest.ProcessedAt = DateTime.UtcNow;

                // Business Logic: If RETURN (Trả hàng hoàn tiền) -> restore stock & batches, decrease revenue
                if (returnRequest.Type == ReturnRequestType.Return)
                {
                    var order = returnRequest.Order;

                    // 1. Update Order Status
                    order.Status = OrderStatus.ReturnedToStock;
                    order.ReturnedAt = DateTime.UtcNow;

                    // 2. Restore Stock and Stock Batch quantity
                    foreach (var detail in order.OrderDetails)
                    {
                        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == detail.ProductId);
                        if (product != null)
                        {
                            if (detail.StockAllocations.Count > 0)
                            {
                                foreach (var allocation in detail.StockAllocations)
                                {
                                    var batch = await _db.StockBatches.FirstOrDefaultAsync(b => b.Id == allocation.StockBatchId);
                                    if (batch != null)
                                    {
                                        batch.QuantityRemaining += allocation.Quantity;
                                    }
                                }
                            }

                            product.Stock += detail.Quantity;
                            product.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    // 3. Insert negative Profit transaction to reduce dashboard revenue/profit
                    var existsNegativeTx = await _db.RevenueTransactions.AnyAsync(t =>
                        t.OwnerType == "Admin" &&
                        t.TransactionType == "AdminSaleProfit" &&
                        t.ReferenceType == "Order" &&
                        t.ReferenceId == order.Id &&
                        t.Amount < 0);

                    if (!existsNegativeTx)
                    {
                        _db.RevenueTransactions.Add(new RevenueTransaction
                        {
                            OwnerType = "Admin",
                            OwnerId = null,
                            Amount = -order.Profit, // Negative to reduce
                            TransactionType = "AdminSaleProfit",
                            ReferenceType = "Order",
                            ReferenceId = order.Id,
                            Note = $"Hoàn tiền/Doanh thu giảm từ đơn {order.OrderCode} do trả hàng thành công",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                // Send notification to User (displays full comment)
                var typeLabel = returnRequest.Type == ReturnRequestType.Return ? "trả hàng" : "đổi hàng";
                var title = $"Yêu cầu {typeLabel} đã được CHẤP NHẬN";
                var message = $"Yêu cầu {typeLabel} đơn {returnRequest.Order.OrderCode} đã được duyệt thành công.\nPhản hồi từ Admin: {returnRequest.AdminComment}";

                await _notificationService.CreateSystemNotificationAsync(
                    returnRequest.UserId,
                    title,
                    message,
                    $"/customer/orders?orderId={returnRequest.OrderId}"
                );

                return Ok(ApiResponse<ReturnRequestDto>.Ok(MapToDto(returnRequest, returnRequest.Order), "Phê duyệt yêu cầu đổi trả thành công"));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Lỗi khi xử lý phê duyệt", ex.Message));
            }
        }

        [HttpPost("{id:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApprovePost(int id, [FromBody] ProcessReturnRequestDto request)
        {
            return await Approve(id, request);
        }

        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(int id, [FromBody] ProcessReturnRequestDto request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Dữ liệu phản hồi không hợp lệ"));
            }

            var returnRequest = await _db.ReturnRequests
                .Include(r => r.Order)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (returnRequest == null)
            {
                return NotFound(ApiResponse<ReturnRequestDto>.Fail("Không tìm thấy yêu cầu đổi trả"));
            }

            if (returnRequest.Status != ReturnRequestStatus.Pending)
            {
                return BadRequest(ApiResponse<ReturnRequestDto>.Fail("Yêu cầu này đã được xử lý từ trước"));
            }

            returnRequest.Status = ReturnRequestStatus.Rejected;
            returnRequest.AdminComment = request.AdminComment.Trim();
            returnRequest.ProcessedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Send notification to User (displays full comment)
            var typeLabel = returnRequest.Type == ReturnRequestType.Return ? "trả hàng" : "đổi hàng";
            var title = $"Yêu cầu {typeLabel} bị TỪ CHỐI";
            var message = $"Yêu cầu {typeLabel} đơn {returnRequest.Order.OrderCode} đã bị từ chối.\nPhản hồi từ Admin: {returnRequest.AdminComment}";

            await _notificationService.CreateSystemNotificationAsync(
                returnRequest.UserId,
                title,
                message,
                $"/customer/orders?orderId={returnRequest.OrderId}"
            );

            return Ok(ApiResponse<ReturnRequestDto>.Ok(MapToDto(returnRequest, returnRequest.Order), "Từ chối yêu cầu đổi trả thành công"));
        }

        [HttpPost("{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectPost(int id, [FromBody] ProcessReturnRequestDto request)
        {
            return await Reject(id, request);
        }

        private static ReturnRequestDto MapToDto(ReturnRequest req, Order order)
        {
            return new ReturnRequestDto
            {
                Id = req.Id,
                OrderId = req.OrderId,
                OrderCode = order?.OrderCode ?? string.Empty,
                UserId = req.UserId,
                Username = req.User?.UserName ?? string.Empty,
                CustomerName = req.User?.FullName ?? req.User?.UserName ?? string.Empty,
                Type = (int)req.Type,
                Reason = req.Reason,
                ImageUrl = req.ImageUrl,
                Status = (int)req.Status,
                AdminComment = req.AdminComment,
                CreatedAt = req.CreatedAt,
                ProcessedAt = req.ProcessedAt,
                TotalAmount = order?.TotalAmount ?? 0
            };
        }
    }
}
