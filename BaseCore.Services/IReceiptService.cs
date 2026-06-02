using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IReceiptService
    {
        Task<ApiResponse<PagedResult<ReceiptDto>>> SearchAsync(ReceiptSearchRequestDto request, string? viewerRole = null);
        Task<ApiResponse<IReadOnlyList<ReceiptDto>>> GetAllAsync(string? viewerRole = null);
        Task<ApiResponse<ReceiptDto>> GetByIdAsync(int id, string? viewerRole = null);
        Task<ApiResponse<ReceiptDto>> CreateAsync(CreateReceiptDto request);
        Task<ApiResponse<ReceiptDto>> CreateForSupplierAsync(int userId, CreateReceiptDto request);
        Task<ApiResponse<ReceiptDto>> UpdateStatusAsync(int id, UpdateReceiptStatusDto request);
        Task<ApiResponse<ReceiptDto>> ApproveByAdminAsync(int id, int? adminId);
        Task<ApiResponse<ReceiptDto>> RejectByAdminAsync(int id, int? adminId, string? reason);
    }
}
