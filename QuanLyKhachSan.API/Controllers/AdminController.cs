using System.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

public class AdminRoomStatusDto
{
    public string Status { get; set; } = "";
}

public class AdminBookingStatusDto
{
    public string Status { get; set; } = "";
}

public class AdminEmployeeUpdateDto
{
    public string Name { get; set; } = "";
    public string Position { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool Active { get; set; } = true;
}

public class AdminServiceDto
{
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal Price { get; set; }
    public string Description { get; set; } = "";
    public bool Active { get; set; } = true;
}

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IAntiforgery _antiforgery;

    public AdminController(
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

    // TỔNG QUAN
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        const string sql = """
            SELECT
                (SELECT COUNT(*) FROM dbo.Phong),
                (SELECT COUNT(*) FROM dbo.Phong
                 WHERE TrangThai = N'Trống'),
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Chờ xác nhận'),
                (SELECT COUNT(*) FROM dbo.KhachHang),
                (SELECT COUNT(*) FROM dbo.NhanVien),
                (SELECT COUNT(*) FROM dbo.DichVu
                 WHERE TrangThai = 1)
            """;

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        using var r = await cmd.ExecuteReaderAsync();
        await r.ReadAsync();

        return Ok(new
        {
            totalRooms = r.GetInt32(0),
            availableRooms = r.GetInt32(1),
            pendingBookings = r.GetInt32(2),
            totalCustomers = r.GetInt32(3),
            totalEmployees = r.GetInt32(4),
            activeServices = r.GetInt32(5)
        });
    }

    // DANH SÁCH PHÒNG
    [HttpGet("rooms")]
    public async Task<IActionResult> Rooms()
    {
        const string sql = """
            SELECT p.MaPhong, p.SoPhong, p.Tang,
                   p.TrangThai, lp.TenLoaiPhong
            FROM dbo.Phong p
            JOIN dbo.LoaiPhong lp
              ON p.MaLoaiPhong = lp.MaLoaiPhong
            ORDER BY p.Tang, p.SoPhong
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
                number = r.GetString(1),
                floor = r.IsDBNull(2) ? 0 :
                    Convert.ToInt32(r.GetValue(2)),
                status = r.GetString(3),
                type = r.GetString(4)
            });
        }

        return Ok(new { items });
    }

    // CẬP NHẬT TRẠNG THÁI PHÒNG
    [HttpPut("rooms/{id:int}/status")]
    public async Task<IActionResult> UpdateRoomStatus(
        int id,
        [FromBody] AdminRoomStatusDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        var allowed = new[]
        {
            "Trống", "Đang sử dụng", "Đang dọn",
            "Bảo trì", "Ngừng hoạt động"
        };

        if (!allowed.Contains(dto.Status))
            return BadRequest(new
            {
                message = "Trạng thái không hợp lệ."
            });

        const string sql = """
            UPDATE p
            SET TrangThai = @Status
            FROM dbo.Phong p
            WHERE p.MaPhong = @Id
              AND NOT EXISTS
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
                    AND @Status IN
                    (
                        N'Bảo trì', N'Ngừng hoạt động'
                    )
              )
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
        cmd.Parameters.Add("@Status", SqlDbType.NVarChar, 50)
            .Value = dto.Status;

        int count = await cmd.ExecuteNonQueryAsync();

        return count == 0
            ? BadRequest(new
            {
                message = "Không thể sửa trạng thái phòng này."
            })
            : Ok(new
            {
                success = true,
                message = "Đã cập nhật phòng."
            });
    }

    // DANH SÁCH ĐẶT PHÒNG
    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings()
    {
        const string sql = """
            SELECT dp.MaDatPhong, kh.HoTen,
                   p.SoPhong, lp.TenLoaiPhong,
                   dp.NgayNhanPhong, dp.NgayTraPhong,
                   dp.TrangThai, ct.ThanhTien
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
                status = r.GetString(6),
                total = Convert.ToDecimal(r.GetValue(7))
            });
        }

        return Ok(new { items });
    }

    // DUYỆT HOẶC HỦY ĐƠN CHỜ XÁC NHẬN
    [HttpPut("bookings/{id:int}/status")]
    public async Task<IActionResult> UpdateBookingStatus(
        int id,
        [FromBody] AdminBookingStatusDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        if (dto.Status != "Đã xác nhận" &&
            dto.Status != "Đã hủy")
            return BadRequest(new
            {
                message = "Chỉ hỗ trợ xác nhận hoặc hủy đơn."
            });

        const string sql = """
            UPDATE dbo.DatPhong
            SET TrangThai = @Status,
                NgayXacNhan = CASE
                    WHEN @Status = N'Đã xác nhận'
                    THEN SYSDATETIME()
                    ELSE NgayXacNhan END,
                LyDoHuy = CASE
                    WHEN @Status = N'Đã hủy'
                    THEN N'Quản trị viên hủy'
                    ELSE LyDoHuy END
            WHERE MaDatPhong = @Id
              AND TrangThai = N'Chờ xác nhận'
              AND NgayNhanPhong >= CAST(GETDATE() AS date)
            """;

        await _db.OpenAsync();
        using var cmd = new SqlCommand(sql, _db);
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;
        cmd.Parameters.Add("@Status", SqlDbType.NVarChar, 50)
            .Value = dto.Status;

        int count = await cmd.ExecuteNonQueryAsync();

        return count == 0
            ? BadRequest(new
            {
                message = "Đơn không còn chờ xác nhận."
            })
            : Ok(new
            {
                success = true,
                message = "Đã cập nhật đặt phòng."
            });
    }

    // KHÁCH HÀNG
    [HttpGet("customers")]
    public async Task<IActionResult> Customers()
    {
        const string sql = """
            SELECT kh.MaKhachHang, kh.HoTen,
                   kh.SoDienThoai, kh.Email,
                   kh.DiaChi, kh.NgayTao,
                   ISNULL(tk.TenDangNhap, N'')
            FROM dbo.KhachHang kh
            LEFT JOIN dbo.TaiKhoan tk
              ON kh.MaTaiKhoan = tk.MaTaiKhoan
            ORDER BY kh.MaKhachHang DESC
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
                name = r.IsDBNull(1) ? "" : r.GetString(1),
                phone = r.IsDBNull(2) ? "" : r.GetString(2),
                email = r.IsDBNull(3) ? "" : r.GetString(3),
                address = r.IsDBNull(4) ? "" : r.GetString(4),
                createdAt = r.GetDateTime(5),
                username = r.GetString(6)
            });
        }

        return Ok(new { items });
    }

    // NHÂN VIÊN
    [HttpGet("employees")]
    public async Task<IActionResult> Employees()
    {
        const string sql = """
            SELECT nv.MaNhanVien, nv.HoTen,
                nv.SoDienThoai, nv.Email,
                nv.ChucVu, nv.TrangThai,
                tk.TenDangNhap,
                CASE
                    WHEN tk.TenDangNhap = N'admin_dnk'
                    THEN N'Admin'
                    ELSE N'NhanVien'
                END AS Role
            FROM dbo.NhanVien nv
            JOIN dbo.TaiKhoan tk
            ON nv.MaTaiKhoan = tk.MaTaiKhoan
            ORDER BY nv.MaNhanVien DESC
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
                name = r.IsDBNull(1) ? "" : r.GetString(1),
                phone = r.IsDBNull(2) ? "" : r.GetString(2),
                email = r.IsDBNull(3) ? "" : r.GetString(3),
                position = r.IsDBNull(4) ? "" : r.GetString(4),
                active = r.GetBoolean(5),
                username = r.GetString(6),
                role = r.GetString(7)
            });
        }

        return Ok(new { items });
    }

    [HttpPut("employees/{id:int}")]
    public async Task<IActionResult> UpdateEmployee(
        int id,
        [FromBody] AdminEmployeeUpdateDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        if (dto == null ||
            string.IsNullOrWhiteSpace(dto.Name) ||
            string.IsNullOrWhiteSpace(dto.Position) ||
            dto.Name.Length > 100 ||
            dto.Position.Length > 100 ||
            (dto.Phone?.Length ?? 0) > 20 ||
            (dto.Email?.Length ?? 0) > 150)
        {
            return BadRequest(new
            {
                message = "Thông tin nhân viên không hợp lệ."
            });
        }

        const string sql = """
            UPDATE nv
            SET
                nv.HoTen = @Name,
                nv.ChucVu = @Position,
                nv.SoDienThoai = @Phone,
                nv.Email = @Email,
                nv.TrangThai = @Active
            FROM dbo.NhanVien nv
            INNER JOIN dbo.TaiKhoan tk
                ON nv.MaTaiKhoan = tk.MaTaiKhoan
            INNER JOIN dbo.VaiTro vt
                ON tk.MaVaiTro = vt.MaVaiTro
            WHERE nv.MaNhanVien = @Id
            AND vt.TenVaiTro = 'NhanVien'
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);

        cmd.Parameters.Add("@Id", SqlDbType.Int)
            .Value = id;

        cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 100)
            .Value = dto.Name.Trim();

        cmd.Parameters.Add("@Position", SqlDbType.NVarChar, 100)
            .Value = dto.Position.Trim();

        cmd.Parameters.Add("@Phone", SqlDbType.VarChar, 20)
            .Value = string.IsNullOrWhiteSpace(dto.Phone)
                ? DBNull.Value
                : dto.Phone.Trim();

        cmd.Parameters.Add("@Email", SqlDbType.VarChar, 150)
            .Value = string.IsNullOrWhiteSpace(dto.Email)
                ? DBNull.Value
                : dto.Email.Trim();

        cmd.Parameters.Add("@Active", SqlDbType.Bit)
            .Value = dto.Active;

        int affected = await cmd.ExecuteNonQueryAsync();

        if (affected == 0)
        {
            return NotFound(new
            {
                message = "Không tìm thấy nhân viên NhanVien được phép sửa."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật thông tin và trạng thái nhân viên."
        });
    }

    // DỊCH VỤ
    [HttpGet("services")]
    public async Task<IActionResult> Services()
    {
        const string sql = """
            SELECT MaDichVu, TenDichVu, DonViTinh,
                   DonGia, MoTa, TrangThai
            FROM dbo.DichVu
            ORDER BY MaDichVu DESC
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
                name = r.GetString(1),
                unit = r.IsDBNull(2) ? "" : r.GetString(2),
                price = Convert.ToDecimal(r.GetValue(3)),
                description = r.IsDBNull(4) ? "" : r.GetString(4),
                active = r.GetBoolean(5)
            });
        }

        return Ok(new { items });
    }

    // THÊM DỊCH VỤ
    [HttpPost("services")]
    public async Task<IActionResult> CreateService(
        [FromBody] AdminServiceDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        if (string.IsNullOrWhiteSpace(dto.Name) ||
            dto.Name.Length > 150 ||
            dto.Unit.Length > 50 ||
            dto.Description.Length > 1000 ||
            dto.Price < 0 || dto.Price > 1000000000)
            return BadRequest(new
            {
                message = "Thông tin dịch vụ không hợp lệ."
            });

        const string sql = """
            INSERT INTO dbo.DichVu
                (TenDichVu, DonViTinh, DonGia, MoTa, TrangThai)
            VALUES
                (@Name, @Unit, @Price, @Description, @Active)
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        AddServiceParameters(cmd, dto);
        await cmd.ExecuteNonQueryAsync();

        return Ok(new
        {
            success = true,
            message = "Đã thêm dịch vụ."
        });
    }

    // SỬA DỊCH VỤ
    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(
        int id,
        [FromBody] AdminServiceDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new { message = "Mã bảo vệ không hợp lệ." });

        if (string.IsNullOrWhiteSpace(dto.Name) ||
            dto.Name.Length > 150 ||
            dto.Unit.Length > 50 ||
            dto.Description.Length > 1000 ||
            dto.Price < 0 || dto.Price > 1000000000)
            return BadRequest(new
            {
                message = "Thông tin dịch vụ không hợp lệ."
            });

        const string sql = """
            UPDATE dbo.DichVu
            SET TenDichVu = @Name,
                DonViTinh = @Unit,
                DonGia = @Price,
                MoTa = @Description,
                TrangThai = @Active
            WHERE MaDichVu = @Id
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        AddServiceParameters(cmd, dto);
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id;

        int count = await cmd.ExecuteNonQueryAsync();

        return count == 0
            ? NotFound(new { message = "Không tìm thấy dịch vụ." })
            : Ok(new { success = true, message = "Đã cập nhật dịch vụ." });
    }

    private static void AddServiceParameters(
        SqlCommand cmd, AdminServiceDto dto)
    {
        cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 150)
            .Value = dto.Name.Trim();
        cmd.Parameters.Add("@Unit", SqlDbType.NVarChar, 50)
            .Value = dto.Unit.Trim();

        var price = cmd.Parameters.Add(
            "@Price", SqlDbType.Decimal);
        price.Precision = 18;
        price.Scale = 2;
        price.Value = dto.Price;

        cmd.Parameters.Add("@Description", SqlDbType.NVarChar, 1000)
            .Value = dto.Description.Trim();
        cmd.Parameters.Add("@Active", SqlDbType.Bit)
            .Value = dto.Active;
    }

    // HÓA ĐƠN
    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        const string sql = """
            SELECT hd.MaHoaDon, hd.MaDatPhong,
                   kh.HoTen, hd.NgayLap,
                   hd.TienPhong, hd.TienDichVu,
                   hd.TienDatCoc, hd.GiamGia,
                   hd.TongTien, hd.SoTienConLai,
                   hd.TrangThai
            FROM dbo.HoaDon hd
            JOIN dbo.DatPhong dp
              ON hd.MaDatPhong = dp.MaDatPhong
            JOIN dbo.KhachHang kh
              ON dp.MaKhachHang = kh.MaKhachHang
            ORDER BY hd.MaHoaDon DESC
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
                bookingId = r.GetInt32(1),
                customer = r.GetString(2),
                date = r.GetDateTime(3),
                roomAmount = Convert.ToDecimal(r.GetValue(4)),
                serviceAmount = Convert.ToDecimal(r.GetValue(5)),
                deposit = Convert.ToDecimal(r.GetValue(6)),
                discount = Convert.ToDecimal(r.GetValue(7)),
                total = Convert.ToDecimal(r.GetValue(8)),
                remaining = Convert.ToDecimal(r.GetValue(9)),
                status = r.IsDBNull(10) ? "" : r.GetString(10)
            });
        }

        return Ok(new { items });
    }

    // BÁO CÁO
    [HttpGet("reports")]
    public async Task<IActionResult> Reports()
    {
        const string sql = """
            SELECT
                (SELECT COUNT(*) FROM dbo.DatPhong),
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Đã trả phòng'),
                (SELECT COUNT(*) FROM dbo.DatPhong
                 WHERE TrangThai = N'Đã hủy'),
                (SELECT ISNULL(SUM(TongTien), 0)
                 FROM dbo.HoaDon),
                (SELECT ISNULL(SUM(SoTien), 0)
                 FROM dbo.ThanhToan
                 WHERE TrangThai IN
                    (N'Thành công', N'Đã thanh toán'))
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        using var r = await cmd.ExecuteReaderAsync();

        await r.ReadAsync();

        return Ok(new
        {
            totalBookings = r.GetInt32(0),
            completedBookings = r.GetInt32(1),
            cancelledBookings = r.GetInt32(2),
            invoicedAmount = Convert.ToDecimal(r.GetValue(3)),
            receivedAmount = Convert.ToDecimal(r.GetValue(4))
        });
    }
}
