using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface ISupplierRequestService
    {
        Task<ApiResponse<PagedResult<SupplierRequestDto>>> SearchAsync(SupplierRequestSearchRequestDto request);
        Task<ApiResponse<SupplierRequestDto>> CreateAsync(int adminId, CreateSupplierRequestDto request);
        Task<ApiResponse<SupplierRequestReceiptPrefillDto>> ApproveBySupplierAsync(int userId, int id);
        Task<ApiResponse<SupplierRequestDto>> RejectBySupplierAsync(int userId, int id, RejectSupplierRequestDto request);
    }
}
