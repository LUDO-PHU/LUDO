using System;

namespace BaseCore.Entities
{
    public enum ReturnRequestType
    {
        Return = 0,        
        Exchange = 1        
    }

    public enum ReturnRequestStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    public class ReturnRequest
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; } = null!;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public ReturnRequestType Type { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public ReturnRequestStatus Status { get; set; } = ReturnRequestStatus.Pending;
        public string AdminComment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }
    }
}
