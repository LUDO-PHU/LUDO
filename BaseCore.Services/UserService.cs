using BaseCore.Common;
using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System.Globalization;
using System.Text;

namespace BaseCore.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepositoryEF _userRepository;
        private readonly IOrderRepositoryEF _orderRepository;

        public UserService(IUserRepositoryEF userRepository, IOrderRepositoryEF orderRepository)
        {
            _userRepository = userRepository;
            _orderRepository = orderRepository;
        }

        public async Task<ApiResponse<PagedResult<UserDto>>> SearchAsync(UserSearchRequestDto request)
        {
            request ??= new UserSearchRequestDto();
            NormalizePaging(request);

            Role? role = null;
            if (request.UserType.HasValue)
            {
                role = FromUserType(request.UserType.Value);
            }
            else if (!TryParseRole(request.Role, out role))
            {
                return ApiResponse<PagedResult<UserDto>>.Fail("Vai trò không hợp lệ");
            }

            var (users, totalCount) = await _userRepository.SearchAsync(
                request.Keyword,
                role,
                request.IsActive,
                request.Page,
                request.PageSize);

            return ApiResponse<PagedResult<UserDto>>.Ok(new PagedResult<UserDto>
            {
                Items = await EnrichUsersAsync(users),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<UserDto>>> GetAllAsync()
        {
            var users = await _userRepository.GetAllAsync();
            return ApiResponse<IReadOnlyList<UserDto>>.Ok(await EnrichUsersAsync(users));
        }

        public async Task<ApiResponse<UserDto>> GetByIdAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<UserDto>.Fail("Mã người dùng không hợp lệ");
            }

            var user = await _userRepository.GetByIdAsync(id);
            return user == null
                ? ApiResponse<UserDto>.Fail("Không tìm thấy người dùng")
                : ApiResponse<UserDto>.Ok((await EnrichUsersAsync(new[] { user })).First());
        }

        public async Task<ApiResponse<UserDto>> CreateAsync(CreateUserDto request)
        {
            var validation = ValidateCreate(request);
            if (validation.Count > 0)
            {
                return ApiResponse<UserDto>.Fail("Dữ liệu người dùng không hợp lệ", validation.ToArray());
            }

            if (!TryParseRole(request.Role, out var role) || role == null)
            {
                return ApiResponse<UserDto>.Fail("Vai trò không hợp lệ");
            }

            if (await _userRepository.ExistsByUsernameAsync(request.Username))
            {
                return ApiResponse<UserDto>.Fail("Tên đăng nhập đã tồn tại");
            }

            var user = new User
            {
                UserName = request.Username.Trim(),
                PasswordHash = PasswordHasher.Hash(request.Password),
                FullName = request.FullName.Trim(),
                Email = request.Email?.Trim() ?? string.Empty,
                Phone = request.Phone?.Trim() ?? string.Empty,
                Role = role.Value,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user);
            return ApiResponse<UserDto>.Ok(MapUser(user), "Đã tạo người dùng");
        }

        public async Task<ApiResponse<UserDto>> UpdateAsync(int id, UpdateUserDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<UserDto>.Fail("Mã người dùng không hợp lệ");
            }

            if (request == null)
            {
                return ApiResponse<UserDto>.Fail("Dữ liệu người dùng không hợp lệ");
            }

            if (!TryParseRole(request.Role, out var role) || role == null)
            {
                return ApiResponse<UserDto>.Fail("Vai trò không hợp lệ");
            }

            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return ApiResponse<UserDto>.Fail("Không tìm thấy người dùng");
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return ApiResponse<UserDto>.Fail("Vui lòng nhập họ tên");
            }

            if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 6)
            {
                return ApiResponse<UserDto>.Fail("Mật khẩu phải có ít nhất 6 ký tự");
            }

            user.FullName = request.FullName.Trim();
            user.Email = request.Email?.Trim() ?? string.Empty;
            user.Phone = request.Phone?.Trim() ?? string.Empty;
            user.Role = role.Value;
            user.IsActive = request.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.PasswordHash = PasswordHasher.Hash(request.Password);
            }

            await _userRepository.UpdateAsync(user);
            return ApiResponse<UserDto>.Ok(MapUser(user), "Đã cập nhật người dùng");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<bool>.Fail("Mã người dùng không hợp lệ");
            }

            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return ApiResponse<bool>.Fail("Không tìm thấy người dùng");
            }

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            return ApiResponse<bool>.Ok(true, "Đã ngừng hoạt động tài khoản");
        }

        public async Task<ApiResponse<bool>> UpdateProfileAsync(int userId, UpdateProfileDto request)
        {
            if (request == null) return ApiResponse<bool>.Fail("Yêu cầu không hợp lệ");

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return ApiResponse<bool>.Fail("Không tìm thấy người dùng");

            if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                user.FullName = request.FullName.Trim();
            }

            // Đổi mật khẩu — bắt buộc có mật khẩu cũ đúng
            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                if (string.IsNullOrWhiteSpace(request.OldPassword))
                    return ApiResponse<bool>.Fail("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu");

                if (!PasswordHasher.Verify(request.OldPassword, user.PasswordHash))
                    return ApiResponse<bool>.Fail("Mật khẩu hiện tại không đúng");

                if (request.NewPassword.Length < 6)
                    return ApiResponse<bool>.Fail("Mật khẩu mới phải có ít nhất 6 ký tự");

                user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);
            return ApiResponse<bool>.Ok(true, "Đã cập nhật hồ sơ");
        }

        public static UserDto MapUser(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Username = user.UserName,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = user.Role.ToString(),
                UserType = ToUserType(user.Role),
                IsActive = user.IsActive,
                MemberTier = "Đồng",
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }

        private async Task<List<UserDto>> EnrichUsersAsync(IEnumerable<User> users)
        {
            var result = users.Select(MapUser).ToList();
            if (result.Count == 0)
            {
                return result;
            }

            var userIds = result.Select(u => u.Id).ToHashSet();
            var orders = await _orderRepository.GetAllAsync();
            var completedOrders = orders
                .Where(o => userIds.Contains(o.UserId) && o.Status == OrderStatus.Completed)
                .GroupBy(o => o.UserId)
                .ToDictionary(
                    g => g.Key,
                    g => new { TotalSpent = g.Sum(o => o.TotalAmount), OrderCount = g.Count() });

            foreach (var user in result)
            {
                if (completedOrders.TryGetValue(user.Id, out var stats))
                {
                    user.TotalSpent = stats.TotalSpent;
                    user.OrderCount = stats.OrderCount;
                    user.MemberTier = GetMemberTier(stats.TotalSpent);
                }
                else
                {
                    user.MemberTier = GetMemberTier(0);
                }
            }

            return result;
        }

        private static string GetMemberTier(decimal totalSpent)
        {
            if (totalSpent >= 50000000) return "Kim cương";
            if (totalSpent >= 20000000) return "Vàng";
            if (totalSpent >= 5000000) return "Bạc";
            return "Đồng";
        }

        public static int ToUserType(Role role)
        {
            return role switch
            {
                Role.Admin => 1,
                Role.Supplier => 2,
                _ => 0
            };
        }

        public static Role FromUserType(int userType)
        {
            return userType switch
            {
                1 => Role.Admin,
                2 => Role.Supplier,
                _ => Role.User
            };
        }

        public static bool TryParseRole(string? value, out Role? role)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                role = null;
                return true;
            }

            role = value.Trim() switch
            {
                "0" => Role.User,
                "1" => Role.Admin,
                "2" => Role.Supplier,
                _ => null
            };

            if (!role.HasValue)
            {
                if (Enum.TryParse<Role>(value, true, out var parsed))
                {
                    role = parsed;
                }
                else
                {
                    role = MatchRoleAlias(value);
                }
            }

            return role.HasValue;
        }

        private static Role? MatchRoleAlias(string value)
        {
            var normalized = RemoveDiacritics(value).Trim().ToLowerInvariant();

            return normalized switch
            {
                "administrator" or "quan tri" or "quan tri vien" or "qtv" => Role.Admin,
                "customer" or "khach" or "khach hang" or "nguoi dung" => Role.User,
                "nha cung cap" or "ncc" => Role.Supplier,
                _ => null
            };
        }

        private static string RemoveDiacritics(string value)
        {
            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var c in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(c);
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static List<string> ValidateCreate(CreateUserDto request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            if (string.IsNullOrWhiteSpace(request.Username))
            {
                errors.Add("Vui lòng nhập tên đăng nhập");
            }

            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            {
                errors.Add("Mật khẩu phải có ít nhất 6 ký tự");
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                errors.Add("Vui lòng nhập họ tên");
            }

            return errors;
        }

        private static void NormalizePaging(UserSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
