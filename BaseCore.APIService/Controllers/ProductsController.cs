using BaseCore.DTO.Response;
using BaseCore.DTO.Sales;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductsController : BaseController
    {
        private readonly IProductService _productService;
        private readonly ISupplierService _supplierService;
        private readonly IReviewService _reviewService;
        private readonly IWebHostEnvironment _environment;

        public ProductsController(
            IProductService productService,
            ISupplierService supplierService,
            IReviewService reviewService,
            IWebHostEnvironment environment)
        {
            _productService = productService;
            _supplierService = supplierService;
            _reviewService = reviewService;
            _environment = environment;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] ProductSearchRequestDto request)
        {
            return ToActionResult(await _productService.SearchAsync(request));
        }

        [HttpGet("/api/admin/products")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminProducts([FromQuery] ProductSearchRequestDto request)
        {
            return ToActionResult(await _productService.SearchAsync(request));
        }

        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] ProductSearchRequestDto request)
        {
            return ToActionResult(await _productService.SearchAsync(request));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var response = await _productService.GetByIdDtoAsync(id);
            if (response.Success && response.Data != null && User.IsInRole("User"))
            {
                var userId = GetCurrentUserId();
                if (userId.HasValue)
                {
                    var eligibility = await _reviewService.GetEligibilityAsync(userId.Value, id);
                    if (eligibility.Success && eligibility.Data != null)
                    {
                        response.Data.CanReview = eligibility.Data.CanReview;
                        response.Data.ReviewOrderId = eligibility.Data.OrderId;
                        response.Data.ReviewDisabledReason = eligibility.Data.Reason;
                    }
                }
            }

            return ToActionResult(response);
        }

        [HttpGet("{id:int}/images")]
        [AllowAnonymous]
        public async Task<IActionResult> GetImages(int id)
        {
            var response = await _productService.GetByIdDtoAsync(id);
            return response.Success && response.Data != null
                ? Ok(ApiResponse<IReadOnlyList<ProductImageDto>>.Ok(response.Data.Images))
                : ToActionResult(response);
        }

        [HttpGet("my")]
        [HttpGet("/api/supplier/products")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> GetMine([FromQuery] ProductSearchRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var supplier = await _supplierService.GetByUserIdAsync(userId.Value);
            if (!supplier.Success || supplier.Data == null) return Forbid();

            request ??= new ProductSearchRequestDto();
            request.SupplierId = supplier.Data.Id;
            request.CategoryId = supplier.Data.CategoryId;
            return ToActionResult(await _productService.SearchAsync(request));
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [Consumes("application/json")]
        public async Task<IActionResult> Create([FromBody] CreateProductDto request)
        {
            var response = await _productService.CreateAsync(request);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }
            return BadRequest(response);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateFromForm([FromForm] ProductFormDto request)
        {
            var dto = request.ToCreateDto();
            try
            {
                var urls = await SaveProductImagesAsync(request.ImageFile, request.ImageFiles, request.ImageUrl, request.ImageUrls);
                dto.ImageUrls = urls;
                dto.ImageUrl = urls.FirstOrDefault() ?? string.Empty;
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ProductDto>.Fail("KhÃ´ng thá»ƒ táº£i áº£nh sáº£n pháº©m lÃªn", ex.Message));
            }

            var response = await _productService.CreateAsync(dto);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }
            return BadRequest(response);
        }

        [HttpPost("/api/supplier/products")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> CreateForSupplier([FromForm] SupplierProductFormDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var dto = request.ToDto();
            try
            {
                var urls = await SaveProductImagesAsync(request.ImageFile, request.ImageFiles, request.ImageUrl, request.ImageUrls);
                dto.ImageUrls = urls;
                dto.ImageUrl = urls.FirstOrDefault() ?? string.Empty;
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ProductDto>.Fail("Không thể tải ảnh sản phẩm lên", ex.Message));
            }

            var response = await _productService.CreateForSupplierAsync(userId.Value, dto);
            if (response.Success)
            {
                return CreatedAtAction(nameof(GetById), new { id = response.Data!.Id }, response);
            }

            return BadRequest(response);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        [Consumes("application/json")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto request)
        {
            return ToActionResult(await _productService.UpdateAsync(id, request));
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateFromForm(int id, [FromForm] ProductFormDto request)
        {
            var dto = request.ToUpdateDto();
            try
            {
                var urls = await SaveProductImagesAsync(request.ImageFile, request.ImageFiles, request.ImageUrl, request.ImageUrls);
                dto.ImageUrls = urls;
                dto.ImageUrl = urls.FirstOrDefault() ?? string.Empty;
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ProductDto>.Fail("KhÃ´ng thá»ƒ táº£i áº£nh sáº£n pháº©m lÃªn", ex.Message));
            }

            return ToActionResult(await _productService.UpdateAsync(id, dto));
        }

        [HttpPut("/api/supplier/products/{id:int}")]
        [Authorize(Roles = "Supplier")]
        public async Task<IActionResult> UpdateForSupplier(int id, [FromForm] SupplierProductFormDto request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var dto = request.ToDto();
            try
            {
                var urls = await SaveProductImagesAsync(request.ImageFile, request.ImageFiles, request.ImageUrl, request.ImageUrls);
                dto.ImageUrls = urls;
                dto.ImageUrl = urls.FirstOrDefault() ?? string.Empty;
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<ProductDto>.Fail("Không thể tải ảnh sản phẩm lên", ex.Message));
            }

            return ToActionResult(await _productService.UpdateForSupplierAsync(userId.Value, id, dto));
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            return ToActionResult(await _productService.DeleteAsync(id));
        }

        private async Task<IReadOnlyList<string>> SaveProductImagesAsync(
            IFormFile? file,
            IReadOnlyList<IFormFile>? files,
            string? currentImageUrl,
            string? imageUrls)
        {
            var urls = SplitImageUrls(imageUrls).ToList();
            if (!string.IsNullOrWhiteSpace(currentImageUrl))
            {
                urls.Insert(0, currentImageUrl.Trim());
            }

            var uploadFiles = new List<IFormFile>();
            if (file is { Length: > 0 })
            {
                uploadFiles.Add(file);
            }

            if (files != null)
            {
                uploadFiles.AddRange(files.Where(item => item.Length > 0));
            }

            if (uploadFiles.Count == 0)
            {
                return DistinctImageUrls(urls).ToList();
            }

            var root = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(root))
            {
                root = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            }

            var uploadDir = Path.Combine(root, "uploads", "products");
            Directory.CreateDirectory(uploadDir);

            var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            foreach (var uploadFile in uploadFiles)
            {
                var extension = Path.GetExtension(uploadFile.FileName).ToLowerInvariant();
                if (!allowed.Contains(extension))
                {
                    throw new InvalidOperationException("Định dạng ảnh sản phẩm không được hỗ trợ");
                }

                var fileName = $"{Guid.NewGuid():N}{extension}";
                var fullPath = Path.Combine(uploadDir, fileName);
                await using var stream = System.IO.File.Create(fullPath);
                await uploadFile.CopyToAsync(stream);
                urls.Add($"/uploads/products/{fileName}");
            }

            return DistinctImageUrls(urls).ToList();
        }

        private static IEnumerable<string> SplitImageUrls(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                yield break;
            }

            foreach (var url in value.Split(new[] { '\r', '\n', ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var trimmed = url.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed))
                {
                    yield return trimmed;
                }
            }
        }

        private static IEnumerable<string> DistinctImageUrls(IEnumerable<string> values)
        {
            var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var value in values)
            {
                var trimmed = value?.Trim();
                if (!string.IsNullOrWhiteSpace(trimmed) && seen.Add(trimmed))
                {
                    yield return trimmed;
                }
            }
        }
    }

    public class ProductFormDto
    {
        public string? NameVi { get; set; }
        public string? NameEn { get; set; }
        public string? DescriptionVi { get; set; }
        public string? Specifications { get; set; }
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageUrls { get; set; }
        public IFormFile? ImageFile { get; set; }
        public List<IFormFile> ImageFiles { get; set; } = new();
        public int CategoryId { get; set; }
        public int? SupplierId { get; set; }
        public string? Brand { get; set; }
        public string? Color { get; set; }
        public string? Condition { get; set; }
        public string? Status { get; set; } = "Active";

        public CreateProductDto ToCreateDto()
        {
            return new CreateProductDto
            {
                NameVi = NameVi ?? string.Empty,
                NameEn = NameEn ?? string.Empty,
                DescriptionVi = DescriptionVi ?? string.Empty,
                Specifications = Specifications ?? string.Empty,
                Price = Price,
                ImportPrice = ImportPrice,
                DiscountPercent = DiscountPercent,
                ImageUrl = ImageUrl ?? string.Empty,
                ImageUrls = Array.Empty<string>(),
                CategoryId = CategoryId,
                SupplierId = SupplierId,
                Brand = Brand ?? string.Empty,
                Color = Color ?? string.Empty,
                Condition = Condition ?? string.Empty,
                Status = string.IsNullOrWhiteSpace(Status) ? "Active" : Status
            };
        }

        public UpdateProductDto ToUpdateDto()
        {
            return new UpdateProductDto
            {
                NameVi = NameVi ?? string.Empty,
                NameEn = NameEn ?? string.Empty,
                DescriptionVi = DescriptionVi ?? string.Empty,
                Specifications = Specifications ?? string.Empty,
                Price = Price,
                ImportPrice = ImportPrice,
                DiscountPercent = DiscountPercent,
                ImageUrl = ImageUrl ?? string.Empty,
                ImageUrls = Array.Empty<string>(),
                CategoryId = CategoryId,
                SupplierId = SupplierId,
                Brand = Brand ?? string.Empty,
                Color = Color ?? string.Empty,
                Condition = Condition ?? string.Empty,
                Status = string.IsNullOrWhiteSpace(Status) ? "Active" : Status
            };
        }
    }

    public class SupplierProductFormDto
    {
        public string? NameVi { get; set; }
        public string? NameEn { get; set; }
        public string? DescriptionVi { get; set; }
        public string? Specifications { get; set; }
        public decimal Price { get; set; }
        public decimal ImportPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageUrls { get; set; }
        public IFormFile? ImageFile { get; set; }
        public List<IFormFile> ImageFiles { get; set; } = new();
        public string? Brand { get; set; }
        public string? Color { get; set; }
        public string? Condition { get; set; }
        public string? Status { get; set; } = "Active";

        public SupplierProductUpsertDto ToDto()
        {
            return new SupplierProductUpsertDto
            {
                NameVi = NameVi ?? string.Empty,
                NameEn = NameEn ?? string.Empty,
                DescriptionVi = DescriptionVi ?? string.Empty,
                Specifications = Specifications ?? string.Empty,
                Price = Price,
                ImportPrice = ImportPrice,
                DiscountPercent = DiscountPercent,
                ImageUrl = ImageUrl ?? string.Empty,
                ImageUrls = Array.Empty<string>(),
                Brand = Brand ?? string.Empty,
                Color = Color ?? string.Empty,
                Condition = Condition ?? string.Empty,
                Status = string.IsNullOrWhiteSpace(Status) ? "Active" : Status
            };
        }
    }
}
