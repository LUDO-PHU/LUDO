using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    [Authorize]
    public class SupplierRequestsController : BaseController
    {
        private readonly ISupplierRequestService _supplierRequestService;
        private readonly ISupplierService _supplierService;

        public SupplierRequestsController(
            ISupplierRequestService supplierRequestService,
            ISupplierService supplierService)
        {
            _supplierRequestService = supplierRequestService;
            _supplierService = supplierService;
        }

        [HttpGet("/api/admin/supplier-requests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminRequests([FromQuery] SupplierRequestSearchRequestDto request)
        {
            return ToActionResult(await _supplierRequestService.SearchAsync(request ?? new SupplierRequestSearchRequestDto()));
        }

        [HttpPost("/api/admin/supplier-requests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateSupplierRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var response = await _supplierRequestService.CreateAsync(userId.Value, request);
            return response.Success ? Ok(response) : BadRequest(response);
        }

        [HttpGet("/api/supplier/requests")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> GetSupplierRequests([FromQuery] SupplierRequestSearchRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var supplier = await _supplierService.GetByUserIdAsync(userId.Value);
            if (!supplier.Success || supplier.Data == null) return Forbid();

            request ??= new SupplierRequestSearchRequestDto();
            request.SupplierId = supplier.Data.Id;
            return ToActionResult(await _supplierRequestService.SearchAsync(request));
        }

        [HttpPost("/api/supplier/requests/{id:int}/approve")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> Approve(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            return ToActionResult(await _supplierRequestService.ApproveBySupplierAsync(userId.Value, id));
        }

        [HttpPost("/api/supplier/requests/{id:int}/reject")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectSupplierRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            return ToActionResult(await _supplierRequestService.RejectBySupplierAsync(userId.Value, id, request ?? new RejectSupplierRequestDto()));
        }
    }
}
