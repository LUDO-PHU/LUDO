using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/dashboard")]
    [ApiController]
    [Authorize]
    public class DashboardController : BaseController
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("stats")]
        [HttpGet("/api/admin/dashboard")]
        [HttpGet("/api/admin/dashboard/stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStats()
        {
            return ToActionResult(await _dashboardService.GetStatsAsync());
        }

        [HttpGet("/api/supplier/dashboard")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> GetSupplierStats()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _dashboardService.GetSupplierStatsAsync(userId.Value));
        }
    }
}
