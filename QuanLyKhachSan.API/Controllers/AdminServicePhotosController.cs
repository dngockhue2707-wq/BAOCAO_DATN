using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/service-photos")]
public class AdminServicePhotosController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly IAntiforgery _antiforgery;

    public AdminServicePhotosController(
        HotelDbContext db,
        IWebHostEnvironment environment,
        IAntiforgery antiforgery)
    {
        _db = db;
        _environment = environment;
        _antiforgery = antiforgery;
    }

    private async Task<bool> ValidCsrf()
    {
        try
        {
            await _antiforgery.ValidateRequestAsync(HttpContext);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetPhoto(int id)
    {
        var service = await _db.Set<DichVu>()
            .AsNoTracking()
            .Where(x => x.MaDichVu == id)
            .Select(x => new
            {
                id = x.MaDichVu,
                image = x.HinhAnh
            })
            .FirstOrDefaultAsync();

        if (service == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy dịch vụ."
            });
        }

        return Ok(service);
    }

    [HttpPost("{id:int}")]
    [RequestSizeLimit(5242880)]
    public async Task<IActionResult> Upload(
        int id,
        [FromForm] IFormFile? file)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (file == null || file.Length < 12 ||
            file.Length > 5242880)
        {
            return BadRequest(new
            {
                message = "Vui lòng chọn ảnh hợp lệ, tối đa 5 MB."
            });
        }

        if (!await IsValidImage(file))
        {
            return BadRequest(new
            {
                message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ."
            });
        }

        var service = await _db.Set<DichVu>()
            .FirstOrDefaultAsync(x => x.MaDichVu == id);

        if (service == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy dịch vụ."
            });
        }

        string extension = Path.GetExtension(file.FileName)
            .ToLowerInvariant();

        string root = _environment.WebRootPath
            ?? Path.Combine(
                _environment.ContentRootPath,
                "wwwroot");

        string folder = Path.Combine(
            root,
            "uploads",
            "services");

        Directory.CreateDirectory(folder);

        string fileName = $"{Guid.NewGuid():N}{extension}";
        string fullPath = Path.Combine(folder, fileName);
        string webPath = $"/uploads/services/{fileName}";

        string? oldPath = service.HinhAnh;

        try
        {
            await using (var stream = new FileStream(
                fullPath,
                FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            service.HinhAnh = webPath;

            await _db.SaveChangesAsync();
        }
        catch
        {
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }

            throw;
        }

        DeletePhysicalImage(oldPath);

        return Ok(new
        {
            success = true,
            image = webPath,
            message = "Đã tải ảnh dịch vụ thành công."
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePhoto(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        var service = await _db.Set<DichVu>()
            .FirstOrDefaultAsync(x => x.MaDichVu == id);

        if (service == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy dịch vụ."
            });
        }

        string? oldPath = service.HinhAnh;

        if (string.IsNullOrWhiteSpace(oldPath))
        {
            return BadRequest(new
            {
                message = "Dịch vụ chưa có hình ảnh."
            });
        }

        service.HinhAnh = null;

        await _db.SaveChangesAsync();

        DeletePhysicalImage(oldPath);

        return Ok(new
        {
            success = true,
            message = "Đã xóa ảnh dịch vụ."
        });
    }

    private void DeletePhysicalImage(string? webPath)
    {
        if (string.IsNullOrWhiteSpace(webPath) ||
            !webPath.StartsWith(
                "/uploads/services/",
                StringComparison.Ordinal))
        {
            return;
        }

        string fileName = Path.GetFileName(webPath);

        if (string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        string root = _environment.WebRootPath
            ?? Path.Combine(
                _environment.ContentRootPath,
                "wwwroot");

        string fullPath = Path.Combine(
            root,
            "uploads",
            "services",
            fileName);

        try
        {
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    private static async Task<bool> IsValidImage(IFormFile file)
    {
        string extension = Path.GetExtension(file.FileName)
            .ToLowerInvariant();

        if (extension is not (
            ".jpg" or ".jpeg" or ".png" or ".webp"))
        {
            return false;
        }

        var bytes = new byte[12];

        await using var stream = file.OpenReadStream();

        int read = await stream.ReadAsync(bytes.AsMemory());

        if (read < 12)
        {
            return false;
        }

        if (extension is ".jpg" or ".jpeg")
        {
            return bytes[0] == 0xFF &&
                   bytes[1] == 0xD8 &&
                   bytes[2] == 0xFF;
        }

        if (extension == ".png")
        {
            return bytes.AsSpan(0, 8).SequenceEqual(
                new byte[]
                {
                    137, 80, 78, 71, 13, 10, 26, 10
                });
        }

        return System.Text.Encoding.ASCII.GetString(
                   bytes, 0, 4) == "RIFF" &&
               System.Text.Encoding.ASCII.GetString(
                   bytes, 8, 4) == "WEBP";
    }
}