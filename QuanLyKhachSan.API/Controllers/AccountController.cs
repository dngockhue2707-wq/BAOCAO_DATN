
using System.Security.Claims;
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

public class RegisterDto
{
    public string HoTen { get; set; } = "";
    public string TenDangNhap { get; set; } = "";
    public string Email { get; set; } = "";
    public string SoDienThoai { get; set; } = "";
    public string MatKhau { get; set; } = "";
}

public class LoginDto
{
    public string TenDangNhap { get; set; } = "";
    public string MatKhau { get; set; } = "";
}

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly IAntiforgery _antiforgery;

    public AccountController(
        HotelDbContext db,
        IPasswordHasher<object> hasher,
        IAntiforgery antiforgery)
    {
        _db = db;
        _hasher = hasher;
        _antiforgery = antiforgery;
    }

    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);

        return Ok(new
        {
            csrfToken = tokens.RequestToken
        });
    }

    private async Task<bool> ValidateCsrfToken()
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

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDto dto)
    {
        if (!await ValidateCsrfToken())
        {
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ. Hãy tải lại trang."
            });
        }

        string fullName = dto.HoTen?.Trim() ?? "";
        string username = dto.TenDangNhap?.Trim() ?? "";
        string email = dto.Email?.Trim() ?? "";
        string phone = dto.SoDienThoai?.Trim() ?? "";
        string password = dto.MatKhau ?? "";

        if (fullName.Length < 2 ||
            fullName.Length > 100 ||
            username.Length < 4 ||
            username.Length > 100 ||
            email.Length > 150 ||
            phone.Length > 20 ||
            !Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$") ||
            !System.Net.Mail.MailAddress.TryCreate(email, out var address) ||
            address.Address != email ||
            password.Length < 12 ||
            password.Length > 128)
        {
            return BadRequest(new
            {
                message = "Thông tin không hợp lệ. " +
                          "Tên đăng nhập cần từ 4 ký tự, " +
                          "mật khẩu tối thiểu 12 ký tự và email hợp lệ."
            });
        }

        var role = await _db.Set<VaiTro>()
            .AsNoTracking()
            .Where(x =>
                x.TenVaiTro == "KhachHang" ||
                x.TenVaiTro == "Khách hàng" ||
                x.TenVaiTro == "Khach Hang")
            .OrderBy(x => x.MaVaiTro)
            .FirstOrDefaultAsync();

        if (role == null)
        {
            return StatusCode(500, new
            {
                message = "Chưa thiết lập vai trò khách hàng trong SQL Server."
            });
        }

        bool usernameExists = await _db.Set<TaiKhoan>()
            .AnyAsync(x => x.TenDangNhap == username);

        if (usernameExists)
        {
            return Conflict(new
            {
                message = "Tên đăng nhập đã tồn tại."
            });
        }

        string passwordHash = _hasher.HashPassword(
            new object(),
            password
        );

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        try
        {
            var account = new TaiKhoan
            {
                TenDangNhap = username,
                MatKhau = passwordHash,
                Email = email,
                MaVaiTro = role.MaVaiTro,
                TrangThai = true,
                NgayTao = DateTime.Now
            };

            _db.Set<TaiKhoan>().Add(account);
            await _db.SaveChangesAsync();

            var customer = new KhachHang
            {
                MaTaiKhoan = account.MaTaiKhoan,
                HoTen = fullName,
                SoDienThoai = phone,
                Email = email,
                NgayTao = DateTime.Now
            };

            _db.Set<KhachHang>().Add(customer);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Đăng ký thành công! Bạn có thể đăng nhập."
            });
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message = "Tên đăng nhập đã tồn tại."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto dto)
    {
        if (!await ValidateCsrfToken())
        {
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ. Hãy tải lại trang."
            });
        }

        string username = dto.TenDangNhap?.Trim() ?? "";
        string password = dto.MatKhau ?? "";

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new
            {
                message = "Vui lòng nhập tên đăng nhập và mật khẩu."
            });
        }

        var account = await _db.Set<TaiKhoan>()
            .AsNoTracking()
            .Include(x => x.MaVaiTroNavigation)
            .FirstOrDefaultAsync(x =>
                x.TenDangNhap == username);

        if (account == null)
        {
            return Unauthorized(new
            {
                message = "Tên đăng nhập hoặc mật khẩu không đúng."
            });
        }

        if (!account.TrangThai)
        {
            return Unauthorized(new
            {
                message = "Tài khoản của bạn đã ngừng hoạt động. Vui lòng liên hệ quản trị viên DNK Hotel để được hỗ trợ."
            });
        }

        PasswordVerificationResult verificationResult;

        try
        {
            verificationResult = _hasher.VerifyHashedPassword(
                new object(),
                account.MatKhau,
                password
            );
        }
        catch (FormatException)
        {
            verificationResult = PasswordVerificationResult.Failed;
        }

        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "Tên đăng nhập hoặc mật khẩu không đúng."
            });
        }

        string roleName =
            account.MaVaiTroNavigation.TenVaiTro;

        string role = roleName.Trim().ToLowerInvariant() switch
        {
            "admin" or "quản trị" or "quản trị viên"
                => "Admin",

            "nhanvien" or "nhân viên" or "lễ tân"
                => "Staff",

            "khachhang" or "khách hàng"
                => "Customer",

            _ => ""
        };

        if (role == "")
        {
            return StatusCode(403, new
            {
                message = "Vai trò tài khoản chưa được hỗ trợ."
            });
        }

        if (verificationResult ==
            PasswordVerificationResult.SuccessRehashNeeded)
        {
            var trackedAccount = await _db.Set<TaiKhoan>()
                .FindAsync(account.MaTaiKhoan);

            if (trackedAccount != null)
            {
                trackedAccount.MatKhau = _hasher.HashPassword(
                    new object(),
                    password
                );

                await _db.SaveChangesAsync();
            }
        }

        var claims = new List<Claim>
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                account.MaTaiKhoan.ToString()
            ),
            new Claim(
                ClaimTypes.Name,
                account.TenDangNhap
            ),
            new Claim(
                ClaimTypes.Role,
                role
            )
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity)
        );

        return Ok(new
        {
            success = true,
            message = "Đăng nhập thành công!",
            username = account.TenDangNhap,
            role,
            redirectUrl = role switch
            {
                "Admin" => "/admin/dashboard.html",
                "Staff" => "/staff/dashboard.html",
                _ => "/"
            }
        });
    }

    [HttpGet("profile")]
    [Authorize]
    public IActionResult Profile()
    {
        return Ok(new
        {
            isAuthenticated = true,
            username = User.Identity?.Name,
            role = User.FindFirst(ClaimTypes.Role)?.Value
        });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        if (!await ValidateCsrfToken())
        {
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ."
            });
        }

        await HttpContext.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        return Ok(new
        {
            success = true,
            message = "Đăng xuất thành công!"
        });
    }
}
