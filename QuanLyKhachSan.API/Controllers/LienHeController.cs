
using System;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/lien-he")]
public class LienHeController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LienHeController> _logger;

    public LienHeController(
        HotelDbContext db,
        IAntiforgery antiforgery,
        IConfiguration configuration,
        ILogger<LienHeController> logger)
    {
        _db = db;
        _antiforgery = antiforgery;
        _configuration = configuration;
        _logger = logger;
    }

    public class ContactInput
    {
        public string HoTen { get; set; } = "";
        public string Email { get; set; } = "";
        public string? SoDienThoai { get; set; }
        public string ChuDe { get; set; } = "";
        public string NoiDung { get; set; } = "";
    }

    public class ContactReplyInput
    {
        public string TrangThai { get; set; } = "";
        public string? NoiDungPhanHoi { get; set; }
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

    private async Task SendReplyEmail(
        string recipient,
        string customerName,
        string subject,
        string originalContent,
        string replyContent)
    {
        string host =
            _configuration["EmailSettings:Host"]
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
            ?? "KS Hotel";

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Chưa cấu hình Gmail gửi phản hồi.");
        }

        string emailSubject =
            "KS Hotel - Phản hồi: " +
            subject.Replace("\r", " ").Replace("\n", " ");

        string emailBody = $"""
            Kính gửi {customerName},

            {replyContent}

            Trân trọng,
            Bộ phận Chăm sóc Khách hàng
            KS Hotel
            """;

        using var mail = new MailMessage();

        mail.From = new MailAddress(username, fromName);
        mail.To.Add(new MailAddress(recipient));
        mail.Subject = emailSubject;
        mail.Body = emailBody;
        mail.IsBodyHtml = false;

        using var smtp = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(
                username,
                password),
            EnableSsl = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 30000
        };

        await smtp.SendMailAsync(mail);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create(
        [FromBody] ContactInput request)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ."
            });

        string name = request.HoTen?.Trim() ?? "";
        string email = request.Email?.Trim() ?? "";
        string phone = request.SoDienThoai?.Trim() ?? "";
        string subject = request.ChuDe?.Trim() ?? "";
        string content = request.NoiDung?.Trim() ?? "";

        if (name.Length is < 2 or > 100 ||
            email.Length is < 3 or > 150 ||
            phone.Length > 20 ||
            subject.Length is < 3 or > 150 ||
            content.Length is < 10 or > 3000 ||
            !MailAddress.TryCreate(email, out var address) ||
            address.Address != email)
        {
            return BadRequest(new
            {
                message = "Thông tin liên hệ không hợp lệ."
            });
        }

        var contact = new LienHe
        {
            HoTen = name,
            Email = email,
            SoDienThoai = string.IsNullOrWhiteSpace(phone)
                ? null
                : phone,
            ChuDe = subject,
            NoiDung = content,
            NgayGui = DateTime.Now,
            TrangThai = "Chờ xử lý"
        };

        _db.LienHes.Add(contact);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = contact.MaLienHe,
            message =
                "Gửi yêu cầu thành công. " +
                "KS Hotel sẽ phản hồi qua email của bạn."
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? keyword)
    {
        var query = _db.LienHes
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            string selected = status.Trim();

            query = query.Where(
                x => x.TrangThai == selected);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            string search = keyword.Trim();

            query = query.Where(x =>
                x.HoTen.Contains(search) ||
                x.Email.Contains(search) ||
                x.ChuDe.Contains(search));
        }

        var items = await query
            .OrderByDescending(x => x.NgayGui)
            .ThenByDescending(x => x.MaLienHe)
            .Select(x => new
            {
                id = x.MaLienHe,
                name = x.HoTen,
                email = x.Email,
                phone = x.SoDienThoai,
                subject = x.ChuDe,
                content = x.NoiDung,
                createdAt = x.NgayGui,
                status = x.TrangThai,
                reply = x.NoiDungPhanHoi,
                repliedAt = x.NgayPhanHoi
            })
            .Take(200)
            .ToListAsync();

        return Ok(new { items });
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(int id)
    {
        var contact = await _db.LienHes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaLienHe == id);

        if (contact == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy liên hệ."
            });
        }

        return Ok(contact);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reply(
        int id,
        [FromBody] ContactReplyInput request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string status = request.TrangThai?.Trim() ?? "";
        string reply = request.NoiDungPhanHoi?.Trim() ?? "";

        string[] allowed =
        {
            "Chờ xử lý",
            "Đang xử lý",
            "Đã phản hồi",
            "Đã đóng"
        };

        if (!allowed.Contains(status) ||
            reply.Length > 3000)
        {
            return BadRequest(new
            {
                message = "Thông tin xử lý không hợp lệ."
            });
        }

        if (status == "Đã phản hồi" &&
            string.IsNullOrWhiteSpace(reply))
        {
            return BadRequest(new
            {
                message = "Vui lòng nhập nội dung phản hồi."
            });
        }

        var contact = await _db.LienHes
            .FirstOrDefaultAsync(x => x.MaLienHe == id);

        if (contact == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy liên hệ."
            });
        }

        bool alreadyReplied =
            contact.TrangThai == "Đã phản hồi" &&
            contact.NoiDungPhanHoi == reply &&
            contact.NgayPhanHoi.HasValue;

        bool shouldSendEmail =
            status == "Đã phản hồi" &&
            !alreadyReplied;

        if (shouldSendEmail)
        {
            if (!MailAddress.TryCreate(
                    contact.Email, out _))
            {
                return BadRequest(new
                {
                    message =
                        "Email khách hàng không hợp lệ."
                });
            }

            try
            {
                await SendReplyEmail(
                    contact.Email,
                    contact.HoTen,
                    contact.ChuDe,
                    contact.NoiDung,
                    reply);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Không thể gửi Gmail phản hồi liên hệ {Id}",
                    id);

                return StatusCode(502, new
                {
                    success = false,
                    message =
                        "Không thể gửi Gmail cho khách hàng. " +
                        "Vui lòng kiểm tra cấu hình email."
                });
            }
        }

        int? accountId = int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int parsedId)
            ? parsedId
            : null;

        int? employeeId = accountId.HasValue
            ? await _db.NhanViens
                .Where(x =>
                    x.MaTaiKhoan == accountId.Value)
                .Select(x => (int?)x.MaNhanVien)
                .FirstOrDefaultAsync()
            : null;

        contact.TrangThai = status;

        if (status == "Đã phản hồi")
        {
            contact.NoiDungPhanHoi = reply;

            if (shouldSendEmail)
            {
                contact.NgayPhanHoi = DateTime.Now;
                contact.MaNhanVienPhanHoi = employeeId;
            }
        }
        else if (status == "Đã đóng")
        {
            if (!string.IsNullOrWhiteSpace(reply))
            {
                contact.NoiDungPhanHoi = reply;
            }
        }
        else
        {
            contact.NoiDungPhanHoi =
                string.IsNullOrWhiteSpace(reply)
                    ? null
                    : reply;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            emailSent = shouldSendEmail,
            message = shouldSendEmail
                ? "Đã gửi phản hồi qua Gmail cho khách hàng."
                : "Đã cập nhật yêu cầu hỗ trợ."
        });
    }
}
