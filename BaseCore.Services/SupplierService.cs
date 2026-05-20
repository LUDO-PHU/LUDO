using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

namespace BaseCore.Services
{
    public class SupplierService : ISupplierService
    {
        private readonly ISupplierRepositoryEF _supplierRepository;
        private readonly IUserRepositoryEF _userRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;

        public SupplierService(
            ISupplierRepositoryEF supplierRepository,
            IUserRepositoryEF userRepository,
            ICategoryRepositoryEF categoryRepository)
        {
            _supplierRepository = supplierRepository;
            _userRepository = userRepository;
            _categoryRepository = categoryRepository;
        }

        public async Task<ApiResponse<PagedResult<SupplierDto>>> SearchAsync(SupplierSearchRequestDto request)
        {
            request ??= new SupplierSearchRequestDto();
            NormalizePaging(request);

            var (suppliers, totalCount) = await _supplierRepository.SearchAsync(
                request.Keyword,
                request.IsActive,
                request.CategoryId,
                request.SortBy,
                request.SortDir,
                request.Page,
                request.PageSize);

            return ApiResponse<PagedResult<SupplierDto>>.Ok(new PagedResult<SupplierDto>
            {
                Items = suppliers.Select(MapSupplier).ToList(),
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<SupplierDto>>> GetAllAsync()
        {
            var (suppliers, _) = await _supplierRepository.SearchAsync(null, null, null, null, null, 1, int.MaxValue);
            return ApiResponse<IReadOnlyList<SupplierDto>>.Ok(suppliers.Select(MapSupplier).ToList());
        }

        public async Task<ApiResponse<SupplierDto>> GetByIdAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<SupplierDto>.Fail("Mã nhà cung cấp không hợp lệ");
            }

            var supplier = await _supplierRepository.GetByIdWithUserAsync(id);
            return supplier == null
                ? ApiResponse<SupplierDto>.Fail("Không tìm thấy nhà cung cấp")
                : ApiResponse<SupplierDto>.Ok(MapSupplier(supplier));
        }

        public async Task<ApiResponse<SupplierDto>> CreateAsync(CreateSupplierDto request)
        {
            var errors = ValidateSupplier(request);
            if (errors.Count > 0)
            {
                return ApiResponse<SupplierDto>.Fail("Dữ liệu nhà cung cấp không hợp lệ", errors.ToArray());
            }

            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
            {
                return ApiResponse<SupplierDto>.Fail("Tài khoản nhà cung cấp không tồn tại");
            }

            if (user.Role != Role.Supplier)
            {
                return ApiResponse<SupplierDto>.Fail("Tài khoản được chọn phải có vai trò nhà cung cấp");
            }

            if (await _supplierRepository.ExistsByUserIdAsync(request.UserId))
            {
                return ApiResponse<SupplierDto>.Fail("Hồ sơ nhà cung cấp đã tồn tại cho tài khoản này");
            }

            if (request.CategoryId.HasValue && request.CategoryId > 0 && await _categoryRepository.GetByIdAsync(request.CategoryId.Value) == null)
            {
                return ApiResponse<SupplierDto>.Fail("Danh mục không tồn tại");
            }

            var supplier = new Supplier
            {
                UserId = request.UserId,
                CompanyName = request.CompanyName.Trim(),
                ContactName = request.ContactName?.Trim() ?? string.Empty,
                Email = request.Email?.Trim() ?? string.Empty,
                Phone = request.Phone?.Trim() ?? string.Empty,
                Address = request.Address?.Trim() ?? string.Empty,
                CategoryId = request.CategoryId,
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _supplierRepository.AddAsync(supplier);
            var created = await _supplierRepository.GetByIdWithUserAsync(supplier.Id) ?? supplier;

            return ApiResponse<SupplierDto>.Ok(MapSupplier(created), "Đã tạo nhà cung cấp");
        }

        public async Task<ApiResponse<SupplierDto>> UpdateAsync(int id, UpdateSupplierDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<SupplierDto>.Fail("Mã nhà cung cấp không hợp lệ");
            }

            var errors = ValidateSupplier(request);
            if (errors.Count > 0)
            {
                return ApiResponse<SupplierDto>.Fail("Dữ liệu nhà cung cấp không hợp lệ", errors.ToArray());
            }

            var supplier = await _supplierRepository.GetByIdWithUserAsync(id);
            if (supplier == null)
            {
                return ApiResponse<SupplierDto>.Fail("Không tìm thấy nhà cung cấp");
            }

            if (request.CategoryId.HasValue && request.CategoryId > 0 && await _categoryRepository.GetByIdAsync(request.CategoryId.Value) == null)
            {
                return ApiResponse<SupplierDto>.Fail("Danh mục không tồn tại");
            }

            supplier.CompanyName = request.CompanyName.Trim();
            supplier.ContactName = request.ContactName?.Trim() ?? string.Empty;
            supplier.Email = request.Email?.Trim() ?? string.Empty;
            supplier.Phone = request.Phone?.Trim() ?? string.Empty;
            supplier.Address = request.Address?.Trim() ?? string.Empty;
            supplier.CategoryId = request.CategoryId;
            supplier.IsActive = request.IsActive;
            supplier.UpdatedAt = DateTime.UtcNow;
            if (supplier.User != null)
            {
                supplier.User.IsActive = request.IsActive;
                supplier.User.UpdatedAt = DateTime.UtcNow;
            }

            await _supplierRepository.UpdateAsync(supplier);
            return ApiResponse<SupplierDto>.Ok(MapSupplier(supplier), "Đã cập nhật nhà cung cấp");
        }

        public async Task<ApiResponse<bool>> DeleteAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<bool>.Fail("Mã nhà cung cấp không hợp lệ");
            }

            var supplier = await _supplierRepository.GetByIdAsync(id);
            if (supplier == null)
            {
                return ApiResponse<bool>.Fail("Không tìm thấy nhà cung cấp");
            }

            supplier.IsActive = false;
            supplier.UpdatedAt = DateTime.UtcNow;
            await _supplierRepository.UpdateAsync(supplier);
            return ApiResponse<bool>.Ok(true, "Đã ngừng hoạt động nhà cung cấp");
        }

        public async Task<ApiResponse<SupplierDto>> GetByUserIdAsync(int userId)
        {
            var supplier = await _supplierRepository.GetByUserIdAsync(userId);
            if (supplier == null) return ApiResponse<SupplierDto>.Fail("Không tìm thấy nhà cung cấp của tài khoản này");
            return ApiResponse<SupplierDto>.Ok(MapSupplier(supplier));
        }

        public static SupplierDto MapSupplier(Supplier supplier)
        {
            return new SupplierDto
            {
                Id = supplier.Id,
                UserId = supplier.UserId,
                Username = supplier.User?.UserName ?? string.Empty,
                CompanyName = supplier.CompanyName,
                ContactName = supplier.ContactName,
                Email = supplier.Email,
                Phone = supplier.Phone,
                Address = supplier.Address,
                CategoryId = supplier.CategoryId,
                CategoryNameVi = supplier.Category?.NameVi ?? string.Empty,
                CategoryNameEn = supplier.Category?.NameEn ?? string.Empty,
                IsActive = supplier.IsActive,
                CreatedAt = supplier.CreatedAt,
                UpdatedAt = supplier.UpdatedAt
            };
        }

        private static List<string> ValidateSupplier(CreateSupplierDto request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            if (request.UserId <= 0)
            {
                errors.Add("Vui lòng chọn tài khoản nhà cung cấp");
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                errors.Add("Vui lòng nhập tên công ty");
            }

            return errors;
        }

        private static List<string> ValidateSupplier(UpdateSupplierDto request)
        {
            var errors = new List<string>();
            if (request == null)
            {
                errors.Add("Vui lòng gửi dữ liệu yêu cầu");
                return errors;
            }

            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                errors.Add("Vui lòng nhập tên công ty");
            }

            return errors;
        }

        private static void NormalizePaging(SupplierSearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
