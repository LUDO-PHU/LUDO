using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace BaseCore.Repository.EFCore
{
    public interface IUserRepositoryEF : IRepository<User>
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<bool> ExistsByUsernameAsync(string username, int? excludeId = null);
        Task<(List<User> Users, int TotalCount)> SearchAsync(
            string? keyword,
            Role? role,
            bool? isActive,
            int page,
            int pageSize);
    }

    public class UserRepositoryEF : Repository<User>, IUserRepositoryEF
    {
        public UserRepositoryEF(BaseCoreSalesContext context) : base(context)
        {
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            var value = username.Trim().ToLower();
            return await _dbSet.FirstOrDefaultAsync(u => u.UserName.ToLower() == value);
        }

        public async Task<bool> ExistsByUsernameAsync(string username, int? excludeId = null)
        {
            var value = username.Trim().ToLower();
            return await _dbSet.AnyAsync(u =>
                (!excludeId.HasValue || u.Id != excludeId.Value) &&
                u.UserName.ToLower() == value);
        }

        public async Task<(List<User> Users, int TotalCount)> SearchAsync(
            string? keyword,
            Role? role,
            bool? isActive,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Where(u => u.UserName.ToLower() != "supplier")
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var kw = keyword.Trim().ToLower();
                var roleFromKeyword = MatchRoleKeyword(kw);
                query = query.Where(u =>
                    u.UserName.ToLower().Contains(kw) ||
                    u.FullName.ToLower().Contains(kw) ||
                    u.Email.ToLower().Contains(kw) ||
                    u.Phone.ToLower().Contains(kw) ||
                    (roleFromKeyword.HasValue && u.Role == roleFromKeyword.Value));
            }

            if (role.HasValue)
            {
                query = query.Where(u => u.Role == role.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(u => u.IsActive == isActive.Value);
            }

            var totalCount = await query.CountAsync();
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (users, totalCount);
        }

        private static Role? MatchRoleKeyword(string keyword)
        {
            var normalized = RemoveDiacritics(keyword).Trim().ToLowerInvariant();

            if (normalized is "admin" or "administrator" or "quan tri" or "quan tri vien" or "qtv")
            {
                return Role.Admin;
            }

            if (normalized is "user" or "customer" or "khach" or "khach hang" or "nguoi dung")
            {
                return Role.User;
            }

            if (normalized is "supplier" or "nha cung cap" or "ncc")
            {
                return Role.Supplier;
            }

            return null;
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
    }
}
