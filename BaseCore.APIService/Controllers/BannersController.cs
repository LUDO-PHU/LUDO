using Microsoft.AspNetCore.Mvc;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BannersController : ControllerBase
    {
        private static readonly HashSet<string> SupportedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
        };

        private readonly IWebHostEnvironment _environment;

        public BannersController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpGet]
        public IActionResult GetActiveBanners([FromQuery] string? position)
        {
            var webRoot = _environment.WebRootPath;
            var bannerDirectory = string.IsNullOrWhiteSpace(webRoot)
                ? string.Empty
                : Path.Combine(webRoot, "images", "banner");

            if (string.IsNullOrWhiteSpace(bannerDirectory) || !Directory.Exists(bannerDirectory))
            {
                return Ok(Array.Empty<object>());
            }

            var banners = Directory.EnumerateFiles(bannerDirectory)
                .Select(file => new
                {
                    FileName = Path.GetFileName(file),
                    Extension = Path.GetExtension(file),
                    Number = GetBannerNumber(file)
                })
                .Where(file => file.Number.HasValue && SupportedExtensions.Contains(file.Extension))
                .OrderBy(file => file.Number!.Value)
                .ThenBy(file => file.FileName)
                .Select((file, index) => new
                {
                    id = index + 1,
                    title = Path.GetFileNameWithoutExtension(file.FileName),
                    imageUrl = $"/images/banner/{file.FileName}",
                    position = "Top",
                    isActive = true
                })
                .ToList();

            return Ok(banners);
        }

        private static int? GetBannerNumber(string path)
        {
            var name = Path.GetFileNameWithoutExtension(path);
            if (string.IsNullOrWhiteSpace(name) || name.Length < 2 || !name.StartsWith("B", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return int.TryParse(name[1..], out var number) ? number : null;
        }
    }
}
