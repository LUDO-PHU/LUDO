using System;

namespace BaseCore.DTO.Sales
{
    public class ReviewDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int? OrderId { get; set; }
        public string OrderCode { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateReviewDto
    {
        public int ProductId { get; set; }
        public int? OrderId { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

    public class ReviewEligibilityDto
    {
        public int ProductId { get; set; }
        public bool CanReview { get; set; }
        public int? OrderId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
