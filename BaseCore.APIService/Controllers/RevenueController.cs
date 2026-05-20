using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class RevenueController : BaseController
    {
        private readonly IRevenueService _revenueService;

        public RevenueController(IRevenueService revenueService)
        {
            _revenueService = revenueService;
        }

        [HttpGet("/api/admin/revenue")]
        public async Task<IActionResult> GetAdminRevenue()
        {
            return ToActionResult(await _revenueService.GetAdminRevenueAsync());
        }
    }
}
