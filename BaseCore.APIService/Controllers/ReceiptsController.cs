using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/receipts")]
    [ApiController]
    [Authorize]
    public class ReceiptsController : BaseController
    {
        private readonly IReceiptService _receiptService;
        private readonly ISupplierService _supplierService;

        public ReceiptsController(IReceiptService receiptService, ISupplierService supplierService)
        {
            _receiptService = receiptService;
            _supplierService = supplierService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            return ToActionResult(await _receiptService.GetAllAsync());
        }

        [HttpGet("my")]
        [HttpGet("/api/supplier/receipts")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> GetMyReceipts([FromQuery] ReceiptSearchRequestDto request)
        {
            request ??= new ReceiptSearchRequestDto();
            var supplier = await GetCurrentSupplierAsync();
            if (supplier == null) return Forbid();

            request.SupplierId = supplier.Id;
            return ToActionResult(await _receiptService.SearchAsync(request));
        }

        [HttpGet("search")]
        [HttpGet("/api/admin/receipts")]
        public async Task<IActionResult> Search([FromQuery] ReceiptSearchRequestDto request)
        {
            request ??= new ReceiptSearchRequestDto();
            if (!User.IsInRole("Admin"))
            {
                var supplier = await GetCurrentSupplierAsync();
                if (supplier == null) return Forbid();
                request.SupplierId = supplier.Id;
            }

            return ToActionResult(await _receiptService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _receiptService.GetByIdAsync(id);
            if (response.Success && response.Data != null && !User.IsInRole("Admin"))
            {
                var supplier = await GetCurrentSupplierAsync();
                if (supplier == null || response.Data.SupplierId != supplier.Id)
                {
                    return Forbid();
                }
            }

            return ToActionResult(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Supplier")]
        public async Task<IActionResult> Create([FromBody] CreateReceiptDto request)
        {
            request ??= new CreateReceiptDto();
            if (!User.IsInRole("Admin"))
            {
                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized();
                var supplierResponse = await _receiptService.CreateForSupplierAsync(userId.Value, request);
                if (supplierResponse.Success)
                {
                    return CreatedAtAction(nameof(GetById), new { id = supplierResponse.Data!.Id }, supplierResponse);
                }

                return BadRequest(supplierResponse);
            }

            var response = await _receiptService.CreateAsync(request);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }
            return BadRequest(response);
        }

        [HttpPost("/api/supplier/receipts")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> CreateSupplierReceipt([FromBody] CreateReceiptDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var response = await _receiptService.CreateForSupplierAsync(userId.Value, request ?? new CreateReceiptDto());
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }

            return BadRequest(response);
        }

        [HttpPut("{id:int}/status")]
        [Authorize(Roles = "Admin,Supplier")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateReceiptStatusDto request)
        {
            if (!User.IsInRole("Admin"))
            {
                // Supplier chỉ được hủy đơn khi Pending
                var receipt = await _receiptService.GetByIdAsync(id);
                if (receipt.Data == null) return NotFound(receipt);
                
                var supplier = await GetCurrentSupplierAsync();
                if (supplier == null || receipt.Data.SupplierId != supplier.Id) return Forbid();
                
                if (!string.Equals(request.Status, "Cancelled", System.StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(request.Status, "CancelledBySupplier", System.StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(ApiResponse<bool>.Fail("Nhà cung cấp chỉ được hủy biên lai"));
                }
            }

            return ToActionResult(await _receiptService.UpdateStatusAsync(id, request));
        }

        [HttpPut("{id:int}/approve")]
        [HttpPost("/api/admin/receipts/{id:int}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(int id)
        {
            return ToActionResult(await _receiptService.ApproveByAdminAsync(id, GetCurrentUserId()));
        }

        [HttpPut("{id:int}/reject")]
        [HttpPost("/api/admin/receipts/{id:int}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(int id, [FromBody] UpdateReceiptStatusDto? request)
        {
            return ToActionResult(await _receiptService.RejectByAdminAsync(id, GetCurrentUserId(), request?.CancelReason));
        }

        [HttpPut("{id:int}/cancel")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> Cancel(int id)
        {
            var receipt = await _receiptService.GetByIdAsync(id);
            if (receipt.Data == null) return NotFound(receipt);

            var supplier = await GetCurrentSupplierAsync();
            if (supplier == null || receipt.Data.SupplierId != supplier.Id) return Forbid();

            return ToActionResult(await _receiptService.UpdateStatusAsync(id, new UpdateReceiptStatusDto { Status = "Cancelled" }));
        }

        private async Task<SupplierDto?> GetCurrentSupplierAsync()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return null;
            var response = await _supplierService.GetByUserIdAsync(userId.Value);
            return response.Data;
        }
    }
}
