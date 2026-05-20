using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IDashboardService
    {
        Task<ApiResponse<DashboardStatsDto>> GetStatsAsync();
        Task<ApiResponse<SupplierDashboardDto>> GetSupplierStatsAsync(int userId);
    }
}
