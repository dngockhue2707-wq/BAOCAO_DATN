
using System.Data;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

// Dữ liệu đăng ký tài khoản
public class RegisterDto
{
    public string HoTen { get; set; } = "";
    public string TenDangNhap { get; set; } = "";
    public string Email { get; set; } = "";
    public string SoDienThoai { get; set; } = "";
    public string MatKhau { get; set; } = "";
}

// Dữ liệu đăng nhập
public class LoginDto
{
    public string TenDangNhap { get; set; } = "";
    public string MatKhau { get; set; } = "";
}

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly IAntiforgery _antiforgery;

    public AccountController(
        SqlConnection db,
        IPasswordHasher<object> hasher,
        IAntiforgery antiforgery)
    {
        _db = db;
        _hasher = hasher;
        _antiforgery = antiforgery;
    }

    // 1. LẤY MÃ BẢO VỆ CSRF
    // GET: /api/account/csrf-token

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

    // 2. ĐĂNG KÝ
    // POST: /api/account/register

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

        await _db.OpenAsync();

        using var transaction =
            (SqlTransaction)await _db.BeginTransactionAsync();

        try
        {
            // Chỉ cho phép người dùng tự đăng ký vai trò khách hàng
            const string roleSql = """
                SELECT TOP 1 MaVaiTro
                FROM dbo.VaiTro
                WHERE LOWER(
                    REPLACE(
                        REPLACE(LTRIM(RTRIM(TenVaiTro)), N' ', N''),
                        N'á', N'a'
                    )
                ) IN (N'khachhang', N'kháchhàng')
                ORDER BY MaVaiTro
                """;

            using var roleCommand =
                new SqlCommand(roleSql, _db, transaction);

            object? roleValue = await roleCommand.ExecuteScalarAsync();

            if (roleValue == null)
            {
                await transaction.RollbackAsync();

                return StatusCode(500, new
                {
                    message = "Chưa thiết lập vai trò khách hàng trong SQL Server."
                });
            }

            int roleId = Convert.ToInt32(roleValue);

            // Tự động băm mật khẩu trước khi lưu
            string passwordHash = _hasher.HashPassword(
                new object(),
                password
            );

            // Tạo tài khoản
            const string accountSql = """
                INSERT INTO dbo.TaiKhoan
                    (
                        TenDangNhap,
                        MatKhau,
                        Email,
                        MaVaiTro,
                        TrangThai,
                        NgayTao
                    )
                OUTPUT INSERTED.MaTaiKhoan
                VALUES
                    (
                        @Username,
                        @PasswordHash,
                        @Email,
                        @RoleId,
                        1,
                        SYSDATETIME()
                    )
                """;

            using var accountCommand =
                new SqlCommand(accountSql, _db, transaction);

            accountCommand.Parameters.Add(
                "@Username", SqlDbType.NVarChar, 100
            ).Value = username;

            accountCommand.Parameters.Add(
                "@PasswordHash", SqlDbType.NVarChar, 255
            ).Value = passwordHash;

            accountCommand.Parameters.Add(
                "@Email", SqlDbType.NVarChar, 150
            ).Value = email;

            accountCommand.Parameters.Add(
                "@RoleId", SqlDbType.Int
            ).Value = roleId;

            int accountId = Convert.ToInt32(
                await accountCommand.ExecuteScalarAsync()
            );

            // Tạo hồ sơ khách hàng
            const string customerSql = """
                INSERT INTO dbo.KhachHang
                    (
                        MaTaiKhoan,
                        HoTen,
                        SoDienThoai,
                        Email,
                        NgayTao
                    )
                VALUES
                    (
                        @AccountId,
                        @FullName,
                        @Phone,
                        @Email,
                        SYSDATETIME()
                    )
                """;

            using var customerCommand =
                new SqlCommand(customerSql, _db, transaction);

            customerCommand.Parameters.Add(
                "@AccountId", SqlDbType.Int
            ).Value = accountId;

            customerCommand.Parameters.Add(
                "@FullName", SqlDbType.NVarChar, 100
            ).Value = fullName;

            customerCommand.Parameters.Add(
                "@Phone", SqlDbType.VarChar, 20
            ).Value = phone;

            customerCommand.Parameters.Add(
                "@Email", SqlDbType.NVarChar, 150
            ).Value = email;

            await customerCommand.ExecuteNonQueryAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Đăng ký thành công! Bạn có thể đăng nhập."
            });
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
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

    // 3. ĐĂNG NHẬP
    // POST: /api/account/login

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

        await _db.OpenAsync();

        const string sql = """
            SELECT
                tk.MaTaiKhoan,
                tk.TenDangNhap,
                tk.MatKhau,
                vt.TenVaiTro
            FROM dbo.TaiKhoan tk
            INNER JOIN dbo.VaiTro vt
                ON tk.MaVaiTro = vt.MaVaiTro
            WHERE tk.TenDangNhap = @Username
              AND tk.TrangThai = 1
            """;

        int accountId;
        string accountName;
        string storedHash;
        string roleName;

        using (var command = new SqlCommand(sql, _db))
        {
            command.Parameters.Add(
                "@Username", SqlDbType.NVarChar, 100
            ).Value = username;

            using var reader = await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return Unauthorized(new
                {
                    message = "Tên đăng nhập hoặc mật khẩu không đúng."
                });
            }

            accountId = reader.GetInt32(0);
            accountName = reader.GetString(1);
            storedHash = reader.GetString(2);
            roleName = reader.GetString(3);
        }

        PasswordVerificationResult verificationResult;

        try
        {
            verificationResult = _hasher.VerifyHashedPassword(
                new object(),
                storedHash,
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

        // Chuẩn hóa vai trò từ SQL Server
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

        var claims = new List<Claim>
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                accountId.ToString()
            ),
            new Claim(
                ClaimTypes.Name,
                accountName
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
            username = accountName,
            role,
            redirectUrl = role switch
                {
                    "Admin" => "/admin/dashboard.html",
                    "Staff" => "/staff/dashboard.html",
                    _ => "/"
                }
        });
    }

    // 4. THÔNG TIN TÀI KHOẢN
    // GET: /api/account/profile

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

    // 5. ĐĂNG XUẤT
    // POST: /api/account/logout

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
