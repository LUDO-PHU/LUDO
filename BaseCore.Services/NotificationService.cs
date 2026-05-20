using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IOrderRepositoryEF _orderRepository;

        public NotificationService(
            INotificationRepository notificationRepository,
            IOrderRepositoryEF orderRepository)
        {
            _notificationRepository = notificationRepository;
            _orderRepository = orderRepository;
        }

        public async Task<ApiResponse<List<NotificationDto>>> GetMyNotificationsAsync(int userId)
        {
            var notes = await _notificationRepository.GetByUserIdAsync(userId);
            var dtos = new List<NotificationDto>();
            var orderCache = new Dictionary<string, Order?>(StringComparer.OrdinalIgnoreCase);

            foreach (var note in notes)
            {
                var dto = new NotificationDto
                {
                    Id = note.Id,
                    Title = note.Title,
                    Content = note.Message,
                    Url = ResolveNotificationUrl(note),
                    IsRead = note.IsRead,
                    CreatedAt = note.CreatedAt
                };

                var orderCode = ExtractOrderCode($"{note.Title} {note.Message}");
                if (!string.IsNullOrWhiteSpace(orderCode))
                {
                    if (!orderCache.TryGetValue(orderCode, out var order))
                    {
                        order = await _orderRepository.GetByCodeWithDetailsAsync(orderCode);
                        orderCache[orderCode] = order;
                    }

                    if (order != null)
                    {
                        var firstDetail = order.OrderDetails.FirstOrDefault(detail => !string.IsNullOrWhiteSpace(detail.Product?.ImageUrl))
                            ?? order.OrderDetails.FirstOrDefault();
                        var display = BuildOrderNotificationDisplay(note, order);
                        dto.OrderId = order.Id;
                        dto.OrderCode = order.OrderCode;
                        dto.Title = display.Title;
                        dto.Content = display.Content;
                        dto.Url = $"/customer/orders?orderId={order.Id}";
                        dto.ImageUrl = firstDetail?.Product?.ImageUrl ?? string.Empty;
                        dto.ProductName = firstDetail?.Product?.NameVi ?? string.Empty;
                    }
                }

                dtos.Add(dto);
            }

            return ApiResponse<List<NotificationDto>>.Ok(dtos);
        }

        public async Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId, int userId)
        {
            var note = await _notificationRepository.GetByIdAsync(notificationId);
            if (note == null || note.UserId != userId) return ApiResponse<bool>.Fail("Không tìm thấy thông báo");

            note.IsRead = true;
            await _notificationRepository.UpdateAsync(note);
            return ApiResponse<bool>.Ok(true);
        }

        public async Task<ApiResponse<bool>> MarkAllAsReadAsync(int userId)
        {
            var notes = await _notificationRepository.GetByUserIdAsync(userId);
            foreach (var note in notes.Where(n => !n.IsRead))
            {
                note.IsRead = true;
                await _notificationRepository.UpdateAsync(note);
            }
            return ApiResponse<bool>.Ok(true);
        }

        public async Task CreateSystemNotificationAsync(int userId, string title, string message, string? url = null)
        {
            var note = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                IsRead = false,
                CreatedAt = System.DateTime.UtcNow
            };
            await _notificationRepository.AddAsync(note);
        }

        private static string ResolveNotificationUrl(Notification notification)
        {
            var text = $"{notification.Title} {notification.Message}".ToLowerInvariant();
            if (text.Contains("receipt"))
            {
                return "/admin/supplier-home";
            }

            return "/customer/orders";
        }

        private static (string Title, string Content) BuildOrderNotificationDisplay(Notification notification, Order order)
        {
            var text = $"{notification.Title} {notification.Message}".ToLowerInvariant();
            var orderLabel = string.IsNullOrWhiteSpace(order.OrderCode) ? $"#{order.Id}" : $"#{order.OrderCode}";

            if (IsCancelledText(text) || IsCancelledStatus(order.Status) && !IsShippingText(text) && !IsCompletedText(text))
            {
                return ("Đơn hàng đã hủy", $"Đơn {orderLabel} đã bị hủy.");
            }

            if (IsCompletedText(text) || order.Status == OrderStatus.Completed && !IsShippingText(text))
            {
                return ("Đơn hàng đã giao", $"Đơn {orderLabel} đã giao thành công.");
            }

            if (IsShippingText(text) || IsShippingStatus(order.Status))
            {
                return ("Đơn hàng đang giao", $"Đơn {orderLabel} đang được giao.");
            }

            return (notification.Title, notification.Message);
        }

        private static bool IsCancelledText(string text)
        {
            return text.Contains("huy") ||
                   text.Contains("hủy") ||
                   text.Contains("cancel") ||
                   text.Contains("reject") ||
                   text.Contains("tu choi") ||
                   text.Contains("từ chối");
        }

        private static bool IsCompletedText(string text)
        {
            return text.Contains("hoan tat") ||
                   text.Contains("hoàn tất") ||
                   text.Contains("giao thanh cong") ||
                   text.Contains("giao thành công") ||
                   text.Contains("nhan hang") ||
                   text.Contains("nhận hàng");
        }

        private static bool IsShippingText(string text)
        {
            return text.Contains("dang giao") ||
                   text.Contains("đang giao") ||
                   text.Contains("dang duoc giao") ||
                   text.Contains("đang được giao") ||
                   text.Contains("shipping") ||
                   text.Contains("xac nhan") ||
                   text.Contains("xác nhận");
        }

        private static bool IsShippingStatus(OrderStatus status)
        {
            return status == OrderStatus.Confirmed ||
                   status == OrderStatus.Shipping ||
                   status == OrderStatus.Delivered;
        }

        private static bool IsCancelledStatus(OrderStatus status)
        {
            return status == OrderStatus.Cancelled ||
                   status == OrderStatus.CancelledByUser ||
                   status == OrderStatus.CancelledByAdmin ||
                   status == OrderStatus.Rejected;
        }

        private static string? ExtractOrderCode(string text)
        {
            var index = text.IndexOf("ORD", StringComparison.OrdinalIgnoreCase);
            if (index < 0)
            {
                return null;
            }

            var end = index;
            while (end < text.Length && char.IsLetterOrDigit(text[end]))
            {
                end++;
            }

            return text[index..end];
        }
    }
}
