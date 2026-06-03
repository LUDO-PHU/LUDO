using BaseCore.Common;
using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using Microsoft.Extensions.Configuration;
using System.Linq;

namespace BaseCore.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepositoryEF _userRepository;
        private readonly ISupplierRepositoryEF _supplierRepository;
        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IConfiguration _configuration;

        public AuthService(
            IUserRepositoryEF userRepository,
            ISupplierRepositoryEF supplierRepository,
            IOrderRepositoryEF orderRepository,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _supplierRepository = supplierRepository;
            _orderRepository = orderRepository;
            _configuration = configuration;
        }

        public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request)
        {
            if (request == null)
            {
                return ApiResponse<LoginResponseDto>.Fail("Yêu cầu đăng nhập không hợp lệ");
            }

            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return ApiResponse<LoginResponseDto>.Fail("Vui lòng nhập tên đăng nhập và mật khẩu");
            }

            var user = await _userRepository.GetByUsernameAsync(request.Username);
            if (user == null)
            {
                return ApiResponse<LoginResponseDto>.Fail("Tên đăng nhập hoặc mật khẩu không đúng");
            }

            if (!user.IsActive)
            {
                return ApiResponse<LoginResponseDto>.Fail("Tài khoản đã ngừng hoạt động");
            }

            if (!string.IsNullOrWhiteSpace(request.Role) &&
                TryParseRole(request.Role, out var requestedRole) &&
                user.Role != requestedRole)
            {
                return ApiResponse<LoginResponseDto>.Fail("Vai trò tài khoản không phù hợp với yêu cầu đăng nhập");
            }

            if (!PasswordHasher.Verify(request.Password, user.PasswordHash))
            {
                return ApiResponse<LoginResponseDto>.Fail("Tên đăng nhập hoặc mật khẩu không đúng");
            }

            Supplier? supplier = null;
            if (user.Role == Role.Supplier)
            {
                supplier = await _supplierRepository.GetByUserIdAsync(user.Id);
                if (supplier != null && !supplier.IsActive)
                {
                    return ApiResponse<LoginResponseDto>.Fail("Tài khoản nhà cung cấp đã ngừng hoạt động");
                }
            }

            var minutes = GetTokenLifetimeMinutes();
            var expiresAt = DateTime.UtcNow.AddMinutes(minutes);
            var secretKey = _configuration["Jwt:SecretKey"] ?? _configuration["AppSettings:Secret"];
            if (string.IsNullOrEmpty(secretKey) || secretKey.Length < 16)
            {
                throw new InvalidOperationException("JWT SecretKey is missing or too short. Please set 'Jwt:SecretKey' or 'AppSettings:Secret' in configuration with at least 16 characters.");
            }
            var token = TokenHelper.GenerateToken(secretKey, minutes, user.Id.ToString(), user.UserName, user.Role.ToString());

            decimal totalSpent = 0;
            string memberTier = "Đồng";
            if (user.Role == Role.User)
            {
                var orders = await _orderRepository.GetByUserAsync(user.Id);
                totalSpent = orders
                    .Where(o => o.Status == OrderStatus.Completed)
                    .Sum(o => o.TotalAmount);
                memberTier = GetMemberTier(totalSpent);
            }

            return ApiResponse<LoginResponseDto>.Ok(new LoginResponseDto
            {
                Token = token,
                ExpiresAt = expiresAt,
                User = ToAuthUserDto(user, supplier, memberTier, totalSpent)
            }, "Đăng nhập thành công");
        }

        public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequestDto request)
        {
            if (request == null)
            {
                return ApiResponse<UserDto>.Fail("Yêu cầu đăng ký không hợp lệ");
            }

            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return ApiResponse<UserDto>.Fail("Vui lòng nhập tên đăng nhập");
            }

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            {
                return ApiResponse<UserDto>.Fail("Mật khẩu phải có ít nhất 6 ký tự");
            }

            if (!TryParseRole(request.Role, out var role))
            {
                return ApiResponse<UserDto>.Fail("Vai trò không hợp lệ");
            }

            if (role == Role.Admin)
            {
                return ApiResponse<UserDto>.Fail("Tài khoản quản trị viên phải được tạo bởi quản trị viên");
            }

            if (await _userRepository.ExistsByUsernameAsync(request.Username))
            {
                return ApiResponse<UserDto>.Fail("Tên đăng nhập đã tồn tại");
            }

            var user = new User
            {
                UserName = request.Username.Trim(),
                PasswordHash = PasswordHasher.Hash(request.Password),
                FullName = string.IsNullOrWhiteSpace(request.FullName) ? request.Username.Trim() : request.FullName.Trim(),
                Email = request.Email?.Trim() ?? string.Empty,
                Phone = request.Phone?.Trim() ?? string.Empty,
                Role = role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user);

            if (role == Role.Supplier)
            {
                var companyName = string.IsNullOrWhiteSpace(request.CompanyName)
                    ? user.FullName
                    : request.CompanyName.Trim();

                await _supplierRepository.AddAsync(new Supplier
                {
                    UserId = user.Id,
                    CompanyName = companyName,
                    ContactName = user.FullName,
                    Email = user.Email,
                    Phone = user.Phone,
                    Address = string.Empty,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            return ApiResponse<UserDto>.Ok(UserService.MapUser(user), "Đăng ký thành công");
        }

        public async Task<ApiResponse<AuthUserDto>> GetCurrentUserAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return ApiResponse<AuthUserDto>.Fail("Không tìm thấy người dùng");
            }

            Supplier? supplier = null;
            if (user.Role == Role.Supplier)
            {
                supplier = await _supplierRepository.GetByUserIdAsync(user.Id);
            }

            decimal totalSpent = 0;
            string memberTier = "Đồng";
            if (user.Role == Role.User)
            {
                var orders = await _orderRepository.GetByUserAsync(user.Id);
                totalSpent = orders
                    .Where(o => o.Status == OrderStatus.Completed)
                    .Sum(o => o.TotalAmount);
                memberTier = GetMemberTier(totalSpent);
            }

            return ApiResponse<AuthUserDto>.Ok(ToAuthUserDto(user, supplier, memberTier, totalSpent));
        }

        private int GetTokenLifetimeMinutes()
        {
            var rawValue = _configuration["Jwt:MinuteExpiredToken"] ?? _configuration["AppSettings:MinuteExpiredToken"];
            return int.TryParse(rawValue, out var minutes) && minutes > 0 ? minutes : 60 * 24 * 7;
        }

        private static AuthUserDto ToAuthUserDto(User user, Supplier? supplier, string memberTier, decimal totalSpent)
        {
            return new AuthUserDto
            {
                Id = user.Id,
                Username = user.UserName,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role.ToString(),
                UserType = UserService.ToUserType(user.Role),
                IsActive = user.IsActive,
                SupplierId = supplier?.Id,
                CompanyName = supplier?.CompanyName,
                SupplierCategoryId = supplier?.CategoryId,
                SupplierCategoryName = supplier?.Category?.NameVi,
                MemberTier = memberTier,
                TotalSpent = totalSpent
            };
        }

        private static string GetMemberTier(decimal totalSpent)
        {
            if (totalSpent >= 50000000) return "Kim cương";
            if (totalSpent >= 20000000) return "Vàng";
            if (totalSpent >= 5000000) return "Bạc";
            return "Đồng";
        }

        private static bool TryParseRole(string? value, out Role role)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                role = Role.User;
                return true;
            }

            if (Enum.TryParse(value, true, out role))
            {
                return true;
            }

            role = value.Trim() switch
            {
                "0" => Role.User,
                "1" => Role.Admin,
                "2" => Role.Supplier,
                _ => Role.User
            };

            return value.Trim() is "0" or "1" or "2";
        }
    }
}
