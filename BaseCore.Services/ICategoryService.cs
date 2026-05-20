using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;

namespace BaseCore.Services
{
    public interface ICategoryService
    {
        Task<ApiResponse<PagedResult<CategoryDto>>> SearchAsync(CategorySearchRequestDto request);
        Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetAllDtosAsync();
        Task<ApiResponse<CategoryDto>> GetByIdDtoAsync(int id);
        Task<ApiResponse<CategoryDto>> CreateAsync(CreateCategoryDto request);
        Task<ApiResponse<CategoryDto>> UpdateAsync(int id, UpdateCategoryDto request);
        Task<ApiResponse<bool>> DeleteDtoAsync(int id);

        Task<List<Category>> GetAllAsync();
        Task<Category?> GetByIdAsync(int id);
        Task<Category> CreateAsync(Category category);
        Task UpdateAsync(Category category);
        Task DeleteAsync(int id);
    }
}
