using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IUserService
    {
        Task<ApiResponse<PagedResult<UserDto>>> SearchAsync(UserSearchRequestDto request);
        Task<ApiResponse<IReadOnlyList<UserDto>>> GetAllAsync();
        Task<ApiResponse<UserDto>> GetByIdAsync(int id);
        Task<ApiResponse<UserDto>> CreateAsync(CreateUserDto request);
        Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserDto request);
        Task<ApiResponse<bool>> DeleteAsync(int id);
        Task<ApiResponse<bool>> UpdateProfileAsync(int userId, UpdateProfileDto request);
    }
}
