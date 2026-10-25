using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = "Staff")]
public class StaffController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IAntiforgery _antiforgery;

    public StaffController(
        SqlConnection db,
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

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        const string sql = """
            SELECT
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Chờ xác nhận'),
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE NgayNhanPhong = CAST(GETDATE() AS date)
                   AND TrangThai IN
                   (N'Đã xác nhận', N'Đã đặt cọc')),
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Đã nhận phòng'),
                (SELECT COUNT(*) FROM dbo.Phong
                 WHERE TrangThai = N'Đang dọn')
            """;

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();

        return Ok(new
        {
            pending = r.GetInt32(0),
            arrivalsToday = r.GetInt32(1),
            checkedIn = r.GetInt32(2),
            cleaning = r.GetInt32(3)
        });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings()
    {
        const string sql = """
            SELECT dp.MaDatPhong, kh.HoTen,
                   p.SoPhong, lp.TenLoaiPhong,
                   dp.NgayNhanPhong, dp.NgayTraPhong,
                   dp.TrangThai
            FROM dbo.DatPhong dp
            JOIN dbo.KhachHang kh
              ON dp.MaKhachHang = kh.MaKhachHang
            JOIN dbo.ChiTietDatPhong ct
              ON dp.MaDatPhong = ct.MaDatPhong
            JOIN dbo.Phong p
              ON ct.MaPhong = p.MaPhong
            JOIN dbo.LoaiPhong lp
              ON p.MaLoaiPhong = lp.MaLoaiPhong
            ORDER BY dp.MaDatPhong DESC
            """;

        var items = new List<object>();
        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        using var r = await cmd.ExecuteReaderAsync();

        while (await r.ReadAsync())
        {
            items.Add(new
            {
                id = r.GetInt32(0),
                customer = r.GetString(1),
                roomNumber = r.GetString(2),
                roomType = r.GetString(3),
                checkIn = r.GetDateTime(4),
                checkOut = r.GetDateTime(5),
                status = r.GetString(6)
            });
        }

        return Ok(new { items });
    }

    [HttpPost("bookings/{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        const string sql = """
            UPDATE dbo.DatPhong
            SET TrangThai = N'Đã xác nhận',
                NgayXacNhan = SYSDATETIME(),
                MaNhanVienXacNhan = (
                    SELECT TOP 1 nv.MaNhanVien
                    FROM dbo.NhanVien nv
                    WHERE nv.MaTaiKhoan = @AccountId
                )
            WHERE MaDatPhong = @Id
              AND TrangThai = N'Chờ xác nhận'
              AND NgayNhanPhong >= CAST(GETDATE() AS date)
            """;

        int? accountId = AccountId();
        if (accountId == null) return Unauthorized();

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
        cmd.Parameters.Add("@AccountId", SqlDbType.Int)
            .Value = accountId.Value;

        int count = await cmd.ExecuteNonQueryAsync();

        return count == 0
            ? BadRequest(new { message = "Không thể xác nhận đơn này." })
            : Ok(new { success = true, message = "Đã xác nhận đơn." });
    }

    [HttpPost("bookings/{id:int}/check-in")]
    public async Task<IActionResult> CheckIn(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        await _db.OpenAsync();
        using var tx = (SqlTransaction)await _db.BeginTransactionAsync(
            IsolationLevel.Serializable);

        try
        {
            const string sql = """
                UPDATE dp
                SET dp.TrangThai = N'Đã nhận phòng'
                OUTPUT INSERTED.MaDatPhong
                FROM dbo.DatPhong dp
                WHERE dp.MaDatPhong = @Id
                  AND dp.TrangThai IN
                    (N'Đã xác nhận', N'Đã đặt cọc')
                  AND dp.NgayNhanPhong <= CAST(GETDATE() AS date)
                  AND dp.NgayTraPhong > CAST(GETDATE() AS date)
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM dbo.ChiTietDatPhong ct
                      JOIN dbo.Phong p
                        ON p.MaPhong = ct.MaPhong
                      WHERE ct.MaDatPhong = dp.MaDatPhong
                        AND p.TrangThai <> N'Trống'
                  )
                """;

            using var cmd = new SqlCommand(sql, _db, tx);
            cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;

            object? updated = await cmd.ExecuteScalarAsync();

            if (updated == null)
            {
                await tx.RollbackAsync();
                return BadRequest(new
                {
                    message = "Chưa thể nhận phòng. Kiểm tra lịch và trạng thái phòng."
                });
            }

            using var roomCmd = new SqlCommand("""
                UPDATE p
                SET p.TrangThai = N'Đang sử dụng'
                FROM dbo.Phong p
                JOIN dbo.ChiTietDatPhong ct
                  ON ct.MaPhong = p.MaPhong
                WHERE ct.MaDatPhong = @Id
                """, _db, tx);

            roomCmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
            await roomCmd.ExecuteNonQueryAsync();

            await tx.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Nhận phòng thành công."
            });
        }
        catch
        {
            await SafeRollback(tx);
            throw;
        }
    }

    [HttpPost("bookings/{id:int}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        await _db.OpenAsync();
        using var tx = (SqlTransaction)await _db.BeginTransactionAsync(
            IsolationLevel.Serializable);

        try
        {
            using var cmd = new SqlCommand("""
                UPDATE dbo.DatPhong
                SET TrangThai = N'Đã trả phòng'
                OUTPUT INSERTED.MaDatPhong
                WHERE MaDatPhong = @Id
                  AND TrangThai = N'Đã nhận phòng'
                """, _db, tx);

            cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;

            object? updated = await cmd.ExecuteScalarAsync();

            if (updated == null)
            {
                await tx.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn không ở trạng thái đã nhận phòng."
                });
            }

            using var roomCmd = new SqlCommand("""
                UPDATE p
                SET p.TrangThai = N'Đang dọn'
                FROM dbo.Phong p
                JOIN dbo.ChiTietDatPhong ct
                  ON ct.MaPhong = p.MaPhong
                WHERE ct.MaDatPhong = @Id
                """, _db, tx);

            roomCmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
            await roomCmd.ExecuteNonQueryAsync();

            await tx.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Trả phòng thành công. Phòng chuyển sang đang dọn."
            });
        }
        catch
        {
            await SafeRollback(tx);
            throw;
        }
    }

    private static async Task SafeRollback(SqlTransaction tx)
    {
        try
        {
            await tx.RollbackAsync();
        }
        catch (InvalidOperationException) { }
        catch (SqlException) { }
    }
}
