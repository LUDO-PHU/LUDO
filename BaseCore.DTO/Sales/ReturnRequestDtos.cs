using System;
using System.ComponentModel.DataAnnotations;

namespace BaseCore.DTO.Sales
{
    public class CreateReturnRequestDto
    {
        [Required(ErrorMessage = "Mã đơn hàng là bắt buộc")]
        public int OrderId { get; set; }

        [Required(ErrorMessage = "Loại yêu cầu là bắt buộc")]
        public int Type { get; set; } // 0 = Return (Trả hàng), 1 = Exchange (Đổi hàng)

        [Required(ErrorMessage = "Vui lòng nhập lý do đổi trả")]
        [MinLength(5, ErrorMessage = "Lý do phải có ít nhất 5 ký tự")]
        public string Reason { get; set; } = string.Empty;

        public string ImageUrl { get; set; } = string.Empty;
    }

    public class ProcessReturnRequestDto
    {
        [Required(ErrorMessage = "Vui lòng nhập phản hồi gửi cho khách hàng")]
        public string AdminComment { get; set; } = string.Empty;
    }

    public class ReturnRequestDto
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string OrderCode { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public int Type { get; set; } // 0 = Return, 1 = Exchange
        public string Reason { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public int Status { get; set; } // 0 = Pending, 1 = Approved, 2 = Rejected
        public string AdminComment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
