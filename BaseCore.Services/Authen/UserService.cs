using BaseCore.Entities;
using BaseCore.Repository.Authen;

namespace BaseCore.Services.Authen
{
    public interface IUserService
    {
        Task<User?> Authenticate(string username, string password);
        Task<List<User>> GetAll();
        Task<User?> GetById(string id);
        Task<User> Create(User user, string password);
        Task Update(User user, string? password = null);
        Task Delete(string id);
        Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize);
    }

    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<User?> Authenticate(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                return null;
            }

            var user = await _userRepository.GetByUsernameAsync(username);
            if (user == null || !user.IsActive)
            {
                return null;
            }

            return PasswordHasher.Verify(password, user.PasswordHash) ? user : null;
        }

        public async Task<List<User>> GetAll()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<User?> GetById(string id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<User> Create(User user, string password)
        {
            user.PasswordHash = PasswordHasher.Hash(password);
            user.CreatedAt = DateTime.UtcNow;
            user.IsActive = true;

            await _userRepository.CreateAsync(user);
            return user;
        }

        public async Task Update(User user, string? password = null)
        {
            if (!string.IsNullOrWhiteSpace(password))
            {
                user.PasswordHash = PasswordHasher.Hash(password);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);
        }

        public async Task Delete(string id)
        {
            await _userRepository.DeleteAsync(id);
        }

        public async Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize)
        {
            return await _userRepository.SearchAsync(keyword, page, pageSize);
        }
    }
}
