using BaseCore.DTO.Response;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    public abstract class BaseController : ControllerBase
    {
        protected int? GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        protected IActionResult ToActionResult<T>(ApiResponse<T> response)
        {
            if (response.Success)
            {
                return Ok(response);
            }

            if (IsNotFoundMessage(response.Message))
            {
                return NotFound(response);
            }

            return BadRequest(response);
        }

        private static bool IsNotFoundMessage(string? message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return false;
            }

            return message.Contains("not found", StringComparison.OrdinalIgnoreCase) ||
                   message.Contains("không tìm thấy", StringComparison.OrdinalIgnoreCase) ||
                   message.Contains("khong tim thay", StringComparison.OrdinalIgnoreCase);
        }
    }
}
