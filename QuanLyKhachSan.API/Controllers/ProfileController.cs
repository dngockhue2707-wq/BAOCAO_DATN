
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

public class UpdateProfileDto
{
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Address { get; set; } = "";
}

[ApiController]
[Route("api/profile")]
[Authorize(Roles = "Customer")]
public class ProfileController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IAntiforgery _antiforgery;

    public ProfileController(
        SqlConnection db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        int? id = AccountId();
        if (id == null) return Unauthorized();

        const string sql = """
            SELECT
                kh.HoTen,
                kh.SoDienThoai,
                kh.Email,
                kh.DiaChi,
                tk.TenDangNhap
            FROM dbo.KhachHang kh
            JOIN dbo.TaiKhoan tk
              ON tk.MaTaiKhoan = kh.MaTaiKhoan
            WHERE kh.MaTaiKhoan = @Id
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);
        cmd.Parameters.Add("@Id", SqlDbType.Int).Value = id.Value;

        using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
            return NotFound(new
            {
                message = "Chưa có hồ sơ khách hàng."
            });

        return Ok(new
        {
            fullName = reader.IsDBNull(0) ? "" : reader.GetString(0),
            phone = reader.IsDBNull(1) ? "" : reader.GetString(1),
            email = reader.IsDBNull(2) ? "" : reader.GetString(2),
            address = reader.IsDBNull(3) ? "" : reader.GetString(3),
            username = reader.GetString(4)
        });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileDto dto)
    {
        try
        {
            await _antiforgery.ValidateRequestAsync(HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        int? id = AccountId();
        if (id == null) return Unauthorized();

        string name = dto.FullName?.Trim() ?? "";
        string phone = dto.Phone?.Trim() ?? "";
        string address = dto.Address?.Trim() ?? "";

        if (name.Length < 2 || name.Length > 100 ||
            phone.Length > 20 ||
            address.Length > 255)
        {
            return BadRequest(new
            {
                message = "Thông tin cá nhân không hợp lệ."
            });
        }

        const string sql = """
            UPDATE dbo.KhachHang
            SET HoTen = @FullName,
                SoDienThoai = @Phone,
                DiaChi = @Address
            WHERE MaTaiKhoan = @Id
            """;

        await _db.OpenAsync();

        using var cmd = new SqlCommand(sql, _db);

        cmd.Parameters.Add("@FullName", SqlDbType.NVarChar, 100)
            .Value = name;
        cmd.Parameters.Add("@Phone", SqlDbType.VarChar, 20)
            .Value = phone;
        cmd.Parameters.Add("@Address", SqlDbType.NVarChar, 255)
            .Value = address;
        cmd.Parameters.Add("@Id", SqlDbType.Int)
            .Value = id.Value;

        int affected = await cmd.ExecuteNonQueryAsync();

        if (affected == 0)
            return NotFound(new { message = "Không tìm thấy hồ sơ." });

        return Ok(new
        {
            success = true,
            message = "Cập nhật thông tin thành công!"
        });
    }
}
