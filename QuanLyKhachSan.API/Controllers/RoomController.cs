
using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/rooms")]
public class RoomController : ControllerBase
{
    private readonly SqlConnection _db;

    public RoomController(SqlConnection db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRooms(
        [FromQuery] DateTime? checkIn,
        [FromQuery] DateTime? checkOut,
        [FromQuery] int adults = 1,
        [FromQuery] int children = 0)
    {
        DateTime start = (checkIn ?? DateTime.Today).Date;
        DateTime end = (checkOut ?? start.AddDays(1)).Date;

        if (start < DateTime.Today ||
            end <= start ||
            end > start.AddDays(30) ||
            adults < 1 || adults > 20 ||
            children < 0 || children > 20)
        {
            return BadRequest(new
            {
                message = "Ngày lưu trú hoặc số khách không hợp lệ."
            });
        }

        const string sql = """
            SELECT
                lp.MaLoaiPhong,
                lp.TenLoaiPhong,
                lp.MoTa,
                lp.SucChuaNguoiLon,
                lp.SucChuaTreEm,
                lp.DienTich,
                lp.SoGiuong,
                lp.LoaiGiuong,
                lp.GiaCoBan,
                h.DuongDan,
                ISNULL(s.TongPhong, 0) AS TongPhong,
                ISNULL(s.PhongConTrong, 0) AS PhongConTrong
            FROM dbo.LoaiPhong lp

            OUTER APPLY
            (
                SELECT TOP 1 DuongDan
                FROM dbo.HinhAnhPhong
                WHERE MaLoaiPhong = lp.MaLoaiPhong
                ORDER BY AnhDaiDien DESC, MaHinhAnh
            ) h

            OUTER APPLY
            (
                SELECT
                    COUNT(*) AS TongPhong,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN p.TrangThai = N'Trống'
                                     AND booking.MaPhong IS NULL
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS PhongConTrong
                FROM dbo.Phong p

                OUTER APPLY
                (
                    SELECT TOP 1 ct.MaPhong
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
                ) booking

                WHERE p.MaLoaiPhong = lp.MaLoaiPhong
            ) s

            WHERE lp.TrangThai = 1
              AND lp.SucChuaNguoiLon >= @Adults
              AND lp.SucChuaTreEm >= @Children

            ORDER BY lp.GiaCoBan
            """;

        var rooms = new List<object>();

        if (_db.State != ConnectionState.Open)
        {
            await _db.OpenAsync();
        }

        using var cmd = new SqlCommand(sql, _db);

        cmd.Parameters.Add(
            "@CheckIn",
            SqlDbType.Date
        ).Value = start;

        cmd.Parameters.Add(
            "@CheckOut",
            SqlDbType.Date
        ).Value = end;

        cmd.Parameters.Add(
            "@Adults",
            SqlDbType.Int
        ).Value = adults;

        cmd.Parameters.Add(
            "@Children",
            SqlDbType.Int
        ).Value = children;

        using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            rooms.Add(new
            {
                maLoaiPhong = reader.GetInt32(0),
                tenLoaiPhong = reader.GetString(1),
                moTa = reader.IsDBNull(2)
                    ? ""
                    : reader.GetString(2),
                sucChuaNguoiLon = reader.GetInt32(3),
                sucChuaTreEm = reader.GetInt32(4),
                dienTich = reader.IsDBNull(5)
                    ? (decimal?)null
                    : Convert.ToDecimal(reader.GetValue(5)),
                soGiuong = reader.IsDBNull(6)
                    ? 0
                    : Convert.ToInt32(reader.GetValue(6)),
                loaiGiuong = reader.IsDBNull(7)
                    ? ""
                    : reader.GetString(7),
                giaCoBan = Convert.ToDecimal(reader.GetValue(8)),
                hinhAnh = reader.IsDBNull(9)
                    ? ""
                    : reader.GetString(9),
                tongPhong = reader.GetInt32(10),
                phongConTrong = reader.GetInt32(11)
            });
        }

        return Ok(new
        {
            success = true,
            danhSach = rooms
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetRoomDetail(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Mã loại phòng không hợp lệ."
            });
        }

        if (_db.State != ConnectionState.Open)
        {
            await _db.OpenAsync();
        }

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
                GiaCoBan
            FROM dbo.LoaiPhong
            WHERE MaLoaiPhong = @Id
              AND TrangThai = 1
            """;

        object? room = null;

        using (var cmd = new SqlCommand(sql, _db))
        {
            cmd.Parameters.Add(
                "@Id",
                SqlDbType.Int
            ).Value = id;

            using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return NotFound(new
                {
                    message = "Không tìm thấy loại phòng."
                });
            }

            room = new
            {
                maLoaiPhong = reader.GetInt32(0),
                tenLoaiPhong = reader.GetString(1),
                moTa = reader.IsDBNull(2)
                    ? ""
                    : reader.GetString(2),
                sucChuaNguoiLon = reader.GetInt32(3),
                sucChuaTreEm = reader.GetInt32(4),
                dienTich = reader.IsDBNull(5)
                    ? (decimal?)null
                    : Convert.ToDecimal(reader.GetValue(5)),
                soGiuong = reader.IsDBNull(6)
                    ? 0
                    : Convert.ToInt32(reader.GetValue(6)),
                loaiGiuong = reader.IsDBNull(7)
                    ? ""
                    : reader.GetString(7),
                giaCoBan = Convert.ToDecimal(reader.GetValue(8))
            };
        }

        var images = new List<string>();

        const string imageSql = """
            SELECT DuongDan
            FROM dbo.HinhAnhPhong
            WHERE MaLoaiPhong = @Id
            ORDER BY AnhDaiDien DESC, MaHinhAnh
            """;

        using (var cmd = new SqlCommand(imageSql, _db))
        {
            cmd.Parameters.Add(
                "@Id",
                SqlDbType.Int
            ).Value = id;

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                if (!reader.IsDBNull(0))
                {
                    images.Add(reader.GetString(0));
                }
            }
        }

        var amenities = new List<string>();

        const string amenitySql = """
            SELECT tn.TenTienNghi
            FROM dbo.PhongTienNghi pt
            INNER JOIN dbo.TienNghi tn
                ON tn.MaTienNghi = pt.MaTienNghi
            WHERE pt.MaLoaiPhong = @Id
              AND tn.TrangThai = 1
            ORDER BY tn.TenTienNghi
            """;

        using (var cmd = new SqlCommand(amenitySql, _db))
        {
            cmd.Parameters.Add(
                "@Id",
                SqlDbType.Int
            ).Value = id;

            using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                amenities.Add(reader.GetString(0));
            }
        }

        return Ok(new
        {
            success = true,
            room,
            images,
            amenities
        });
    }
}
