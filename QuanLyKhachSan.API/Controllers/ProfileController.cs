
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

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
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public ProfileController(
        HotelDbContext db,
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

        if (!id.HasValue)
            return Unauthorized();

        var profile = await _db.Set<KhachHang>()
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == id.Value)
            .Select(x => new
            {
                fullName = x.HoTen,
                phone = x.SoDienThoai ?? "",
                email = x.Email ?? "",
                address = x.DiaChi ?? "",
                username = x.MaTaiKhoanNavigation != null
                    ? x.MaTaiKhoanNavigation.TenDangNhap
                    : ""
            })
            .FirstOrDefaultAsync();

        if (profile == null)
        {
            return NotFound(new
            {
                message = "Chưa có hồ sơ khách hàng."
            });
        }

        return Ok(profile);
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

        if (!id.HasValue)
            return Unauthorized();

        string name = dto.FullName?.Trim() ?? "";
        string phone = dto.Phone?.Trim() ?? "";
        string address = dto.Address?.Trim() ?? "";

        if (name.Length < 2 ||
            name.Length > 100 ||
            phone.Length > 20 ||
            address.Length > 255)
        {
            return BadRequest(new
            {
                message = "Thông tin cá nhân không hợp lệ."
            });
        }

        var customer = await _db.Set<KhachHang>()
            .FirstOrDefaultAsync(x =>
                x.MaTaiKhoan == id.Value);

        if (customer == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy hồ sơ."
            });
        }

        customer.HoTen = name;
        customer.SoDienThoai = phone;
        customer.DiaChi = address;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Cập nhật thông tin thành công!"
        });
    }
}
