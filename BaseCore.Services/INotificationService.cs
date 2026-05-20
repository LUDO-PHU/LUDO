using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface INotificationService
    {
        Task<ApiResponse<List<NotificationDto>>> GetMyNotificationsAsync(int userId);
        Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId, int userId);
        Task<ApiResponse<bool>> MarkAllAsReadAsync(int userId);
        Task CreateSystemNotificationAsync(int userId, string title, string message, string? url = null);
    }
}
