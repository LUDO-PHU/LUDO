using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;

namespace BaseCore.Services
{
    public interface IAuthService
    {
        Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request);
        Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequestDto request);
        Task<ApiResponse<AuthUserDto>> GetCurrentUserAsync(int userId);
    }
}
