namespace BaseCore.DTO.Sales
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int UserType { get; set; }
        public bool IsActive { get; set; }
        public decimal TotalSpent { get; set; }
        public int OrderCount { get; set; }
        public string MemberTier { get; set; } = "Đồng";
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateUserDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public int? UserType { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateUserDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = "User";
        public int? UserType { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Password { get; set; }
    }

    public class UserSearchRequestDto
    {
        public string? Keyword { get; set; }
        public string? Role { get; set; }
        public int? UserType { get; set; }
        public bool? IsActive { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class UpdateProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? OldPassword { get; set; }
        public string? NewPassword { get; set; }
    }
}
