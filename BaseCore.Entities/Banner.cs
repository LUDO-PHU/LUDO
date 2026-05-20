using System;

namespace BaseCore.Entities
{
    public class Banner
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty; // Tên quảng cáo
        public string ImageUrl { get; set; } = string.Empty; // Đường dẫn ảnh (ví dụ: /BANNER_TOP/1.jpg)
        public string TargetUrl { get; set; } = string.Empty; // Link khi bấm vào ảnh
        public string Position { get; set; } = "Top"; // Vị trí: "Top", "Left", "Right"
        public bool IsActive { get; set; } = true; // Trạng thái hiển thị
    }
}
