using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    [Authorize]
    public class NotificationsController : BaseController
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        [HttpGet("/api/supplier/notifications")]
        public async Task<IActionResult> GetMyNotifications()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _notificationService.GetMyNotificationsAsync(userId.Value));
        }

        [HttpPatch("{id:int}/read")]
        [HttpPut("{id:int}/read")]
        [HttpPut("/api/supplier/notifications/{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _notificationService.MarkAsReadAsync(id, userId.Value));
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            return ToActionResult(await _notificationService.MarkAllAsReadAsync(userId.Value));
        }
    }
}
