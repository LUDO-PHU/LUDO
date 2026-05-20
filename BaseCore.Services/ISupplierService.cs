using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface ISupplierService
    {
        Task<ApiResponse<PagedResult<SupplierDto>>> SearchAsync(SupplierSearchRequestDto request);
        Task<ApiResponse<IReadOnlyList<SupplierDto>>> GetAllAsync();
        Task<ApiResponse<SupplierDto>> GetByIdAsync(int id);
        Task<ApiResponse<SupplierDto>> CreateAsync(CreateSupplierDto request);
        Task<ApiResponse<SupplierDto>> UpdateAsync(int id, UpdateSupplierDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
        Task<ApiResponse<SupplierDto>> GetByUserIdAsync(int userId);
    }
}
