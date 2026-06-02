using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System.Globalization;
using System.Text;

namespace BaseCore.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepositoryEF _categoryRepository;

        public CategoryService(ICategoryRepositoryEF categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<ApiResponse<PagedResult<CategoryDto>>> SearchAsync(CategorySearchRequestDto request)
        {
            request ??= new CategorySearchRequestDto();
            NormalizePaging(request);

            var (categories, totalCount) = await _categoryRepository.SearchAsync(
                request.Keyword,
                request.IsActive,
                request.SortBy,
                request.Page,
                request.PageSize);

            var items = new List<CategoryDto>();
            foreach (var category in categories)
            {
                items.Add(await MapCategoryAsync(category));
            }

            return ApiResponse<PagedResult<CategoryDto>>.Ok(new PagedResult<CategoryDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            });
        }

        public async Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetAllDtosAsync()
        {
            var categories = await _categoryRepository.GetAllAsync();
            var items = new List<CategoryDto>();
            foreach (var category in categories)
            {
                items.Add(await MapCategoryAsync(category));
            }

            return ApiResponse<IReadOnlyList<CategoryDto>>.Ok(items);
        }

        public async Task<ApiResponse<CategoryDto>> GetByIdDtoAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<CategoryDto>.Fail("Mã danh mục không hợp lệ");
            }

            var category = await _categoryRepository.GetByIdAsync(id);
            return category == null
                ? ApiResponse<CategoryDto>.Fail("Không tìm thấy danh mục")
                : ApiResponse<CategoryDto>.Ok(await MapCategoryAsync(category));
        }

        public async Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryDto request)
        {
            var errors = ValidateCategory(request?.NameVi, request?.NameEn);
            if (errors.Count > 0)
            {
                return ApiResponse<CategoryDto>.Fail("Dữ liệu danh mục không hợp lệ", errors.ToArray());
            }

            if (await _categoryRepository.ExistsByNameAsync(request!.NameVi, request.NameEn))
            {
                return ApiResponse<CategoryDto>.Fail("Tên danh mục đã tồn tại");
            }

            var category = new Category
            {
                NameVi = request.NameVi.Trim(),
                NameEn = request.NameEn.Trim(),
                Description = request.Description?.Trim() ?? string.Empty,
                IsActive = request.IsActive
            };

            await _categoryRepository.AddAsync(category);
            return ApiResponse<CategoryDto>.Ok(await MapCategoryAsync(category), "Đã tạo danh mục");
        }

        public async Task<ApiResponse<CategoryDto>> UpdateAsync(int id, UpdateCategoryDto request)
        {
            if (id <= 0)
            {
                return ApiResponse<CategoryDto>.Fail("Mã danh mục không hợp lệ");
            }

            var errors = ValidateCategory(request?.NameVi, request?.NameEn);
            if (errors.Count > 0)
            {
                return ApiResponse<CategoryDto>.Fail("Dữ liệu danh mục không hợp lệ", errors.ToArray());
            }

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
            {
                return ApiResponse<CategoryDto>.Fail("Không tìm thấy danh mục");
            }

            if (await _categoryRepository.ExistsByNameAsync(request!.NameVi, request.NameEn, id))
            {
                return ApiResponse<CategoryDto>.Fail("Tên danh mục đã tồn tại");
            }

            category.NameVi = request.NameVi.Trim();
            category.NameEn = request.NameEn.Trim();
            category.Description = request.Description?.Trim() ?? string.Empty;
            category.IsActive = request.IsActive;

            await _categoryRepository.UpdateAsync(category);
            return ApiResponse<CategoryDto>.Ok(await MapCategoryAsync(category), "Đã cập nhật danh mục");
        }

        public async Task<ApiResponse<bool>> DeleteDtoAsync(int id)
        {
            if (id <= 0)
            {
                return ApiResponse<bool>.Fail("Mã danh mục không hợp lệ");
            }

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
            {
                return ApiResponse<bool>.Fail("Không tìm thấy danh mục");
            }

            if (await _categoryRepository.HasProductsAsync(id))
            {
                return ApiResponse<bool>.Fail("Không thể xóa danh mục vì đang có sản phẩm");
            }

            await _categoryRepository.DeleteAsync(category);
            return ApiResponse<bool>.Ok(true, "Đã xóa danh mục");
        }

        public async Task<List<Category>> GetAllAsync()
        {
            return (await _categoryRepository.GetAllAsync()).ToList();
        }

        public async Task<Category?> GetByIdAsync(int id)
        {
            return await _categoryRepository.GetByIdAsync(id);
        }

        public async Task<Category> CreateAsync(Category category)
        {
            await _categoryRepository.AddAsync(category);
            return category;
        }

        public async Task UpdateAsync(Category category)
        {
            await _categoryRepository.UpdateAsync(category);
        }

        public async Task DeleteAsync(int id)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category != null)
            {
                await _categoryRepository.DeleteAsync(category);
            }
        }

        private async Task<CategoryDto> MapCategoryAsync(Category category)
        {
            return new CategoryDto
            {
                Id = category.Id,
                NameVi = category.NameVi,
                NameEn = category.NameEn,
                Description = category.Description,
                IconClass = ResolveIconClass(category),
                IsActive = category.IsActive,
                ProductCount = await _categoryRepository.CountProductsAsync(category.Id)
            };
        }

        private static string ResolveIconClass(Category category)
        {
            var source = NormalizeIconText($"{category.NameVi} {category.NameEn} {category.Description}");

            if (ContainsAny(source, "man hinh", "screen", "display", "lcd", "oled"))
                return "fa fa-mobile-screen";

            if (ContainsAny(source, "pin", "battery"))
                return "fa fa-battery-full";

            if (ContainsAny(source, "camera", "cum camera", "camera module"))
                return "fa fa-camera";

            if (ContainsAny(source, "loa", "chuong", "speaker", "ringer", "sound"))
                return "fa fa-volume-high";

            if (ContainsAny(source, "vo", "suon", "khung", "nap lung", "housing", "case", "frame", "cover"))
                return "fa fa-mobile";

            if (ContainsAny(source, "sac", "chan sac", "cap", "cable", "charger", "charging", "usb"))
                return "fa fa-plug";

            if (ContainsAny(source, "mic", "micro", "microphone"))
                return "fa fa-microphone";

            if (ContainsAny(source, "cam ung", "touch", "touchscreen", "digitizer"))
                return "fa fa-hand-pointer";

            if (ContainsAny(source, "kinh", "cuong luc", "glass", "tempered", "protector"))
                return "fa fa-shield-halved";

            if (ContainsAny(source, "ic", "chip", "main", "mainboard", "board", "linh kien main", "component"))
                return "fa fa-microchip";

            if (ContainsAny(source, "sim"))
                return "fa fa-sim-card";

            if (ContainsAny(source, "tai nghe", "headphone", "earphone"))
                return "fa fa-headphones";

            if (ContainsAny(source, "nut", "phim", "button", "key"))
                return "fa fa-toggle-on";

            if (ContainsAny(source, "tool", "sua chua", "repair", "dung cu", "phu kien"))
                return "fa fa-screwdriver-wrench";

            return "fa fa-tag";
        }

        private static bool ContainsAny(string source, params string[] keywords)
        {
            return keywords.Any(source.Contains);
        }

        private static string NormalizeIconText(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                return string.Empty;

            var normalized = value.Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character);
                if (unicodeCategory == UnicodeCategory.NonSpacingMark)
                    continue;

                builder.Append(character switch
                {
                    'đ' or 'Đ' => 'd',
                    _ => char.ToLowerInvariant(character)
                });
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static List<string> ValidateCategory(string? nameVi, string? nameEn)
        {
            var errors = new List<string>();
            if (string.IsNullOrWhiteSpace(nameVi))
            {
                errors.Add("Vui lòng nhập tên danh mục tiếng Việt");
            }

            if (string.IsNullOrWhiteSpace(nameEn))
            {
                errors.Add("Vui lòng nhập tên danh mục tiếng Anh");
            }

            return errors;
        }

        private static void NormalizePaging(CategorySearchRequestDto request)
        {
            request.Page = request.Page <= 0 ? 1 : request.Page;
            request.PageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);
        }
    }
}
