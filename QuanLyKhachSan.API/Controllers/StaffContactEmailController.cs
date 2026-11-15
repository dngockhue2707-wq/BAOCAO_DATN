
using System;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Authorize(Roles = "Staff")]
[Route("api/staff/contact-replies")]
public class StaffContactEmailController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StaffContactEmailController> _logger;

    private static readonly SemaphoreSlim ReplyLock = new(1, 1);

    public StaffContactEmailController(
        HotelDbContext db,
        IAntiforgery antiforgery,
        IConfiguration configuration,
        ILogger<StaffContactEmailController> logger)
    {
        _db = db;
        _antiforgery = antiforgery;
        _configuration = configuration;
        _logger = logger;
    }

    public sealed class ReplyInput
    {
        public string Content { get; set; } = "";
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

    private async Task<int?> GetEmployeeId()
    {
        string? claim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out int accountId))
            return null;

        return await _db.NhanViens
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId)
            .Select(x => (int?)x.MaNhanVien)
            .FirstOrDefaultAsync();
    }

    private async Task SendEmail(
        string recipient,
        string subject,
        string content)
    {
        string host = _configuration["EmailSettings:Host"]
            ?? "smtp.gmail.com";

        int port = int.TryParse(
            _configuration["EmailSettings:Port"],
            out int configuredPort)
            ? configuredPort
            : 587;

        string username =
            _configuration["EmailSettings:Username"] ?? "";

        string password =
            _configuration["EmailSettings:AppPassword"] ?? "";

        string fromName =
            _configuration["EmailSettings:FromName"]
            ?? "DNK Hotel";

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình tài khoản Gmail gửi thư.");
        }

        using var message = new MailMessage();

        message.From = new MailAddress(username, fromName);
        message.To.Add(new MailAddress(recipient));

        string safeSubject = subject
            .Replace("\r", " ")
            .Replace("\n", " ");

        message.Subject =
            "DNK Hotel - Phản hồi: " + safeSubject;

        message.Body = content;
        message.IsBodyHtml = false;

        using var smtp = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(
                username, password),
            EnableSsl = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 30000
        };

        await smtp.SendMailAsync(message);
    }

    [HttpPost("{id:int}")]
    public async Task<IActionResult> Reply(
        int id,
        [FromBody] ReplyInput input)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string content = input.Content?.Trim() ?? "";

        if (content.Length < 2 || content.Length > 2000)
        {
            return BadRequest(new
            {
                message =
                    "Nội dung phản hồi phải từ 2 đến 2000 ký tự."
            });
        }

        int? employeeId = await GetEmployeeId();

        if (!employeeId.HasValue)
        {
            return BadRequest(new
            {
                message = "Không tìm thấy hồ sơ nhân viên."
            });
        }

        await ReplyLock.WaitAsync();

        try
        {
            var contact = await _db.LienHes
                .FirstOrDefaultAsync(x => x.MaLienHe == id);

            if (contact == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy yêu cầu liên hệ."
                });
            }

            if (string.IsNullOrWhiteSpace(contact.Email) ||
                !MailAddress.TryCreate(contact.Email, out _))
            {
                return BadRequest(new
                {
                    message = "Email khách hàng không hợp lệ."
                });
            }

            bool alreadyReplied =
                contact.TrangThai == "Đã phản hồi" &&
                contact.NoiDungPhanHoi == content &&
                contact.NgayPhanHoi.HasValue;

            if (alreadyReplied)
            {
                return Ok(new
                {
                    success = true,
                    emailSent = false,
                    message =
                        "Nội dung này đã được phản hồi trước đó. " +
                        "Hệ thống không gửi Gmail trùng."
                });
            }

            try
            {
                await SendEmail(
                    contact.Email,
                    contact.ChuDe,
                    content);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Lỗi gửi Gmail cho liên hệ {ContactId}",
                    id);

                return StatusCode(502, new
                {
                    success = false,
                    emailSent = false,
                    message =
                        "Không thể xác nhận gửi Gmail thành công. " +
                        "Vui lòng kiểm tra Gmail và cấu hình SMTP " +
                        "trước khi thử lại."
                });
            }

            contact.NoiDungPhanHoi = content;
            contact.TrangThai = "Đã phản hồi";
            contact.NgayPhanHoi = DateTime.Now;
            contact.MaNhanVienPhanHoi = employeeId.Value;

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Đã gửi Gmail nhưng lưu SQL thất bại cho liên hệ {ContactId}",
                    id);

                return StatusCode(500, new
                {
                    success = false,
                    emailSent = true,
                    message =
                        "Gmail đã được máy chủ SMTP chấp nhận " +
                        "nhưng không lưu được trạng thái SQL. " +
                        "Không gửi lại trước khi kiểm tra dữ liệu."
                });
            }

            return Ok(new
            {
                success = true,
                emailSent = true,
                message =
                    "Đã gửi phản hồi qua Gmail cho khách hàng."
            });
        }
        finally
        {
            ReplyLock.Release();
        }
    }
}
 