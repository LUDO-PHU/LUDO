using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/users")]
    [ApiController]
    public class UsersController : BaseController
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _userService.UpdateProfileAsync(userId.Value, request));
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] UserSearchRequestDto request)
        {
            return ToActionResult(await _userService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            return ToActionResult(await _userService.GetByIdAsync(id));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto request)
        {
            return ToActionResult(await _userService.UpdateAsync(id, request));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            return ToActionResult(await _userService.DeleteAsync(id));
        }

        [HttpPatch("{id:int}/toggle-active")]
        [HttpPut("{id:int}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user.Data == null) return NotFound(user);

            var request = new UpdateUserDto
            {
                FullName = user.Data.FullName,
                Email = user.Data.Email,
                Phone = user.Data.Phone,
                IsActive = !user.Data.IsActive,
                Role = user.Data.Role
            };

            return ToActionResult(await _userService.UpdateAsync(id, request));
        }
    }
}
