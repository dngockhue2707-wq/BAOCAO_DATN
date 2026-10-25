using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/admin/room-management")]
[Authorize(Roles = "Admin")]
public class AdminRoomsController : ControllerBase
{
    private readonly SqlConnection _db;

    public AdminRoomsController(SqlConnection db)
    {
        _db = db;
    }

    public class RoomRequest
    {
        public string RoomNumber { get; set; } = "";
        public int RoomTypeId { get; set; }
        public int? Floor { get; set; }
        public string Status { get; set; } = "Trống";
        public string? Description { get; set; }
    }

    public class RoomStatusRequest
    {
        public string Status { get; set; } = "";
    }

    public class RoomTypeRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int AdultCapacity { get; set; } = 2;
        public int ChildCapacity { get; set; }
        public decimal? Area { get; set; }
        public int? BedCount { get; set; }
        public string? BedType { get; set; }
        public decimal BasePrice { get; set; }
        public bool Active { get; set; } = true;
    }

    public class ImageRequest
    {
        public int RoomTypeId { get; set; }
        public string Path { get; set; } = "";
        public string? Description { get; set; }
        public bool IsCover { get; set; }
    }

    public class AmenityRequest
    {
        public int RoomTypeId { get; set; }
        public List<int> AmenityIds { get; set; } = new();
    }

    private static readonly string[] RoomStatuses =
    {
        "Trống",
        "Đang sử dụng",
        "Đang dọn",
        "Bảo trì",
        "Ngừng hoạt động"
    };

    private static object DbValue(object? value)
    {
        return value ?? DBNull.Value;
    }

    private static void Add(SqlCommand command, string name, object? value)
    {
        command.Parameters.AddWithValue(name, DbValue(value));
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

        const string sql = """
            SELECT
                p.MaPhong,
                p.SoPhong,
                p.MaLoaiPhong,
                l.TenLoaiPhong,
                p.Tang,
                p.TrangThai,
                p.MoTa,
                l.GiaCoBan
            FROM dbo.Phong p
            INNER JOIN dbo.LoaiPhong l
                ON p.MaLoaiPhong = l.MaLoaiPhong
            ORDER BY p.Tang, p.SoPhong
            """;

        using var command = new SqlCommand(sql, _db);
        using var reader = await command.ExecuteReaderAsync();

        var rooms = new List<object>();

        while (await reader.ReadAsync())
        {
            rooms.Add(new
            {
                id = reader.GetInt32(0),
                roomNumber = reader.GetString(1),
                roomTypeId = reader.GetInt32(2),
                roomTypeName = reader.GetString(3),
                floor = reader.IsDBNull(4) ? (int?)null : reader.GetInt32(4),
                status = reader.GetString(5),
                description = reader.IsDBNull(6) ? "" : reader.GetString(6),
                basePrice = reader.GetDecimal(7)
            });
        }

        return Ok(rooms);
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetRoomTypes()
    {
        await OpenAsync();

        const string sql = """
            SELECT
                MaLoaiPhong,
                TenLoaiPhong,
                MoTa,
                SucChuaNguoiLon,
                SucChuaTreEm,
                DienTich,
                SoGiuong,
                LoaiGiuong,
                GiaCoBan,
                TrangThai
            FROM dbo.LoaiPhong
            ORDER BY MaLoaiPhong
            """;

        using var command = new SqlCommand(sql, _db);
        using var reader = await command.ExecuteReaderAsync();

        var types = new List<object>();

        while (await reader.ReadAsync())
        {
            types.Add(new
            {
                id = reader.GetInt32(0),
                name = reader.GetString(1),
                description = reader.IsDBNull(2) ? "" : reader.GetString(2),
                adultCapacity = reader.GetInt32(3),
                childCapacity = reader.GetInt32(4),
                area = reader.IsDBNull(5) ? (decimal?)null : reader.GetDecimal(5),
                bedCount = reader.IsDBNull(6) ? (int?)null : reader.GetInt32(6),
                bedType = reader.IsDBNull(7) ? "" : reader.GetString(7),
                basePrice = reader.GetDecimal(8),
                active = reader.GetBoolean(9)
            });
        }

        return Ok(types);
    }

    [HttpGet("amenities")]
    public async Task<IActionResult> GetAmenities()
    {
        await OpenAsync();

        const string sql = """
            SELECT MaTienNghi, TenTienNghi, TrangThai
            FROM dbo.TienNghi
            ORDER BY TenTienNghi
            """;

        using var command = new SqlCommand(sql, _db);
        using var reader = await command.ExecuteReaderAsync();

        var amenities = new List<object>();

        while (await reader.ReadAsync())
        {
            amenities.Add(new
            {
                id = reader.GetInt32(0),
                name = reader.GetString(1),
                active = reader.GetBoolean(2)
            });
        }

        return Ok(amenities);
    }

    [HttpGet("type-details/{id:int}")]
    public async Task<IActionResult> GetRoomTypeDetails(int id)
    {
        await OpenAsync();

        var imageList = new List<object>();
        var amenityIds = new List<int>();

        using (var command = new SqlCommand("""
            SELECT MaHinhAnh, DuongDan, MoTa, AnhDaiDien
            FROM dbo.HinhAnhPhong
            WHERE MaLoaiPhong = @id
            ORDER BY AnhDaiDien DESC, MaHinhAnh
            """, _db))
        {
            Add(command, "@id", id);

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                imageList.Add(new
                {
                    id = reader.GetInt32(0),
                    path = reader.GetString(1),
                    description = reader.IsDBNull(2) ? "" : reader.GetString(2),
                    isCover = reader.GetBoolean(3)
                });
            }
        }

        using (var command = new SqlCommand("""
            SELECT MaTienNghi
            FROM dbo.PhongTienNghi
            WHERE MaLoaiPhong = @id
            """, _db))
        {
            Add(command, "@id", id);

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
                amenityIds.Add(reader.GetInt32(0));
        }

        return Ok(new
        {
            images = imageList,
            amenityIds
        });
    }

    [HttpPut("rooms/{id:int}/status")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoomStatus(
        int id,
        RoomStatusRequest request)
    {
        var newStatus = request.Status?.Trim() ?? "";

        await OpenAsync();

        using var transaction =
            (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            string? currentStatus;

            using (var check = new SqlCommand("""
                SELECT TrangThai
                FROM dbo.Phong WITH (UPDLOCK, HOLDLOCK)
                WHERE MaPhong = @id
                """, _db, transaction))
            {
                Add(check, "@id", id);

                currentStatus = await check.ExecuteScalarAsync() as string;
            }

            if (currentStatus == null)
            {
                await transaction.RollbackAsync();

                return NotFound(new
                {
                    message = "Không tìm thấy phòng."
                });
            }

            if (currentStatus == newStatus)
            {
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Trạng thái phòng không thay đổi."
                });
            }

            bool allowed = currentStatus switch
            {
                "Trống" =>
                    newStatus is "Bảo trì" or "Ngừng hoạt động",

                "Bảo trì" =>
                    newStatus is "Trống" or "Ngừng hoạt động",

                "Ngừng hoạt động" =>
                    newStatus is "Trống" or "Bảo trì",

                "Đang dọn" =>
                    newStatus is "Trống" or "Bảo trì",

                _ => false
            };

            if (!allowed)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Không được phép chuyển trạng thái này trực tiếp."
                });
            }

            if (newStatus is "Trống" or "Bảo trì" or "Ngừng hoạt động")
            {
                using var bookingCheck = new SqlCommand("""
                    SELECT COUNT(1)
                    FROM dbo.ChiTietDatPhong c
                    JOIN dbo.DatPhong d
                        ON c.MaDatPhong = d.MaDatPhong
                    WHERE c.MaPhong = @id
                    AND d.TrangThai = N'Đã nhận phòng'
                    """, _db, transaction);

                Add(bookingCheck, "@id", id);

                var occupied = Convert.ToInt32(
                    await bookingCheck.ExecuteScalarAsync());

                if (occupied > 0)
                {
                    await transaction.RollbackAsync();

                    return Conflict(new
                    {
                        message = "Phòng còn khách lưu trú, không thể đổi trạng thái."
                    });
                }
            }

            using (var update = new SqlCommand("""
                UPDATE dbo.Phong
                SET TrangThai = @status
                WHERE MaPhong = @id
                """, _db, transaction))
            {
                Add(update, "@status", newStatus);
                Add(update, "@id", id);

                await update.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Cập nhật trạng thái phòng thành công."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPost("rooms")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateRoom(RoomRequest request)
    {
        request.RoomNumber = request.RoomNumber.Trim();

        if (string.IsNullOrWhiteSpace(request.RoomNumber)
            || request.RoomNumber.Length > 20)
            return BadRequest(new { message = "Số phòng không hợp lệ." });

        if (!RoomStatuses.Contains(request.Status))
            return BadRequest(new { message = "Trạng thái phòng không hợp lệ." });

        
        if (request.Floor.HasValue &&
            (request.Floor.Value < 0 || request.Floor.Value > 100))
        {
            return BadRequest(new { message = "Tầng không hợp lệ." });
        }

        if (request.Description?.Length > 500)
            return BadRequest(new { message = "Mô tả không được quá 500 ký tự." });

        await OpenAsync();

        const string sql = """
            IF NOT EXISTS (
                SELECT 1 FROM dbo.LoaiPhong
                WHERE MaLoaiPhong = @typeId AND TrangThai = 1
            )
                THROW 50001, N'Loại phòng không tồn tại hoặc đang ngừng hoạt động.', 1;

            IF EXISTS (
                SELECT 1 FROM dbo.Phong WITH (UPDLOCK, HOLDLOCK)
                WHERE SoPhong = @roomNumber
            )
                THROW 50002, N'Số phòng đã tồn tại.', 1;

            INSERT INTO dbo.Phong
                (SoPhong, MaLoaiPhong, Tang, TrangThai, MoTa)
            OUTPUT INSERTED.MaPhong
            VALUES
                (@roomNumber, @typeId, @floor, @status, @description)
            """;

        using var command = new SqlCommand(sql, _db);

        Add(command, "@roomNumber", request.RoomNumber);
        Add(command, "@typeId", request.RoomTypeId);
        Add(command, "@floor", request.Floor);
        Add(command, "@status", request.Status);
        Add(command, "@description", request.Description?.Trim());

        try
        {
            var id = Convert.ToInt32(await command.ExecuteScalarAsync());

            return Ok(new
            {
                success = true,
                id,
                message = "Thêm phòng thành công."
            });
        }
        catch (SqlException ex) when (ex.Number is 50001 or 50002 or 2601 or 2627)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("rooms/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoom(int id, RoomRequest request)
    {
        request.RoomNumber = request.RoomNumber.Trim();

        if (string.IsNullOrWhiteSpace(request.RoomNumber)
            || request.RoomNumber.Length > 20)
            return BadRequest(new { message = "Số phòng không hợp lệ." });

        if (!RoomStatuses.Contains(request.Status))
            return BadRequest(new { message = "Trạng thái phòng không hợp lệ." });

        if (request.Floor is < 0 or > 100)
            return BadRequest(new { message = "Tầng không hợp lệ." });

        if (request.Description?.Length > 500)
            return BadRequest(new { message = "Mô tả không được quá 500 ký tự." });

        await OpenAsync();

        const string sql = """
            IF EXISTS (
                SELECT 1
                FROM dbo.Phong
                WHERE SoPhong = @roomNumber AND MaPhong <> @id
            )
                THROW 50002, N'Số phòng đã tồn tại.', 1;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.LoaiPhong
                WHERE MaLoaiPhong = @typeId
            )
                THROW 50001, N'Loại phòng không tồn tại.', 1;

            IF EXISTS (
                SELECT 1
                FROM dbo.ChiTietDatPhong c
                INNER JOIN dbo.DatPhong d
                    ON c.MaDatPhong = d.MaDatPhong
                WHERE c.MaPhong = @id
                  AND d.TrangThai IN (
                      N'Chờ xác nhận',
                      N'Đã xác nhận',
                      N'Đã đặt cọc',
                      N'Đã nhận phòng'
                  )
            )
            AND (
                SELECT MaLoaiPhong FROM dbo.Phong WHERE MaPhong = @id
            ) <> @typeId
                THROW 50003, N'Không thể đổi loại phòng khi còn đơn đặt phòng đang hoạt động.', 1;

            UPDATE dbo.Phong
            SET SoPhong = @roomNumber,
                MaLoaiPhong = @typeId,
                Tang = @floor,
                TrangThai = @status,
                MoTa = @description
            WHERE MaPhong = @id;

            SELECT @@ROWCOUNT
            """;

        using var command = new SqlCommand(sql, _db);

        Add(command, "@id", id);
        Add(command, "@roomNumber", request.RoomNumber);
        Add(command, "@typeId", request.RoomTypeId);
        Add(command, "@floor", request.Floor);
        Add(command, "@status", request.Status);
        Add(command, "@description", request.Description?.Trim());

        try
        {
            var affected = Convert.ToInt32(await command.ExecuteScalarAsync());

            if (affected == 0)
                return NotFound(new { message = "Không tìm thấy phòng." });

            return Ok(new
            {
                success = true,
                message = "Cập nhật phòng thành công."
            });
        }
        catch (SqlException ex) when (ex.Number is 50001 or 50002 or 50003 or 2601 or 2627)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("types")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateRoomType(RoomTypeRequest request)
    {
        var error = ValidateRoomType(request);
        if (error != null)
            return BadRequest(new { message = error });

        await OpenAsync();

        using var command = new SqlCommand("""
            INSERT INTO dbo.LoaiPhong
            (
                TenLoaiPhong, MoTa, SucChuaNguoiLon,
                SucChuaTreEm, DienTich, SoGiuong,
                LoaiGiuong, GiaCoBan, TrangThai
            )
            OUTPUT INSERTED.MaLoaiPhong
            VALUES
            (
                @name, @description, @adults,
                @children, @area, @beds,
                @bedType, @price, @active
            )
            """, _db);

        SetRoomTypeParameters(command, request);

        var id = Convert.ToInt32(await command.ExecuteScalarAsync());

        return Ok(new
        {
            success = true,
            id,
            message = "Thêm loại phòng thành công."
        });
    }

    [HttpPut("types/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoomType(int id, RoomTypeRequest request)
    {
        var error = ValidateRoomType(request);
        if (error != null)
            return BadRequest(new { message = error });

        await OpenAsync();

        using var command = new SqlCommand("""
            UPDATE dbo.LoaiPhong
            SET TenLoaiPhong = @name,
                MoTa = @description,
                SucChuaNguoiLon = @adults,
                SucChuaTreEm = @children,
                DienTich = @area,
                SoGiuong = @beds,
                LoaiGiuong = @bedType,
                GiaCoBan = @price,
                TrangThai = @active
            WHERE MaLoaiPhong = @id;

            SELECT @@ROWCOUNT
            """, _db);

        SetRoomTypeParameters(command, request);
        Add(command, "@id", id);

        var affected = Convert.ToInt32(await command.ExecuteScalarAsync());

        if (affected == 0)
            return NotFound(new { message = "Không tìm thấy loại phòng." });

        return Ok(new
        {
            success = true,
            message = "Cập nhật loại phòng thành công."
        });
    }

    private static string? ValidateRoomType(RoomTypeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)
            || request.Name.Length > 100)
            return "Tên loại phòng không hợp lệ.";

        if (request.BasePrice <= 0)
            return "Giá phòng phải lớn hơn 0.";

        if (request.AdultCapacity < 1 || request.AdultCapacity > 100)
            return "Sức chứa người lớn không hợp lệ.";

        if (request.ChildCapacity < 0 || request.ChildCapacity > 100)
            return "Sức chứa trẻ em không hợp lệ.";

        if (request.Area is < 0)
            return "Diện tích không hợp lệ.";

        if (request.BedCount is < 0)
            return "Số giường không hợp lệ.";

        if (request.Description?.Length > 1000)
            return "Mô tả quá dài.";

        if (request.BedType?.Length > 100)
            return "Tên loại giường quá dài.";

        return null;
    }

    private static void SetRoomTypeParameters(
        SqlCommand command,
        RoomTypeRequest request)
    {
        Add(command, "@name", request.Name.Trim());
        Add(command, "@description", request.Description?.Trim());
        Add(command, "@adults", request.AdultCapacity);
        Add(command, "@children", request.ChildCapacity);
        Add(command, "@area", request.Area);
        Add(command, "@beds", request.BedCount);
        Add(command, "@bedType", request.BedType?.Trim());
        Add(command, "@price", request.BasePrice);
        Add(command, "@active", request.Active);
    }

    [HttpPut("amenities")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateAmenities(AmenityRequest request)
    {
        if (request.RoomTypeId <= 0)
            return BadRequest(new { message = "Chưa chọn loại phòng." });

        await OpenAsync();

        using var transaction = (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            using (var check = new SqlCommand("""
                SELECT COUNT(1)
                FROM dbo.LoaiPhong
                WHERE MaLoaiPhong = @id
                """, _db, transaction))
            {
                Add(check, "@id", request.RoomTypeId);

                if (Convert.ToInt32(await check.ExecuteScalarAsync()) == 0)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { message = "Loại phòng không tồn tại." });
                }
            }

            using (var delete = new SqlCommand("""
                DELETE FROM dbo.PhongTienNghi
                WHERE MaLoaiPhong = @id
                """, _db, transaction))
            {
                Add(delete, "@id", request.RoomTypeId);
                await delete.ExecuteNonQueryAsync();
            }

            foreach (var amenityId in request.AmenityIds.Distinct())
            {
                using var insert = new SqlCommand("""
                    INSERT INTO dbo.PhongTienNghi
                        (MaLoaiPhong, MaTienNghi)
                    VALUES (@typeId, @amenityId)
                    """, _db, transaction);

                Add(insert, "@typeId", request.RoomTypeId);
                Add(insert, "@amenityId", amenityId);

                await insert.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Cập nhật tiện nghi thành công."
            });
        }
        catch (SqlException)
        {
            await transaction.RollbackAsync();

            return BadRequest(new
            {
                message = "Danh sách tiện nghi không hợp lệ."
            });
        }
    }

    [HttpPost("images")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddImage(ImageRequest request)
    {
        request.Path = request.Path.Trim();

        if (string.IsNullOrWhiteSpace(request.Path)
            || request.Path.Length > 500
            || request.Path.StartsWith("//")
            || !(request.Path.StartsWith("/")
                 || Uri.TryCreate(request.Path, UriKind.Absolute, out var uri)
                    && uri.Scheme == Uri.UriSchemeHttps))
            return BadRequest(new { message = "Đường dẫn ảnh không hợp lệ." });

        if (request.Description?.Length > 255)
            return BadRequest(new { message = "Mô tả ảnh quá dài." });

        await OpenAsync();

        using var transaction = (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            if (request.IsCover)
            {
                using var reset = new SqlCommand("""
                    UPDATE dbo.HinhAnhPhong
                    SET AnhDaiDien = 0
                    WHERE MaLoaiPhong = @typeId
                    """, _db, transaction);

                Add(reset, "@typeId", request.RoomTypeId);
                await reset.ExecuteNonQueryAsync();
            }

            using var insert = new SqlCommand("""
                INSERT INTO dbo.HinhAnhPhong
                    (MaLoaiPhong, DuongDan, MoTa, AnhDaiDien)
                OUTPUT INSERTED.MaHinhAnh
                VALUES (@typeId, @path, @description, @cover)
                """, _db, transaction);

            Add(insert, "@typeId", request.RoomTypeId);
            Add(insert, "@path", request.Path);
            Add(insert, "@description", request.Description?.Trim());
            Add(insert, "@cover", request.IsCover);

            var id = Convert.ToInt32(await insert.ExecuteScalarAsync());

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                id,
                message = "Thêm hình ảnh thành công."
            });
        }
        catch (SqlException)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { message = "Không thể thêm hình ảnh." });
        }
    }

    [HttpPut("images/{id:int}/cover")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SetCoverImage(int id)
    {
        await OpenAsync();

        using var transaction = (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            int roomTypeId;

            using (var find = new SqlCommand("""
                SELECT MaLoaiPhong
                FROM dbo.HinhAnhPhong
                WHERE MaHinhAnh = @id
                """, _db, transaction))
            {
                Add(find, "@id", id);

                var result = await find.ExecuteScalarAsync();

                if (result == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { message = "Không tìm thấy ảnh." });
                }

                roomTypeId = Convert.ToInt32(result);
            }

            using (var update = new SqlCommand("""
                UPDATE dbo.HinhAnhPhong
                SET AnhDaiDien =
                    CASE WHEN MaHinhAnh = @id THEN 1 ELSE 0 END
                WHERE MaLoaiPhong = @typeId
                """, _db, transaction))
            {
                Add(update, "@id", id);
                Add(update, "@typeId", roomTypeId);
                await update.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Đã cập nhật ảnh đại diện."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpDelete("images/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteImage(int id)
    {
        await OpenAsync();

        using var command = new SqlCommand("""
            DELETE FROM dbo.HinhAnhPhong
            WHERE MaHinhAnh = @id;

            SELECT @@ROWCOUNT
            """, _db);

        Add(command, "@id", id);

        var affected = Convert.ToInt32(await command.ExecuteScalarAsync());

        if (affected == 0)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        return Ok(new
        {
            success = true,
            message = "Đã xóa hình ảnh."
        });
    }
}
