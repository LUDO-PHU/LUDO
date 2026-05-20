using System;

namespace BaseCore.DTO.Sales
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public int? OrderId { get; set; }
        public string OrderCode { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
