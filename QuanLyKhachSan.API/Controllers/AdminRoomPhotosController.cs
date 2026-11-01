
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/room-photos")]
public class AdminRoomPhotosController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IWebHostEnvironment _environment;

    public AdminRoomPhotosController(
        HotelDbContext db,
        IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var result = await (
            from room in _db.Set<Phong>()
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby room.Tang, room.SoPhong
            select new
            {
                id = room.MaPhong,
                number = room.SoPhong,
                floor = room.Tang,
                type = type.TenLoaiPhong
            }
        ).AsNoTracking().ToListAsync();

        return Ok(result);
    }

    [HttpGet("{roomId:int}")]
    public async Task<IActionResult> GetPhotos(int roomId)
    {
        var result = await _db.Set<HinhAnhChiTietPhong>()
            .AsNoTracking()
            .Where(x => x.MaPhong == roomId)
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.ThuTuHienThi)
            .ThenBy(x => x.MaHinhAnh)
            .Select(x => new
            {
                id = x.MaHinhAnh,
                path = x.DuongDan,
                description = x.MoTa ?? "",
                isCover = x.AnhDaiDien,
                order = x.ThuTuHienThi
            })
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost("{roomId:int}")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> Upload(
        int roomId,
        [FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count is < 1 or > 10)
            return BadRequest(new
            {
                message = "Chọn từ 1 đến 10 ảnh."
            });

        foreach (var file in files)
        {
            if (file.Length is < 12 or > 5242880 ||
                !await IsValidImage(file))
                return BadRequest(new
                {
                    message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 5 MB."
                });
        }

        bool roomExists = await _db.Set<Phong>()
            .AnyAsync(x => x.MaPhong == roomId);

        if (!roomExists)
            return NotFound(new { message = "Phòng không tồn tại." });

        var root = _environment.WebRootPath
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

        var folder = Path.Combine(root, "uploads", "rooms");
        Directory.CreateDirectory(folder);

        var savedFiles = new List<string>();

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            var existing = await _db.Set<HinhAnhChiTietPhong>()
                .Where(x => x.MaPhong == roomId)
                .ToListAsync();

            bool hasCover = existing.Any(x => x.AnhDaiDien);

            int nextOrder = existing.Count == 0
                ? 0
                : existing.Max(x => x.ThuTuHienThi) + 1;

            foreach (var file in files)
            {
                string extension = Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

                string filename = $"{Guid.NewGuid():N}{extension}";
                string fullPath = Path.Combine(folder, filename);
                string webPath = $"/uploads/rooms/{filename}";

                await using (var stream = new FileStream(
                    fullPath,
                    FileMode.CreateNew))
                {
                    savedFiles.Add(fullPath);
                    await file.CopyToAsync(stream);
                }

                var image = new HinhAnhChiTietPhong
                {
                    MaPhong = roomId,
                    DuongDan = webPath,
                    MoTa = null,
                    AnhDaiDien = !hasCover,
                    ThuTuHienThi = nextOrder++
                };

                _db.Set<HinhAnhChiTietPhong>().Add(image);
                hasCover = true;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = $"Đã tải lên {files.Count} ảnh thành công."
            });
        }
        catch
        {
            await transaction.RollbackAsync();

            foreach (var path in savedFiles)
            {
                try
                {
                    if (System.IO.File.Exists(path))
                        System.IO.File.Delete(path);
                }
                catch (IOException)
                {
                }
            }

            return StatusCode(500, new
            {
                message = "Không thể lưu ảnh. Vui lòng kiểm tra lại."
            });
        }
    }

    [HttpPut("{roomId:int}/{photoId:int}/cover")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SetCover(
        int roomId,
        int photoId)
    {
        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        bool exists = await _db.Set<HinhAnhChiTietPhong>()
            .AnyAsync(x =>
                x.MaPhong == roomId &&
                x.MaHinhAnh == photoId);

        if (!exists)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        await _db.Set<HinhAnhChiTietPhong>()
            .Where(x => x.MaPhong == roomId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(
                    x => x.AnhDaiDien,
                    x => x.MaHinhAnh == photoId));

        await transaction.CommitAsync();

        return Ok(new
        {
            message = "Đã thay đổi ảnh đại diện."
        });
    }

    [HttpDelete("{roomId:int}/{photoId:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(
        int roomId,
        int photoId)
    {
        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var image = await _db.Set<HinhAnhChiTietPhong>()
            .FirstOrDefaultAsync(x =>
                x.MaPhong == roomId &&
                x.MaHinhAnh == photoId);

        if (image == null)
            return NotFound(new { message = "Ảnh không tồn tại." });

        string path = image.DuongDan;
        bool wasCover = image.AnhDaiDien;

        _db.Set<HinhAnhChiTietPhong>().Remove(image);
        await _db.SaveChangesAsync();

        if (wasCover)
        {
            var nextImage = await _db.Set<HinhAnhChiTietPhong>()
                .Where(x => x.MaPhong == roomId)
                .OrderBy(x => x.ThuTuHienThi)
                .ThenBy(x => x.MaHinhAnh)
                .FirstOrDefaultAsync();

            if (nextImage != null)
            {
                nextImage.AnhDaiDien = true;
                await _db.SaveChangesAsync();
            }
        }

        await transaction.CommitAsync();

        if (path.StartsWith("/uploads/rooms/", StringComparison.Ordinal))
        {
            string filename = Path.GetFileName(path);

            var root = _environment.WebRootPath
                ?? Path.Combine(
                    _environment.ContentRootPath,
                    "wwwroot");

            string fullPath = Path.Combine(
                root,
                "uploads",
                "rooms",
                filename);

            try
            {
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }

        return Ok(new
        {
            message = "Đã xóa ảnh thành công."
        });
    }

    private static async Task<bool> IsValidImage(IFormFile file)
    {
        string extension = Path.GetExtension(file.FileName)
            .ToLowerInvariant();

        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return false;

        var bytes = new byte[12];

        await using var stream = file.OpenReadStream();

        if (await stream.ReadAsync(bytes) < 12)
            return false;

        if (extension is ".jpg" or ".jpeg")
            return bytes[0] == 0xFF &&
                   bytes[1] == 0xD8 &&
                   bytes[2] == 0xFF;

        if (extension == ".png")
            return bytes.AsSpan(0, 8).SequenceEqual(
                new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });

        return System.Text.Encoding.ASCII.GetString(bytes, 0, 4)
                   == "RIFF" &&
               System.Text.Encoding.ASCII.GetString(bytes, 8, 4)
                   == "WEBP";
    }
}
