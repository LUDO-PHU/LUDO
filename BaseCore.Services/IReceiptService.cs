using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IReceiptService
    {
        Task<ApiResponse<PagedResult<ReceiptDto>>> SearchAsync(ReceiptSearchRequestDto request);
        Task<ApiResponse<IReadOnlyList<ReceiptDto>>> GetAllAsync();
        Task<ApiResponse<ReceiptDto>> GetByIdAsync(int id);
        Task<ApiResponse<ReceiptDto>> CreateAsync(CreateReceiptDto request);
        Task<ApiResponse<ReceiptDto>> CreateForSupplierAsync(int userId, CreateReceiptDto request);
        Task<ApiResponse<ReceiptDto>> UpdateStatusAsync(int id, UpdateReceiptStatusDto request);
        Task<ApiResponse<ReceiptDto>> ApproveByAdminAsync(int id, int? adminId);
        Task<ApiResponse<ReceiptDto>> RejectByAdminAsync(int id, int? adminId, string? reason);
    }
}
