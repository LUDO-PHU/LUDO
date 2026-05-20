using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/suppliers")]
    [ApiController]
    [Authorize]
    public class SuppliersController : BaseController
    {
        private readonly ISupplierService _supplierService;

        public SuppliersController(ISupplierService supplierService)
        {
            _supplierService = supplierService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] SupplierSearchRequestDto request)
        {
            return ToActionResult(await _supplierService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            return ToActionResult(await _supplierService.GetByIdAsync(id));
        }

        [HttpGet("me")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _supplierService.GetByUserIdAsync(userId.Value));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateSupplierDto request)
        {
            var response = await _supplierService.CreateAsync(request);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }
            return BadRequest(response);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSupplierDto request)
        {
            return ToActionResult(await _supplierService.UpdateAsync(id, request));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            return ToActionResult(await _supplierService.DeleteAsync(id));
        }

        [HttpPatch("{id:int}/toggle-active")]
        [HttpPut("{id:int}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var supplier = await _supplierService.GetByIdAsync(id);
            if (supplier.Data == null) return NotFound(supplier);

            var request = new UpdateSupplierDto
            {
                CompanyName = supplier.Data.CompanyName,
                ContactName = supplier.Data.ContactName,
                Email = supplier.Data.Email,
                Phone = supplier.Data.Phone,
                Address = supplier.Data.Address,
                CategoryId = supplier.Data.CategoryId,
                IsActive = !supplier.Data.IsActive
            };

            return ToActionResult(await _supplierService.UpdateAsync(id, request));
        }
    }
}
