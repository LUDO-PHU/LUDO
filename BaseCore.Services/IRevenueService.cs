using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IRevenueService
    {
        Task<ApiResponse<AdminRevenueDto>> GetAdminRevenueAsync();
        Task<decimal> GetSupplierRevenueAsync(int supplierId);
    }
}
