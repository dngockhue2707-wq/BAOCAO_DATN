
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Data.SqlClient;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Staff")]
[Route("api/staff/operations")]
public class StaffOperationsController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public StaffOperationsController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
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

    private async Task<int?> EmployeeId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out int accountId))
            return null;

        return await _db.Set<NhanVien>()
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId)
            .Select(x => (int?)x.MaNhanVien)
            .FirstOrDefaultAsync();
    }

    private SqlConnection Connection()
    {
        return (SqlConnection)_db.Database.GetDbConnection();
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> Rooms()
    {
        var items = await (
            from room in _db.Set<Phong>()
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby room.SoPhong
            select new
            {
                id = room.MaPhong,
                number = room.SoPhong,
                type = type.TenLoaiPhong,
                status = room.TrangThai
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPost("rooms/{id:int}/cleaned")]
    public async Task<IActionResult> MarkCleaned(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        await using var tx = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable);

        var room = await _db.Set<Phong>()
            .FirstOrDefaultAsync(x => x.MaPhong == id);

        if (room == null || room.TrangThai != "Đang dọn")
            return BadRequest(new { message = "Phòng không ở trạng thái đang dọn." });

        bool occupied = await (
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where detail.MaPhong == id &&
                  booking.TrangThai == "Đã nhận phòng"
            select booking.MaDatPhong
        ).AnyAsync();

        if (occupied)
            return Conflict(new { message = "Phòng vẫn có khách đang lưu trú." });

        room.TrangThai = "Trống";
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return Ok(new { message = "Đã hoàn tất dọn phòng." });
    }

    [HttpGet("services")]
    public async Task<IActionResult> Services()
    {
        const string sql = """
            SELECT MaDichVu, TenDichVu, DonViTinh, DonGia
            FROM dbo.DichVu
            WHERE TrangThai = 1
            ORDER BY TenDichVu
            """;

        var items = new List<object>();
        var conn = Connection();
        await conn.OpenAsync();

        try
        {
            await using var cmd = new SqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                items.Add(new
                {
                    id = reader.GetInt32(0),
                    name = reader.GetString(1),
                    unit = reader.GetString(2),
                    price = reader.GetDecimal(3)
                });
            }
        }
        finally
        {
            await conn.CloseAsync();
        }

        return Ok(new { items });
    }

    [HttpGet("service-usage")]
    public async Task<IActionResult> ServiceUsage()
    {
        const string sql = """
            SELECT sd.MaSuDungDichVu, sd.MaDatPhong,
                   p.SoPhong, dv.TenDichVu,
                   sd.SoLuong, sd.DonGia, sd.ThanhTien,
                   sd.ThoiGianSuDung
            FROM dbo.SuDungDichVu sd
            JOIN dbo.Phong p ON sd.MaPhong = p.MaPhong
            JOIN dbo.DichVu dv ON sd.MaDichVu = dv.MaDichVu
            ORDER BY sd.ThoiGianSuDung DESC
            """;

        var items = new List<object>();
        var conn = Connection();
        await conn.OpenAsync();

        try
        {
            await using var cmd = new SqlCommand(sql, conn);
            await using var r = await cmd.ExecuteReaderAsync();

            while (await r.ReadAsync())
            {
                items.Add(new
                {
                    id = r.GetInt32(0),
                    bookingId = r.GetInt32(1),
                    room = r.GetString(2),
                    service = r.GetString(3),
                    quantity = Convert.ToDecimal(r.GetValue(4)),
                    price = r.GetDecimal(5),
                    total = r.GetDecimal(6),
                    date = r.GetDateTime(7)
                });
            }
        }
        finally
        {
            await conn.CloseAsync();
        }

        return Ok(new { items });
    }

    public sealed class UsageInput
    {
        public int BookingId { get; set; }
        public int RoomId { get; set; }
        public int ServiceId { get; set; }
        public int Quantity { get; set; }
    }

    [HttpPost("service-usage")]
    public async Task<IActionResult> AddService([FromBody] UsageInput input)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        if (input.Quantity < 1 || input.Quantity > 100)
            return BadRequest(new { message = "Số lượng không hợp lệ." });

        var employeeId = await EmployeeId();

        if (!employeeId.HasValue)
            return BadRequest(new { message = "Không tìm thấy nhân viên." });

        await using var tx = await _db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable);

        const string sql = """
            DECLARE @Price decimal(18,2);

            IF NOT EXISTS (
                SELECT 1 FROM dbo.DatPhong dp WITH (UPDLOCK, HOLDLOCK)
                JOIN dbo.ChiTietDatPhong ct
                  ON dp.MaDatPhong = ct.MaDatPhong
                WHERE dp.MaDatPhong = @BookingId
                  AND ct.MaPhong = @RoomId
                  AND dp.TrangThai = N'Đã nhận phòng'
            )
                THROW 50001, N'Đơn chưa nhận phòng hoặc không có phòng này.', 1;

            IF EXISTS (
                SELECT 1 FROM dbo.HoaDon
                WHERE MaDatPhong = @BookingId
                  AND TrangThai = N'Đã thanh toán'
            )
                THROW 50002, N'Không thể thêm dịch vụ vào hóa đơn đã thanh toán.', 1;

            SELECT @Price = DonGia
            FROM dbo.DichVu
            WHERE MaDichVu = @ServiceId AND TrangThai = 1;

            IF @Price IS NULL
                THROW 50003, N'Dịch vụ không khả dụng.', 1;

            INSERT dbo.SuDungDichVu (
                MaDatPhong, MaPhong, MaDichVu,
                SoLuong, DonGia, ThanhTien, ThoiGianSuDung
            )
            VALUES (
                @BookingId, @RoomId, @ServiceId,
                @Quantity, @Price, @Price * @Quantity, SYSDATETIME()
            );
            """;

        try
        {
            var conn = Connection();
            await using var cmd = new SqlCommand(sql, conn,
                (SqlTransaction)tx.GetDbTransaction());

            cmd.Parameters.Add("@BookingId", SqlDbType.Int).Value = input.BookingId;
            cmd.Parameters.Add("@RoomId", SqlDbType.Int).Value = input.RoomId;
            cmd.Parameters.Add("@ServiceId", SqlDbType.Int).Value = input.ServiceId;
            cmd.Parameters.Add("@Quantity", SqlDbType.Int).Value = input.Quantity;

            await cmd.ExecuteNonQueryAsync();
            await tx.CommitAsync();

            return Ok(new { message = "Đã ghi nhận dịch vụ sử dụng." });
        }
        catch (SqlException ex) when (ex.Number >= 50000 && ex.Number <= 50003)
        {
            await tx.RollbackAsync();
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        const string sql = """
            SELECT hd.MaHoaDon, hd.MaDatPhong, kh.HoTen,
                   hd.NgayLap, hd.TienPhong, hd.TienDichVu,
                   hd.TienDatCoc, hd.GiamGia, hd.TongTien,
                   hd.SoTienConLai, hd.TrangThai,
                   ISNULL((
                       SELECT SUM(tt.SoTien)
                       FROM dbo.ThanhToan tt
                       WHERE tt.MaHoaDon = hd.MaHoaDon
                         AND tt.TrangThai = N'Thành công'
                   ), 0) AS Paid
            FROM dbo.HoaDon hd
            JOIN dbo.DatPhong dp ON hd.MaDatPhong = dp.MaDatPhong
            JOIN dbo.KhachHang kh ON dp.MaKhachHang = kh.MaKhachHang
            ORDER BY hd.MaHoaDon DESC
            """;

        var items = new List<object>();
        var conn = Connection();
        await conn.OpenAsync();

        try
        {
            await using var cmd = new SqlCommand(sql, conn);
            await using var r = await cmd.ExecuteReaderAsync();

            while (await r.ReadAsync())
            {
                items.Add(new
                {
                    id = r.GetInt32(0),
                    bookingId = r.GetInt32(1),
                    customer = r.GetString(2),
                    date = r.GetDateTime(3),
                    roomAmount = r.GetDecimal(4),
                    serviceAmount = r.GetDecimal(5),
                    deposit = r.GetDecimal(6),
                    discount = r.GetDecimal(7),
                    total = r.GetDecimal(8),
                    remaining = r.GetDecimal(9),
                    status = r.GetString(10),
                    paid = r.GetDecimal(11)
                });
            }
        }
        finally
        {
            await conn.CloseAsync();
        }

        return Ok(new { items });
    }

    [HttpGet("requests")]
    public async Task<IActionResult> Requests()
    {
        const string sql = """
            SELECT MaLienHe, HoTen, Email, SoDienThoai,
                   ChuDe, NoiDung, NgayGui, TrangThai,
                   NoiDungPhanHoi, NgayPhanHoi
            FROM dbo.LienHe
            ORDER BY NgayGui DESC
            """;

        var items = new List<object>();
        var conn = Connection();
        await conn.OpenAsync();

        try
        {
            await using var cmd = new SqlCommand(sql, conn);
            await using var r = await cmd.ExecuteReaderAsync();

            while (await r.ReadAsync())
            {
                items.Add(new
                {
                    id = r.GetInt32(0),
                    customer = r.GetString(1),
                    email = r.IsDBNull(2) ? "" : r.GetString(2),
                    phone = r.IsDBNull(3) ? "" : r.GetString(3),
                    subject = r.GetString(4),
                    content = r.GetString(5),
                    date = r.GetDateTime(6),
                    status = r.GetString(7),
                    reply = r.IsDBNull(8) ? "" : r.GetString(8),
                    repliedAt = r.IsDBNull(9) ? (DateTime?)null : r.GetDateTime(9)
                });
            }
        }
        finally
        {
            await conn.CloseAsync();
        }

        return Ok(new { items });
    }

    public sealed class ReplyInput
    {
        public string Content { get; set; } = "";
    }

    [HttpPost("requests/{id:int}/reply")]
    public async Task<IActionResult> Reply(int id, [FromBody] ReplyInput input)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        string content = input.Content?.Trim() ?? "";

        if (content.Length < 2 || content.Length > 2000)
            return BadRequest(new { message = "Phản hồi phải từ 2 đến 2000 ký tự." });

        int? employeeId = await EmployeeId();

        if (!employeeId.HasValue)
            return BadRequest(new { message = "Không tìm thấy hồ sơ nhân viên." });

        const string sql = """
            UPDATE dbo.LienHe
            SET NoiDungPhanHoi = @Content,
                MaNhanVienPhanHoi = @EmployeeId,
                NgayPhanHoi = SYSDATETIME(),
                TrangThai = N'Đã xử lý'
            WHERE MaLienHe = @Id
            """;

        var conn = Connection();
        await conn.OpenAsync();

        try
        {
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
            cmd.Parameters.Add("@EmployeeId", SqlDbType.Int).Value = employeeId.Value;
            cmd.Parameters.Add("@Content", SqlDbType.NVarChar, 2000).Value = content;

            int affected = await cmd.ExecuteNonQueryAsync();

            if (affected == 0)
                return NotFound(new { message = "Không tìm thấy yêu cầu." });

            return Ok(new { message = "Đã lưu phản hồi cho khách." });
        }
        finally
        {
            await conn.CloseAsync();
        }
    }
}
