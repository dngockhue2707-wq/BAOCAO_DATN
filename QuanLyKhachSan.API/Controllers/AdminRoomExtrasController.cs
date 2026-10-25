
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/room-extras")]
public class AdminRoomExtrasController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IWebHostEnvironment _env;

    public AdminRoomExtrasController(
        SqlConnection db,
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

    private async Task OpenAsync()
    {
        if (_db.State != ConnectionState.Open)
            await _db.OpenAsync();
    }

    [HttpPost("amenities")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddAmenity(
        AmenityInput request)
    {
        var name = request.Name?.Trim() ?? "";

        if (name.Length is < 1 or > 100)
        {
            return BadRequest(new
            {
                message = "Tên tiện nghi phải từ 1 đến 100 ký tự."
            });
        }

        await OpenAsync();

        using var cmd = new SqlCommand("""
            IF EXISTS (
                SELECT 1
                FROM dbo.TienNghi
                WHERE TenTienNghi = @name
            )
                THROW 51001, N'Tiện nghi này đã tồn tại.', 1;

            INSERT INTO dbo.TienNghi
                (TenTienNghi, TrangThai)
            VALUES
                (@name, @active);
            """, _db);

        cmd.Parameters.Add(
            "@name", SqlDbType.NVarChar, 100
        ).Value = name;

        cmd.Parameters.Add(
            "@active", SqlDbType.Bit
        ).Value = request.Active;

        try
        {
            await cmd.ExecuteNonQueryAsync();

            return Ok(new
            {
                message = "Đã thêm tiện nghi."
            });
        }
        catch (SqlException ex)
            when (ex.Number is 51001 or 2601 or 2627)
        {
            return Conflict(new
            {
                message = "Tên tiện nghi đã tồn tại."
            });
        }
    }

    [HttpPut("amenities/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateAmenity(
        int id,
        AmenityInput request)
    {
        var name = request.Name?.Trim() ?? "";

        if (name.Length is < 1 or > 100)
        {
            return BadRequest(new
            {
                message = "Tên tiện nghi phải từ 1 đến 100 ký tự."
            });
        }

        await OpenAsync();

        using var cmd = new SqlCommand("""
            IF EXISTS (
                SELECT 1
                FROM dbo.TienNghi
                WHERE TenTienNghi = @name
                  AND MaTienNghi <> @id
            )
                THROW 51001, N'Tiện nghi này đã tồn tại.', 1;

            UPDATE dbo.TienNghi
            SET TenTienNghi = @name,
                TrangThai = @active
            WHERE MaTienNghi = @id;

            SELECT @@ROWCOUNT;
            """, _db);

        cmd.Parameters.Add(
            "@id", SqlDbType.Int
        ).Value = id;

        cmd.Parameters.Add(
            "@name", SqlDbType.NVarChar, 100
        ).Value = name;

        cmd.Parameters.Add(
            "@active", SqlDbType.Bit
        ).Value = request.Active;

        try
        {
            var changed = Convert.ToInt32(
                await cmd.ExecuteScalarAsync()
            );

            if (changed == 0)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tiện nghi."
                });
            }

            return Ok(new
            {
                message = "Đã cập nhật tiện nghi."
            });
        }
        catch (SqlException ex)
            when (ex.Number is 51001 or 2601 or 2627)
        {
            return Conflict(new
            {
                message = "Tên tiện nghi đã tồn tại."
            });
        }
    }

    [HttpPost("type-images/{typeId:int}")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> UploadTypeImages(
        int typeId,
        [FromForm] List<IFormFile> files)
    {
        if (files is null || files.Count is < 1 or > 10)
        {
            return BadRequest(new
            {
                message = "Chọn từ 1 đến 10 ảnh."
            });
        }

        foreach (var file in files)
        {
            if (
                file.Length is < 12 or > 5242880 ||
                !await IsImage(file)
            )
            {
                return BadRequest(new
                {
                    message = "Ảnh phải là JPG, PNG, WebP hợp lệ và không quá 5 MB."
                });
            }
        }

        await OpenAsync();

        using (var check = new SqlCommand("""
            SELECT COUNT(1)
            FROM dbo.LoaiPhong
            WHERE MaLoaiPhong = @id
            """, _db))
        {
            check.Parameters.Add(
                "@id", SqlDbType.Int
            ).Value = typeId;

            var count = Convert.ToInt32(
                await check.ExecuteScalarAsync()
            );

            if (count == 0)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy loại phòng."
                });
            }
        }

        var root = _env.WebRootPath
            ?? Path.Combine(_env.ContentRootPath, "wwwroot");

        var folder = Path.Combine(
            root, "uploads", "room-types"
        );

        Directory.CreateDirectory(folder);

        var saved = new List<string>();

        using var tx =
            (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            bool hasCover;

            using (var check = new SqlCommand("""
                SELECT COUNT(1)
                FROM dbo.HinhAnhPhong WITH (UPDLOCK, HOLDLOCK)
                WHERE MaLoaiPhong = @id
                  AND AnhDaiDien = 1
                """, _db, tx))
            {
                check.Parameters.Add(
                    "@id", SqlDbType.Int
                ).Value = typeId;

                hasCover = Convert.ToInt32(
                    await check.ExecuteScalarAsync()
                ) > 0;
            }

            foreach (var file in files)
            {
                var extension = Path.GetExtension(
                    file.FileName
                ).ToLowerInvariant();

                var filename =
                    $"{Guid.NewGuid():N}{extension}";

                var destination = Path.Combine(
                    folder, filename
                );

                var url =
                    $"/uploads/room-types/{filename}";

                await using (var stream = new FileStream(
                    destination,
                    FileMode.CreateNew
                ))
                {
                    saved.Add(destination);
                    await file.CopyToAsync(stream);
                }

                using var cmd = new SqlCommand("""
                    INSERT INTO dbo.HinhAnhPhong
                        (MaLoaiPhong, DuongDan, MoTa, AnhDaiDien)
                    VALUES
                        (@id, @path, NULL, @cover)
                    """, _db, tx);

                cmd.Parameters.Add(
                    "@id", SqlDbType.Int
                ).Value = typeId;

                cmd.Parameters.Add(
                    "@path", SqlDbType.NVarChar, 500
                ).Value = url;

                cmd.Parameters.Add(
                    "@cover", SqlDbType.Bit
                ).Value = !hasCover;

                await cmd.ExecuteNonQueryAsync();

                hasCover = true;
            }

            await tx.CommitAsync();

            return Ok(new
            {
                message =
                    $"Đã tải lên {files.Count} hình ảnh loại phòng."
            });
        }
        catch
        {
            await tx.RollbackAsync();

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
                message = "Không lưu được ảnh vào máy chủ hoặc cơ sở dữ liệu."
            });
        }
    }

    private static async Task<bool> IsImage(
        IFormFile file)
    {
        var extension = Path.GetExtension(
            file.FileName
        ).ToLowerInvariant();

        if (extension is not (
            ".jpg" or ".jpeg" or ".png" or ".webp"
        ))
            return false;

        var bytes = new byte[12];

        await using var stream = file.OpenReadStream();

        if (await stream.ReadAsync(bytes) < 12)
            return false;

        return extension switch
        {
            ".jpg" or ".jpeg" =>
                bytes[0] == 0xFF &&
                bytes[1] == 0xD8 &&
                bytes[2] == 0xFF,

            ".png" =>
                bytes.AsSpan(0, 8).SequenceEqual(
                    new byte[] {
                        137, 80, 78, 71, 13, 10, 26, 10
                    }
                ),

            ".webp" =>
                System.Text.Encoding.ASCII.GetString(
                    bytes, 0, 4
                ) == "RIFF" &&
                System.Text.Encoding.ASCII.GetString(
                    bytes, 8, 4
                ) == "WEBP",

            _ => false
        };
    }
}
