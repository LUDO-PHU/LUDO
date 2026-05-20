using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly BaseCore.Services.IUserService _userService;

        public UserController(BaseCore.Services.IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Search(
            [FromQuery] string? keyword,
            [FromQuery] string? role,
            [FromQuery] int? userType,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var request = new UserSearchRequestDto
            {
                Keyword = keyword,
                Role = role ?? (userType.HasValue ? UserService.FromUserType(userType.Value).ToString() : null),
                IsActive = isActive,
                Page = page,
                PageSize = pageSize
            };

            return ToActionResult(await _userService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!User.IsInRole("Admin") && GetCurrentUserId() != id)
            {
                return Forbid();
            }

            return ToActionResult(await _userService.GetByIdAsync(id));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserDto request)
        {
            NormalizeCreateRequest(request);
            var response = await _userService.CreateAsync(request);
            return response.Success ? CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response) : BadRequest(response);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto request)
        {
            NormalizeUpdateRequest(request);
            return ToActionResult(await _userService.UpdateAsync(id, request));
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserDto request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
            {
                return Unauthorized();
            }

            NormalizeUpdateRequest(request);
            var existing = await _userService.GetByIdAsync(currentUserId.Value);
            if (!existing.Success || existing.Data == null)
            {
                return ToActionResult(existing);
            }

            request.Role = existing.Data.Role;
            request.IsActive = existing.Data.IsActive;
            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                request.FullName = existing.Data.FullName;
            }

            return ToActionResult(await _userService.UpdateAsync(currentUserId.Value, request));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            return ToActionResult(await _userService.DeleteAsync(id));
        }

        private int? GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        private static IActionResult ToActionResult<T>(ApiResponse<T> response)
        {
            if (response.Success)
            {
                return new OkObjectResult(response);
            }

            return response.Message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                ? new NotFoundObjectResult(response)
                : new BadRequestObjectResult(response);
        }

        private static void NormalizeCreateRequest(CreateUserDto request)
        {
            if (request == null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(request.FullName) && !string.IsNullOrWhiteSpace(request.Name))
            {
                request.FullName = request.Name;
            }

            if (request.UserType.HasValue)
            {
                request.Role = UserService.FromUserType(request.UserType.Value).ToString();
            }
        }

        private static void NormalizeUpdateRequest(UpdateUserDto request)
        {
            if (request == null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(request.FullName) && !string.IsNullOrWhiteSpace(request.Name))
            {
                request.FullName = request.Name;
            }

            if (request.UserType.HasValue)
            {
                request.Role = UserService.FromUserType(request.UserType.Value).ToString();
            }
        }
    }
}
