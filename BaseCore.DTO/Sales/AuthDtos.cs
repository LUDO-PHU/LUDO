namespace BaseCore.DTO.Sales
{
    public class LoginRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class RegisterRequestDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public string CompanyName { get; set; } = string.Empty;
    }

    public class AuthUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int UserType { get; set; }
        public bool IsActive { get; set; }
        public int? SupplierId { get; set; }
        public string? CompanyName { get; set; }
        public int? SupplierCategoryId { get; set; }
        public string? SupplierCategoryName { get; set; }
        public string MemberTier { get; set; } = "Đồng";
        public decimal TotalSpent { get; set; }
    }

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public AuthUserDto User { get; set; } = new();
    }
}
