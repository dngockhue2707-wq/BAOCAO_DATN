
using System.Security.Claims;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Staff")]
[Route("api/staff/account")]
public class StaffAccountController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly IAntiforgery _antiforgery;

    public StaffAccountController(
        HotelDbContext db,
        IPasswordHasher<object> hasher,
        IAntiforgery antiforgery)
    {
        _db = db;
        _hasher = hasher;
        _antiforgery = antiforgery;
    }

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
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

    public sealed class UpdateProfileInput
    {
        public string? HoTen { get; set; }
        public string? SoDienThoai { get; set; }
        public string? Email { get; set; }
        public string? DiaChi { get; set; }
    }

    public sealed class ChangePasswordInput
    {
        public string? MatKhauCu { get; set; }
        public string? MatKhauMoi { get; set; }
        public string? XacNhanMatKhau { get; set; }
    }

    [HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var profile = await (
            from employee in _db.Set<NhanVien>()
            join account in _db.Set<TaiKhoan>()
                on employee.MaTaiKhoan equals account.MaTaiKhoan
            where account.MaTaiKhoan == accountId.Value
                  && account.TrangThai
                  && employee.TrangThai
            select new
            {
                id = employee.MaNhanVien,
                username = account.TenDangNhap,
                fullName = employee.HoTen,
                phone = employee.SoDienThoai,
                email = employee.Email,
                address = employee.DiaChi,
                position = employee.ChucVu,
                startDate = employee.NgayVaoLam,
                active = employee.TrangThai,
                createdAt = account.NgayTao
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        if (profile == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy hồ sơ nhân viên đang hoạt động."
            });
        }

        Response.Headers.CacheControl = "no-store";

        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileInput input)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        string name = input.HoTen?.Trim() ?? "";
        string phone = input.SoDienThoai?.Trim() ?? "";
        string email = input.Email?.Trim() ?? "";
        string address = input.DiaChi?.Trim() ?? "";

        if (name.Length < 2 || name.Length > 100)
        {
            return BadRequest(new
            {
                message = "Họ tên phải có từ 2 đến 100 ký tự."
            });
        }

        if (phone.Length > 20 ||
            (phone.Length > 0 &&
             !Regex.IsMatch(phone, @"^\+?[0-9]{9,15}$")))
        {
            return BadRequest(new
            {
                message = "Số điện thoại không hợp lệ."
            });
        }

        if (email.Length > 150)
        {
            return BadRequest(new
            {
                message = "Email không được vượt quá 150 ký tự."
            });
        }

        if (email.Length > 0 &&
            (!MailAddress.TryCreate(email, out var parsedEmail) ||
             !string.Equals(
                 parsedEmail.Address,
                 email,
                 StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new
            {
                message = "Địa chỉ email không hợp lệ."
            });
        }

        if (address.Length > 255)
        {
            return BadRequest(new
            {
                message = "Địa chỉ không được vượt quá 255 ký tự."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        var account = await _db.Set<TaiKhoan>()
            .FirstOrDefaultAsync(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai);

        var employee = await _db.Set<NhanVien>()
            .FirstOrDefaultAsync(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai);

        if (account == null || employee == null)
        {
            return NotFound(new
            {
                message = "Tài khoản nhân viên không còn hoạt động."
            });
        }

        if (email.Length > 0)
        {
            bool emailExists = await _db.Set<TaiKhoan>()
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaTaiKhoan != accountId.Value &&
                    x.Email != null &&
                    x.Email == email);

            if (emailExists)
            {
                return Conflict(new
                {
                    message = "Email đã được sử dụng bởi tài khoản khác."
                });
            }
        }

        employee.HoTen = name;
        employee.SoDienThoai =
            phone.Length == 0 ? null : phone;
        employee.Email =
            email.Length == 0 ? null : email;
        employee.DiaChi =
            address.Length == 0 ? null : address;

        account.Email =
            email.Length == 0 ? null : email;

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật thông tin cá nhân thành công."
        });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordInput input)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        string oldPassword = input.MatKhauCu ?? "";
        string newPassword = input.MatKhauMoi ?? "";
        string confirmPassword = input.XacNhanMatKhau ?? "";

        if (string.IsNullOrEmpty(oldPassword))
        {
            return BadRequest(new
            {
                message = "Vui lòng nhập mật khẩu hiện tại."
            });
        }

        if (newPassword.Length < 12 || newPassword.Length > 128)
        {
            return BadRequest(new
            {
                message = "Mật khẩu mới phải từ 12 đến 128 ký tự."
            });
        }

        if (newPassword != confirmPassword)
        {
            return BadRequest(new
            {
                message = "Xác nhận mật khẩu không khớp."
            });
        }

        if (oldPassword == newPassword)
        {
            return BadRequest(new
            {
                message = "Mật khẩu mới phải khác mật khẩu hiện tại."
            });
        }

        var account = await _db.Set<TaiKhoan>()
            .FirstOrDefaultAsync(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai);

        var employeeActive = await _db.Set<NhanVien>()
            .AnyAsync(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai);

        if (account == null || !employeeActive)
        {
            return Unauthorized(new
            {
                message = "Tài khoản nhân viên không còn hoạt động."
            });
        }

        PasswordVerificationResult verification;

        try
        {
            verification = _hasher.VerifyHashedPassword(
                new object(),
                account.MatKhau,
                oldPassword
            );
        }
        catch (FormatException)
        {
            verification = PasswordVerificationResult.Failed;
        }

        if (verification == PasswordVerificationResult.Failed)
        {
            return BadRequest(new
            {
                message = "Mật khẩu hiện tại không chính xác."
            });
        }

        account.MatKhau = _hasher.HashPassword(
            new object(),
            newPassword
        );

        await _db.SaveChangesAsync();

        await HttpContext.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        return Ok(new
        {
            success = true,
            message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
            redirectUrl = "/login.html"
        });
    }
}
