
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/room-photos")]
public class AdminRoomPhotosController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IWebHostEnvironment _environment;

    public AdminRoomPhotosController(
        SqlConnection db,
        IWebHostEnvironment environment)
    {
        _db = db;
        _environment = environment;
    }

    private async Task OpenAsync()
    {
        if (_db.State != ConnectionState.Open)
            await _db.OpenAsync();
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        await OpenAsync();

        using var command = new SqlCommand("""
            SELECT p.MaPhong, p.SoPhong, p.Tang,
                   l.TenLoaiPhong
            FROM dbo.Phong p
            JOIN dbo.LoaiPhong l
              ON p.MaLoaiPhong = l.MaLoaiPhong
            ORDER BY p.Tang, p.SoPhong
            """, _db);

        using var reader = await command.ExecuteReaderAsync();
        var result = new List<object>();

        while (await reader.ReadAsync())
        {
            result.Add(new
            {
                id = reader.GetInt32(0),
                number = reader.GetString(1),
                floor = reader.IsDBNull(2)
                    ? (int?)null : reader.GetInt32(2),
                type = reader.GetString(3)
            });
        }

        return Ok(result);
    }

    [HttpGet("{roomId:int}")]
    public async Task<IActionResult> GetPhotos(int roomId)
    {
        await OpenAsync();

        using var command = new SqlCommand("""
            SELECT MaHinhAnh, DuongDan, MoTa,
                   AnhDaiDien, ThuTuHienThi
            FROM dbo.HinhAnhChiTietPhong
            WHERE MaPhong = @roomId
            ORDER BY AnhDaiDien DESC,
                     ThuTuHienThi, MaHinhAnh
            """, _db);

        command.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;

        using var reader = await command.ExecuteReaderAsync();
        var result = new List<object>();

        while (await reader.ReadAsync())
        {
            result.Add(new
            {
                id = reader.GetInt32(0),
                path = reader.GetString(1),
                description = reader.IsDBNull(2)
                    ? "" : reader.GetString(2),
                isCover = reader.GetBoolean(3),
                order = reader.GetInt32(4)
            });
        }

        return Ok(result);
    }

    [HttpPost("{roomId:int}")]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> Upload(
        int roomId,
        [FromForm] List<IFormFile> files)
    {
        if (files == null || files.Count == 0 || files.Count > 10)
            return BadRequest(new
            {
                message = "Chọn từ 1 đến 10 ảnh."
            });

        foreach (var file in files)
        {
            if (file.Length == 0 || file.Length > 5 * 1024 * 1024)
                return BadRequest(new
                {
                    message = "Mỗi ảnh phải nhỏ hơn hoặc bằng 5 MB."
                });

            if (!await IsValidImage(file))
                return BadRequest(new
                {
                    message = "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP hợp lệ."
                });
        }

        await OpenAsync();

        using (var check = new SqlCommand(
            "SELECT COUNT(1) FROM dbo.Phong WHERE MaPhong = @id", _db))
        {
            check.Parameters.Add("@id", SqlDbType.Int).Value = roomId;

            if (Convert.ToInt32(await check.ExecuteScalarAsync()) == 0)
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
        }

        var root = _environment.WebRootPath
            ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

        var folder = Path.Combine(root, "uploads", "rooms");
        Directory.CreateDirectory(folder);

        var savedFiles = new List<string>();

        try
        {
            using var transaction =
                (SqlTransaction)await _db.BeginTransactionAsync();

            try
            {
                int count;

                using (var countCommand = new SqlCommand("""
                    SELECT COUNT(1)
                    FROM dbo.HinhAnhChiTietPhong WITH (UPDLOCK, HOLDLOCK)
                    WHERE MaPhong = @roomId
                    """, _db, transaction))
                {
                    countCommand.Parameters.Add(
                        "@roomId", SqlDbType.Int).Value = roomId;

                    count = Convert.ToInt32(
                        await countCommand.ExecuteScalarAsync());
                }

                var nextOrder = count;

                foreach (var file in files)
                {
                    var extension = Path.GetExtension(file.FileName)
                        .ToLowerInvariant();

                    var filename = $"{Guid.NewGuid():N}{extension}";
                    var fullPath = Path.Combine(folder, filename);
                    var webPath = $"/uploads/rooms/{filename}";

                    using (var stream = new FileStream(
                        fullPath, FileMode.CreateNew))
                    {
                        savedFiles.Add(fullPath);
                        await file.CopyToAsync(stream);
                    }

                    using var command = new SqlCommand("""
                        INSERT INTO dbo.HinhAnhChiTietPhong
                        (MaPhong, DuongDan, MoTa,
                         AnhDaiDien, ThuTuHienThi)
                        VALUES
                        (@roomId, @path, NULL, @cover, @sort)
                        """, _db, transaction);

                    command.Parameters.Add(
                        "@roomId", SqlDbType.Int).Value = roomId;

                    command.Parameters.Add(
                        "@path", SqlDbType.NVarChar, 500).Value = webPath;

                    command.Parameters.Add(
                        "@cover", SqlDbType.Bit).Value =
                        count == 0 && nextOrder == 0;

                    command.Parameters.Add(
                        "@sort", SqlDbType.Int).Value = nextOrder++;

                    await command.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch
        {
            foreach (var path in savedFiles)
            {
                if (System.IO.File.Exists(path))
                    System.IO.File.Delete(path);
            }

            return StatusCode(500, new
            {
                message = "Không thể lưu ảnh. Vui lòng kiểm tra lại."
            });
        }

        return Ok(new
        {
            message = $"Đã tải lên {files.Count} ảnh thành công."
        });
    }

    [HttpPut("{roomId:int}/{photoId:int}/cover")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SetCover(int roomId, int photoId)
    {
        await OpenAsync();

        using var transaction =
            (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            using var command = new SqlCommand("""
                SELECT COUNT(1)
                FROM dbo.HinhAnhChiTietPhong
                WHERE MaPhong = @roomId
                  AND MaHinhAnh = @photoId
                """, _db, transaction);

            command.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;
            command.Parameters.Add("@photoId", SqlDbType.Int).Value = photoId;

            if (Convert.ToInt32(await command.ExecuteScalarAsync()) == 0)
            {
                await transaction.RollbackAsync();

                return NotFound(new
                {
                    message = "Không tìm thấy ảnh."
                });
            }

            using var reset = new SqlCommand("""
                UPDATE dbo.HinhAnhChiTietPhong
                SET AnhDaiDien = 0
                WHERE MaPhong = @roomId
                  AND AnhDaiDien = 1
                """, _db, transaction);

            reset.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;
            await reset.ExecuteNonQueryAsync();

            using var update = new SqlCommand("""
                UPDATE dbo.HinhAnhChiTietPhong
                SET AnhDaiDien = 1
                WHERE MaPhong = @roomId
                  AND MaHinhAnh = @photoId
                """, _db, transaction);

            update.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;
            update.Parameters.Add("@photoId", SqlDbType.Int).Value = photoId;

            await update.ExecuteNonQueryAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Đã thay đổi ảnh đại diện."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpDelete("{roomId:int}/{photoId:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int roomId, int photoId)
    {
        await OpenAsync();

        string? path;
        bool wasCover;

        using (var command = new SqlCommand("""
            SELECT DuongDan, AnhDaiDien
            FROM dbo.HinhAnhChiTietPhong
            WHERE MaPhong = @roomId AND MaHinhAnh = @photoId
            """, _db))
        {
            command.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;
            command.Parameters.Add("@photoId", SqlDbType.Int).Value = photoId;

            using var reader = await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
                return NotFound(new { message = "Ảnh không tồn tại." });

            path = reader.GetString(0);
            wasCover = reader.GetBoolean(1);
        }

        using var transaction =
            (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            using var delete = new SqlCommand("""
                DELETE FROM dbo.HinhAnhChiTietPhong
                WHERE MaPhong = @roomId AND MaHinhAnh = @photoId
                """, _db, transaction);

            delete.Parameters.Add("@roomId", SqlDbType.Int).Value = roomId;
            delete.Parameters.Add("@photoId", SqlDbType.Int).Value = photoId;

            var affected = await delete.ExecuteNonQueryAsync();

            if (affected == 0)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = "Ảnh không tồn tại." });
            }

            if (wasCover)
            {
                using var update = new SqlCommand("""
                    UPDATE dbo.HinhAnhChiTietPhong
                    SET AnhDaiDien = 1
                    WHERE MaHinhAnh = (
                        SELECT TOP 1 MaHinhAnh
                        FROM dbo.HinhAnhChiTietPhong
                        WHERE MaPhong = @roomId
                        ORDER BY ThuTuHienThi, MaHinhAnh
                    )
                    """, _db, transaction);

                update.Parameters.Add(
                    "@roomId", SqlDbType.Int).Value = roomId;

                await update.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        if (path != null && path.StartsWith("/uploads/rooms/"))
        {
            var filename = Path.GetFileName(path);
            var root = _environment.WebRootPath
                ?? Path.Combine(_environment.ContentRootPath, "wwwroot");

            var fullPath = Path.Combine(
                root, "uploads", "rooms", filename);

            try
            {
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }
            catch (IOException)
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
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (extension is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return false;

        var buffer = new byte[12];

        using var stream = file.OpenReadStream();
        var count = await stream.ReadAsync(buffer);

        if (count < 12)
            return false;

        if (extension is ".jpg" or ".jpeg")
            return buffer[0] == 0xFF &&
                   buffer[1] == 0xD8 &&
                   buffer[2] == 0xFF;

        if (extension == ".png")
            return buffer.AsSpan(0, 8).SequenceEqual(
                new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });

        return System.Text.Encoding.ASCII.GetString(buffer, 0, 4)
                   == "RIFF" &&
               System.Text.Encoding.ASCII.GetString(buffer, 8, 4)
                   == "WEBP";
    }
}
