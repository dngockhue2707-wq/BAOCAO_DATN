
using System.Net.Mail;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;
using System.Security.Claims;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/lien-he")]
public class LienHeController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public LienHeController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
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
            return BadRequest(new
            {
                message = "Thông tin liên hệ không hợp lệ."
            });

        var contact = new LienHe
        {
            HoTen = name,
            Email = email,
            SoDienThoai = string.IsNullOrWhiteSpace(phone)
                ? null : phone,
            ChuDe = subject,
            NoiDung = content,
            NgayGui = DateTime.Now,
            TrangThai = "Chờ xử lý"
        };

        _db.Set<LienHe>().Add(contact);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = contact.MaLienHe,
            message = "Gửi liên hệ thành công."
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] string? keyword)
    {
        var query = _db.Set<LienHe>()
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            string selected = status.Trim();
            query = query.Where(x => x.TrangThai == selected);
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
        var contact = await _db.Set<LienHe>()
            .AsNoTracking()
            .Where(x => x.MaLienHe == id)
            .FirstOrDefaultAsync();

        if (contact == null)
            return NotFound(new { message = "Không tìm thấy liên hệ." });

        return Ok(contact);
    }
    
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reply(
        int id,
        [FromBody] ContactReplyInput request)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });

        string status = request.TrangThai?.Trim() ?? "";
        string reply = request.NoiDungPhanHoi?.Trim() ?? "";

        string[] allowed =
        {
            "Chờ xử lý",
            "Đang xử lý",
            "Đã phản hồi",
            "Đã đóng"
        };

        if (!allowed.Contains(status) || reply.Length > 3000)
            return BadRequest(new
            {
                message = "Thông tin xử lý không hợp lệ."
            });

        if (status == "Đã phản hồi" && reply.Length == 0)
            return BadRequest(new
            {
                message = "Vui lòng nhập nội dung phản hồi."
            });

        var contact = await _db.Set<LienHe>()
            .FirstOrDefaultAsync(x => x.MaLienHe == id);

        if (contact == null)
            return NotFound(new
            {
                message = "Không tìm thấy liên hệ."
            });

        contact.TrangThai = status;
        contact.NoiDungPhanHoi = reply.Length == 0 ? null : reply;

        if (status == "Đã phản hồi" || status == "Đã đóng")
        {
            int? accountId = int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out int parsedId
            ) ? parsedId : null;

            contact.MaNhanVienPhanHoi = accountId.HasValue
                ? await _db.Set<NhanVien>()
                    .Where(x => x.MaTaiKhoan == accountId.Value)
                    .Select(x => (int?)x.MaNhanVien)
                    .FirstOrDefaultAsync()
                : null;

            contact.NgayPhanHoi = DateTime.Now;
        }
        else
        {
            contact.MaNhanVienPhanHoi = null;
            contact.NgayPhanHoi = null;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật yêu cầu hỗ trợ."
        });
    }

}
