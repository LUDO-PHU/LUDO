using System;

namespace BaseCore.Entities
{
    public class RevenueTransaction
    {
        public int Id { get; set; }
        public string OwnerType { get; set; } = string.Empty;
        public int? OwnerId { get; set; }
        public decimal Amount { get; set; }
        public string TransactionType { get; set; } = string.Empty;
        public string ReferenceType { get; set; } = string.Empty;
        public int ReferenceId { get; set; }
        public string Note { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
