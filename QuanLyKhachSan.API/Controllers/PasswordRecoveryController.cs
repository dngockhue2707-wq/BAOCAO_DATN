
using System;
using System.Data;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

public class ForgotPasswordRequest
{
    public string Email { get; set; } = "";
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = "";
    public string NewPassword { get; set; } = "";
    public string ConfirmPassword { get; set; } = "";
}

[ApiController]
[Route("api/password-recovery")]
[AllowAnonymous]
public class PasswordRecoveryController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IPasswordHasher<object> _hasher;
    private readonly IAntiforgery _antiforgery;
    private readonly IConfiguration _config;
    private readonly ILogger<PasswordRecoveryController> _logger;

    public PasswordRecoveryController(
        HotelDbContext db,
        IPasswordHasher<object> hasher,
        IAntiforgery antiforgery,
        IConfiguration config,
        ILogger<PasswordRecoveryController> logger)
    {
        _db = db;
        _hasher = hasher;
        _antiforgery = antiforgery;
        _config = config;
        _logger = logger;
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

    private static string HashToken(string token)
    {
        byte[] bytes = SHA256.HashData(
            Encoding.UTF8.GetBytes(token)
        );

        return Convert.ToHexString(bytes);
    }

    private static object DbValue(object? value)
    {
        return value ?? DBNull.Value;
    }

    private static void AddParameter(
        System.Data.Common.DbCommand command,
        string name,
        object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = DbValue(value);
        command.Parameters.Add(parameter);
    }

    [HttpPost("forgot")]
    public async Task<IActionResult> Forgot(
        [FromBody] ForgotPasswordRequest request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        string email = request.Email?.Trim() ?? "";

        if (email.Length == 0 ||
            email.Length > 150 ||
            !MailAddress.TryCreate(email, out _))
        {
            return BadRequest(new
            {
                message = "Vui lòng nhập email hợp lệ."
            });
        }

        const string genericMessage =
            "Nếu email đã đăng ký trong hệ thống, " +
            "bạn sẽ nhận được liên kết đặt lại mật khẩu.";

        var account = await _db.Set<TaiKhoan>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.TrangThai &&
                x.Email != null &&
                x.Email.ToLower() == email.ToLower());

        if (account == null)
        {
            return Ok(new
            {
                success = true,
                message = genericMessage
            });
        }

        string token = Convert.ToHexString(
            RandomNumberGenerator.GetBytes(32)
        );

        string tokenHash = HashToken(token);

        DateTime now = DateTime.UtcNow;
        DateTime expires = now.AddMinutes(15);

        bool created = false;

        try
        {
            await using var transaction =
                await _db.Database.BeginTransactionAsync();

            var connection = _db.Database.GetDbConnection();

            // Gioi han 1 yeu cau moi 60 giay cho moi tai khoan.
            await using (var check = connection.CreateCommand())
            {
                check.Transaction =
                    transaction.GetDbTransaction();

                check.CommandText = """
                    SELECT COUNT(1)
                    FROM dbo.PasswordResetRequests
                        WITH (UPDLOCK, HOLDLOCK)
                    WHERE AccountId = @accountId
                      AND CreatedAtUtc > @limit
                    """;

                AddParameter(
                    check, "@accountId", account.MaTaiKhoan);

                AddParameter(
                    check, "@limit", now.AddSeconds(-60));

                int recent = Convert.ToInt32(
                    await check.ExecuteScalarAsync()
                );

                if (recent > 0)
                {
                    await transaction.CommitAsync();

                    return Ok(new
                    {
                        success = true,
                        message = genericMessage
                    });
                }
            }

            // Vo hieu hoa lien ket cu chua su dung.
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE dbo.PasswordResetRequests
                SET UsedAtUtc = {now}
                WHERE AccountId = {account.MaTaiKhoan}
                  AND UsedAtUtc IS NULL
                """);

            // Luu token da hash.
            await _db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO dbo.PasswordResetRequests
                (
                    AccountId,
                    TokenHash,
                    CreatedAtUtc,
                    ExpiresAtUtc
                )
                VALUES
                (
                    {account.MaTaiKhoan},
                    {tokenHash},
                    {now},
                    {expires}
                )
                """);

            await transaction.CommitAsync();
            created = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Không thể tạo yêu cầu đặt lại mật khẩu."
            );
        }

        if (created)
        {
            try
            {
                await SendResetEmail(email, token);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Không thể gửi email đặt lại mật khẩu."
                );
            }
        }

        return Ok(new
        {
            success = true,
            message = genericMessage
        });
    }

    private async Task SendResetEmail(
        string recipient,
        string token)
    {
        string smtpUser =
            _config["Email:SmtpUser"] ?? "";

        string smtpPassword =
            _config["Email:SmtpAppPassword"] ?? "";

        string baseUrl =
            _config["PasswordReset:BaseUrl"] ?? "";

        if (string.IsNullOrWhiteSpace(smtpUser) ||
            string.IsNullOrWhiteSpace(smtpPassword) ||
            string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình Gmail SMTP hoặc BaseUrl."
            );
        }

        if (!Uri.TryCreate(
                baseUrl,
                UriKind.Absolute,
                out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttp &&
             baseUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                "PasswordReset:BaseUrl không hợp lệ."
            );
        }

        string resetUrl =
            baseUrl.TrimEnd('/') +
            "/reset-password.html?token=" +
            Uri.EscapeDataString(token);

        using var mail = new MailMessage();

        mail.From = new MailAddress(
            smtpUser,
            "KS Hotel"
        );

        mail.To.Add(recipient);

        mail.Subject = "KS Hotel - Dat lai mat khau";

        mail.Body =
            "Xin chào,\n\n" +
            "Chúng tôi nhận được yêu cầu đặt lại mật khẩu " +
            "cho tài khoản KS Hotel của bạn.\n\n" +
            "Nhấn vào liên kết sau để tạo mật khẩu mới:\n" +
            resetUrl + "\n\n" +
            "Liên kết chỉ có hiệu lực trong 15 phút " +
            "và chỉ được sử dụng một lần.\n\n" +
            "Nếu bạn không yêu cầu thay đổi mật khẩu, " +
            "hãy bỏ qua email này.\n\n" +
            "Trân trọng,\nKS Hotel";

        mail.IsBodyHtml = false;

        using var smtp = new SmtpClient(
            "smtp.gmail.com",
            587
        );

        smtp.EnableSsl = true;
        smtp.UseDefaultCredentials = false;

        smtp.Credentials = new NetworkCredential(
            smtpUser,
            smtpPassword.Replace(" ", "")
        );

        await smtp.SendMailAsync(mail);
    }

    [HttpPost("reset")]
    public async Task<IActionResult> Reset(
        [FromBody] ResetPasswordRequest request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        string token = request.Token?.Trim() ?? "";
        string password = request.NewPassword ?? "";
        string confirm = request.ConfirmPassword ?? "";

        if (token.Length != 64 ||
            !System.Text.RegularExpressions.Regex.IsMatch(
                token,
                "^[0-9A-Fa-f]{64}$"))
        {
            return BadRequest(new
            {
                message = "Liên kết đặt lại mật khẩu không hợp lệ."
            });
        }

        if (password.Length < 12 || password.Length > 128)
        {
            return BadRequest(new
            {
                message =
                    "Mật khẩu mới phải có từ 12 đến 128 ký tự."
            });
        }

        if (password != confirm)
        {
            return BadRequest(new
            {
                message = "Xác nhận mật khẩu không khớp."
            });
        }

        string tokenHash = HashToken(token);
        DateTime now = DateTime.UtcNow;

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        var connection = _db.Database.GetDbConnection();

        // Chi chap nhan token chua dung va chua het han.
        await using var command = connection.CreateCommand();

        command.Transaction =
            transaction.GetDbTransaction();

        command.CommandText = """
            UPDATE dbo.PasswordResetRequests
            SET UsedAtUtc = @now
            OUTPUT INSERTED.AccountId
            WHERE TokenHash = @hash
              AND UsedAtUtc IS NULL
              AND ExpiresAtUtc > @now
            """;

        AddParameter(command, "@now", now);
        AddParameter(command, "@hash", tokenHash);

        object? accountIdValue =
            await command.ExecuteScalarAsync();

        if (accountIdValue == null ||
            accountIdValue == DBNull.Value)
        {
            return BadRequest(new
            {
                message =
                    "Liên kết đã hết hạn hoặc đã được sử dụng. " +
                    "Vui lòng yêu cầu liên kết mới."
            });
        }

        int accountId = Convert.ToInt32(accountIdValue);

        var account = await _db.Set<TaiKhoan>()
            .FirstOrDefaultAsync(x =>
                x.MaTaiKhoan == accountId &&
                x.TrangThai);

        if (account == null)
        {
            return BadRequest(new
            {
                message = "Không thể đặt lại mật khẩu."
            });
        }

        account.MatKhau = _hasher.HashPassword(
            new object(),
            password
        );

        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message =
                "Đặt lại mật khẩu thành công. " +
                "Bạn có thể đăng nhập bằng mật khẩu mới."
        });
    }
}
