
using System.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

public class UpdateRoomStatusDto
{
    public string Status { get; set; } = "";
}

public class UpdateBookingStatusDto
{
    public string Status { get; set; } = "";
}

[ApiController]
[Route("api/management")]
[Authorize(Roles = "Admin,Staff")]
public class ManagementController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IAntiforgery _antiforgery;

    public ManagementController(
        SqlConnection db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private async Task<bool> ValidToken()
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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        const string sql = """
            SELECT
                (SELECT COUNT(*) FROM dbo.Phong) AS TotalRooms,
                (SELECT COUNT(*) FROM dbo.Phong
                 WHERE TrangThai = N'Trống') AS AvailableRooms,
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Chờ xác nhận') AS PendingBookings,
                (SELECT COUNT(*) FROM dbo.KhachHang) AS TotalCustomers
            """;

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        using var reader = await cmd.ExecuteReaderAsync();

        await reader.ReadAsync();

        return Ok(new
        {
            totalRooms = reader.GetInt32(0),
            availableRooms = reader.GetInt32(1),
            pendingBookings = reader.GetInt32(2),
            totalCustomers = reader.GetInt32(3)
        });
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        const string sql = """
            SELECT
                p.MaPhong, p.SoPhong, p.Tang,
                p.TrangThai, lp.TenLoaiPhong
            FROM dbo.Phong p
            JOIN dbo.LoaiPhong lp
              ON lp.MaLoaiPhong = p.MaLoaiPhong
            ORDER BY p.Tang, p.SoPhong
            """;

        var rooms = new List<object>();

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            rooms.Add(new
            {
                id = reader.GetInt32(0),
                number = reader.GetString(1),
                floor = reader.IsDBNull(2)
                    ? 0 : Convert.ToInt32(reader.GetValue(2)),
                status = reader.GetString(3),
                roomType = reader.GetString(4)
            });
        }

        return Ok(new { rooms });
    }

    [HttpPut("rooms/{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRoomStatus(
        int id, [FromBody] UpdateRoomStatusDto dto)
    {
        if (!await ValidToken())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        string[] valid =
        {
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        };

        if (!valid.Contains(dto.Status))
            return BadRequest(new
            {
                message = "Trạng thái phòng không hợp lệ."
            });

        await _db.OpenAsync();

        // Không cho sửa phòng thành ngừng hoạt động/bảo trì
        // nếu có đơn đặt phòng hiện tại hoặc trong tương lai.
        const string sql = """
            UPDATE p
            SET p.TrangThai = @Status
            FROM dbo.Phong p
            WHERE p.MaPhong = @Id
              AND (
                    @Status NOT IN (N'Bảo trì', N'Ngừng hoạt động')
                    OR NOT EXISTS
                    (
                        SELECT 1
                        FROM dbo.ChiTietDatPhong ct
                        JOIN dbo.DatPhong dp
                          ON dp.MaDatPhong = ct.MaDatPhong
                        WHERE ct.MaPhong = p.MaPhong
                          AND dp.TrangThai IN
                          (
                              N'Chờ xác nhận',
                              N'Đã xác nhận',
                              N'Đã đặt cọc',
                              N'Đã nhận phòng'
                          )
                          AND dp.NgayTraPhong > CAST(GETDATE() AS date)
                    )
              )
            """;

        using var cmd = new SqlCommand(sql, _db);
        cmd.Parameters.Add("@Status", SqlDbType.NVarChar, 50)
            .Value = dto.Status;
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;

        int affected = await cmd.ExecuteNonQueryAsync();

        return affected == 0
            ? BadRequest(new
            {
                message = "Không thể cập nhật phòng do có đặt phòng hoặc phòng không tồn tại."
            })
            : Ok(new
            {
                success = true,
                message = "Đã cập nhật trạng thái phòng."
            });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings()
    {
        const string sql = """
            SELECT
                dp.MaDatPhong,
                kh.HoTen,
                lp.TenLoaiPhong,
                p.SoPhong,
                dp.NgayNhanPhong,
                dp.NgayTraPhong,
                dp.TrangThai,
                ct.ThanhTien
            FROM dbo.DatPhong dp
            JOIN dbo.KhachHang kh
              ON kh.MaKhachHang = dp.MaKhachHang
            JOIN dbo.ChiTietDatPhong ct
              ON ct.MaDatPhong = dp.MaDatPhong
            JOIN dbo.Phong p
              ON p.MaPhong = ct.MaPhong
            JOIN dbo.LoaiPhong lp
              ON lp.MaLoaiPhong = p.MaLoaiPhong
            ORDER BY dp.MaDatPhong DESC
            """;

        var bookings = new List<object>();

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            bookings.Add(new
            {
                id = reader.GetInt32(0),
                customer = reader.GetString(1),
                roomType = reader.GetString(2),
                roomNumber = reader.GetString(3),
                checkIn = reader.GetDateTime(4),
                checkOut = reader.GetDateTime(5),
                status = reader.GetString(6),
                total = Convert.ToDecimal(reader.GetValue(7))
            });
        }

        return Ok(new { bookings });
    }

    [HttpPut("bookings/{id:int}/status")]
    public async Task<IActionResult> UpdateBookingStatus(
        int id, [FromBody] UpdateBookingStatusDto dto)
    {
        if (!await ValidToken())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        if (dto.Status != "Đã xác nhận" &&
            dto.Status != "Đã hủy")
        {
            return BadRequest(new
            {
                message = "Trang này chỉ hỗ trợ xác nhận hoặc hủy đơn chờ duyệt."
            });
        }

        await _db.OpenAsync();

        const string sql = """
            UPDATE dbo.DatPhong
            SET TrangThai = @Status,
                NgayXacNhan = CASE
                    WHEN @Status = N'Đã xác nhận'
                    THEN SYSDATETIME()
                    ELSE NgayXacNhan
                END,
                LyDoHuy = CASE
                    WHEN @Status = N'Đã hủy'
                    THEN N'Nhân viên hủy đơn'
                    ELSE LyDoHuy
                END
            WHERE MaDatPhong = @Id
              AND TrangThai = N'Chờ xác nhận'
              AND NgayNhanPhong >= CAST(GETDATE() AS date)
            """;

        using var cmd = new SqlCommand(sql, _db);

        cmd.Parameters.Add("@Status", SqlDbType.NVarChar, 50)
            .Value = dto.Status;
        cmd.Parameters.Add("@Id", SqlDbType.Int)
            .Value = id;

        int affected = await cmd.ExecuteNonQueryAsync();

        return affected == 0
            ? BadRequest(new
            {
                message = "Đơn không còn ở trạng thái chờ xác nhận."
            })
            : Ok(new
            {
                success = true,
                message = "Đã cập nhật trạng thái đặt phòng."
            });
    }
}
