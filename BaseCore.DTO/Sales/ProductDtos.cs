namespace BaseCore.DTO.Sales
{
    public class ProductImageDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string AltText { get; set; } = string.Empty;
        public bool IsPrimary { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ProductDto
    {
        public int Id { get; set; }
        public string NameVi { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string DescriptionVi { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public int Stock { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string MainImage { get; set; } = string.Empty;
        public IReadOnlyList<ProductImageDto> Images { get; set; } = Array.Empty<ProductImageDto>();
        public int CategoryId { get; set; }
        public string CategoryNameVi { get; set; } = string.Empty;
        public string CategoryNameEn { get; set; } = string.Empty;
        public string Brand { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public double AverageRating { get; set; }
        public int ReviewCount { get; set; }
    }

    public class CreateProductDto
    {
        public string NameVi { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string DescriptionVi { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public IReadOnlyList<string> ImageUrls { get; set; } = Array.Empty<string>();
        public int CategoryId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public int? SupplierId { get; set; }
    }

    public class UpdateProductDto
    {
        public string NameVi { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string DescriptionVi { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public IReadOnlyList<string> ImageUrls { get; set; } = Array.Empty<string>();
        public int CategoryId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public int? SupplierId { get; set; }
    }

    public class ProductSearchRequestDto
    {
        public string? Keyword { get; set; }
        public int? CategoryId { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? SupplierId { get; set; }
        public string? Brand { get; set; }
        public string? Color { get; set; }
        public string? Condition { get; set; }
        public string? Status { get; set; }
        public string? SortBy { get; set; }
        public string? SortDir { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class SupplierProductUpsertDto
    {
        public string NameVi { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string DescriptionVi { get; set; } = string.Empty;
        public string DescriptionEn { get; set; } = string.Empty;
        public string Specifications { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public IReadOnlyList<string> ImageUrls { get; set; } = Array.Empty<string>();
        public string Brand { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
    }
}
