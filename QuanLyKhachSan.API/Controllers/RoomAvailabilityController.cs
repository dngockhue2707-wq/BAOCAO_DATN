using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Data;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/room-availability")]
public class RoomAvailabilityController : ControllerBase
{
    private readonly SqlConnection _db;

    public RoomAvailabilityController(SqlConnection db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAvailableRooms(
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut,
        [FromQuery] int? roomTypeId)
    {
        if (checkIn == default || checkOut == default)
        {
            return BadRequest(new
            {
                message = "Vui lòng chọn ngày nhận và ngày trả phòng."
            });
        }

        if (checkIn < DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message = "Ngày nhận phòng không được ở trong quá khứ."
            });
        }

        if (checkOut <= checkIn)
        {
            return BadRequest(new
            {
                message = "Ngày trả phòng phải sau ngày nhận phòng."
            });
        }

        int nights = checkOut.DayNumber - checkIn.DayNumber;

        if (nights > 30)
        {
            return BadRequest(new
            {
                message = "Mỗi lượt đặt phòng tối đa 30 đêm."
            });
        }

        if (roomTypeId.HasValue && roomTypeId.Value <= 0)
        {
            return BadRequest(new
            {
                message = "Loại phòng không hợp lệ."
            });
        }

        if (_db.State != ConnectionState.Open)
        {
            await _db.OpenAsync();
        }

        const string sql = """
            SELECT
                p.MaPhong,
                p.SoPhong,
                p.Tang,
                p.MaLoaiPhong,
                lp.TenLoaiPhong,
                lp.GiaCoBan,
                lp.SucChuaNguoiLon,
                lp.SucChuaTreEm,
                lp.DienTich,
                p.MoTa
            FROM dbo.Phong p
            INNER JOIN dbo.LoaiPhong lp
                ON lp.MaLoaiPhong = p.MaLoaiPhong
            WHERE p.TrangThai = N'Trống'
              AND lp.TrangThai = 1
              AND (@RoomTypeId IS NULL OR p.MaLoaiPhong = @RoomTypeId)
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM dbo.ChiTietDatPhong ct
                  INNER JOIN dbo.DatPhong dp
                      ON dp.MaDatPhong = ct.MaDatPhong
                  WHERE ct.MaPhong = p.MaPhong
                    AND dp.TrangThai IN
                    (
                        N'Chờ xác nhận',
                        N'Đã xác nhận',
                        N'Đã đặt cọc',
                        N'Đã nhận phòng'
                    )
                    AND dp.NgayNhanPhong < @CheckOut
                    AND dp.NgayTraPhong > @CheckIn
              )
            ORDER BY
                lp.GiaCoBan,
                p.Tang,
                p.SoPhong
            """;

        using var command = new SqlCommand(sql, _db);

        command.Parameters.Add(
            "@CheckIn",
            SqlDbType.Date
        ).Value = checkIn.ToDateTime(TimeOnly.MinValue);

        command.Parameters.Add(
            "@CheckOut",
            SqlDbType.Date
        ).Value = checkOut.ToDateTime(TimeOnly.MinValue);

        command.Parameters.Add(
            "@RoomTypeId",
            SqlDbType.Int
        ).Value = roomTypeId.HasValue
            ? roomTypeId.Value
            : DBNull.Value;

        var rooms = new List<object>();

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            decimal price = reader.GetDecimal(5);

            rooms.Add(new
            {
                id = reader.GetInt32(0),
                roomNumber = reader.GetString(1),
                floor = reader.IsDBNull(2)
                    ? (int?)null
                    : reader.GetInt32(2),
                roomTypeId = reader.GetInt32(3),
                roomTypeName = reader.GetString(4),
                pricePerNight = price,
                adultCapacity = reader.GetInt32(6),
                childCapacity = reader.GetInt32(7),
                area = reader.IsDBNull(8)
                    ? (decimal?)null
                    : reader.GetDecimal(8),
                description = reader.IsDBNull(9)
                    ? ""
                    : reader.GetString(9),
                nights,
                estimatedTotal = price * nights
            });
        }

        return Ok(new
        {
            success = true,
            checkIn,
            checkOut,
            nights,
            availableCount = rooms.Count,
            rooms
        });
    }
}
