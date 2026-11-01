
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/room-extras")]
public class AdminRoomExtrasController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IWebHostEnvironment _env;

    public AdminRoomExtrasController(
        HotelDbContext db,
        IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public class AmenityInput
    {
        public string Name { get; set; } = "";
        public bool Active { get; set; } = true;
    }

    [HttpPost("amenities")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddAmenity(AmenityInput request)
    {
        string name = request.Name?.Trim() ?? "";

        if (name.Length is < 1 or > 100)
            return BadRequest(new
            {
                message = "Tên tiện nghi phải từ 1 đến 100 ký tự."
            });

        if (await _db.Set<TienNghi>()
            .AnyAsync(x => x.TenTienNghi == name))
            return Conflict(new { message = "Tên tiện nghi đã tồn tại." });

        _db.Set<TienNghi>().Add(new TienNghi
        {
            TenTienNghi = name,
            TrangThai = request.Active
        });

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            return Conflict(new { message = "Tên tiện nghi đã tồn tại." });
        }

        return Ok(new { message = "Đã thêm tiện nghi." });
    }

    [HttpPut("amenities/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateAmenity(
        int id,
        AmenityInput request)
    {
        string name = request.Name?.Trim() ?? "";

        if (name.Length is < 1 or > 100)
            return BadRequest(new
            {
                message = "Tên tiện nghi phải từ 1 đến 100 ký tự."
            });

        var amenity = await _db.Set<TienNghi>()
            .FirstOrDefaultAsync(x => x.MaTienNghi == id);

        if (amenity == null)
            return NotFound(new { message = "Không tìm thấy tiện nghi." });

        if (await _db.Set<TienNghi>()
            .AnyAsync(x => x.MaTienNghi != id && x.TenTienNghi == name))
            return Conflict(new { message = "Tên tiện nghi đã tồn tại." });

        amenity.TenTienNghi = name;
        amenity.TrangThai = request.Active;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            return Conflict(new { message = "Tên tiện nghi đã tồn tại." });
        }

        return Ok(new { message = "Đã cập nhật tiện nghi." });
    }

    [HttpPost("type-images/{typeId:int}")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> UploadTypeImages(
        int typeId,
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
                !await IsImage(file))
                return BadRequest(new
                {
                    message = "Ảnh phải là JPG, PNG, WebP hợp lệ và không quá 5 MB."
                });
        }

        bool typeExists = await _db.Set<LoaiPhong>()
            .AnyAsync(x => x.MaLoaiPhong == typeId);

        if (!typeExists)
            return NotFound(new { message = "Không tìm thấy loại phòng." });

        var root = _env.WebRootPath
            ?? Path.Combine(_env.ContentRootPath, "wwwroot");

        var folder = Path.Combine(root, "uploads", "room-types");
        Directory.CreateDirectory(folder);

        var saved = new List<string>();

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        try
        {
            bool hasCover = await _db.Set<HinhAnhPhong>()
                .AnyAsync(x =>
                    x.MaLoaiPhong == typeId &&
                    x.AnhDaiDien);

            foreach (var file in files)
            {
                string extension = Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

                string filename = $"{Guid.NewGuid():N}{extension}";
                string destination = Path.Combine(folder, filename);
                string path = $"/uploads/room-types/{filename}";

                await using (var stream = new FileStream(
                    destination,
                    FileMode.CreateNew))
                {
                    saved.Add(destination);
                    await file.CopyToAsync(stream);
                }

                var image = new HinhAnhPhong
                {
                    MaLoaiPhong = typeId,
                    DuongDan = path,
                    MoTa = null,
                    AnhDaiDien = !hasCover
                };

                _db.Set<HinhAnhPhong>().Add(image);
                hasCover = true;
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = $"Đã tải lên {files.Count} hình ảnh loại phòng."
            });
        }
        catch
        {
            await transaction.RollbackAsync();

            foreach (var path in saved)
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
                message = "Không thể lưu ảnh vào máy chủ hoặc cơ sở dữ liệu."
            });
        }
    }

    private static async Task<bool> IsImage(IFormFile file)
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
