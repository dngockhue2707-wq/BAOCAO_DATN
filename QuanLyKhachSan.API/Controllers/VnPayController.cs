
using System.Data;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;
using QuanLyKhachSan.API.Services;

namespace QuanLyKhachSan.API.Controllers;

public class StartVnPayRequest
{
    public int BookingId { get; set; }
}

[ApiController]
[Route("api/vnpay")]
public class VnPayController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly VnPayService _vnpay;
    private readonly IAntiforgery _antiforgery;
    private readonly IConfiguration _config;

    public VnPayController(
        HotelDbContext db,
        VnPayService vnpay,
        IAntiforgery antiforgery,
        IConfiguration config)
    {
        _db = db;
        _vnpay = vnpay;
        _antiforgery = antiforgery;
        _config = config;
    }

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id) ? id : null;
    }

    private decimal Rate()
    {
        decimal rate = _config.GetValue<decimal>(
            "VnPay:DepositRate", 0.30m);

        if (rate <= 0 || rate > 1)
            throw new InvalidOperationException(
                "Tỷ lệ đặt cọc không hợp lệ.");

        return rate;
    }

    private static bool Paid(string status)
    {
        return status == "Thành công" ||
               status == "Đã thanh toán";
    }

    [HttpGet("bookings")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Bookings()
    {
        int? id = AccountId();

        if (!id.HasValue)
            return Unauthorized();

        var bookings = await (
            from b in _db.DatPhongs.AsNoTracking()
            join c in _db.KhachHangs.AsNoTracking()
                on b.MaKhachHang equals c.MaKhachHang
            where c.MaTaiKhoan == id.Value
            orderby b.MaDatPhong descending
            select new
            {
                b.MaDatPhong,
                b.NgayNhanPhong,
                b.NgayTraPhong,
                b.TrangThai
            }
        ).ToListAsync();

        var ids = bookings.Select(x => x.MaDatPhong).ToList();

        var details = await _db.ChiTietDatPhongs
            .AsNoTracking()
            .Where(x => ids.Contains(x.MaDatPhong))
            .Select(x => new
            {
                x.MaDatPhong,
                x.ThanhTien
            })
            .ToListAsync();

        var deposits = await _db.DatCocs
            .AsNoTracking()
            .Where(x => ids.Contains(x.MaDatPhong))
            .OrderByDescending(x => x.MaDatCoc)
            .Select(x => new
            {
                x.MaDatPhong,
                x.SoTien,
                x.TrangThai,
                x.MaGiaoDich
            })
            .ToListAsync();

        var result = bookings.Select(b =>
        {
            decimal total = details
                .Where(x => x.MaDatPhong == b.MaDatPhong)
                .Sum(x => x.ThanhTien);

            decimal required = Math.Round(
                total * Rate(), 0,
                MidpointRounding.AwayFromZero);

            var history = deposits
                .Where(x => x.MaDatPhong == b.MaDatPhong)
                .ToList();

            return new
            {
                bookingId = b.MaDatPhong,
                checkIn = b.NgayNhanPhong,
                checkOut = b.NgayTraPhong,
                bookingStatus = b.TrangThai,
                roomTotal = total,
                depositAmount = required,
                hasPaid = history.Any(x => Paid(x.TrangThai)),
                pending = history.Any(x =>
                    x.TrangThai == "Chờ thanh toán"),
                lastStatus = history.FirstOrDefault()?.TrangThai
            };
        });

        return Ok(new { bookings = result });
    }

    [HttpPost("create")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create(
        [FromBody] StartVnPayRequest request)
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

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        if (request.BookingId <= 0)
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var booking = await (
            from b in _db.DatPhongs
            join c in _db.KhachHangs
                on b.MaKhachHang equals c.MaKhachHang
            where b.MaDatPhong == request.BookingId &&
                  c.MaTaiKhoan == accountId.Value
            select b
        ).FirstOrDefaultAsync();

        if (booking == null)
            return NotFound(new
            {
                message = "Không tìm thấy đơn đặt phòng của bạn."
            });

        if (booking.TrangThai != "Chờ xác nhận" &&
            booking.TrangThai != "Đã xác nhận")
            return BadRequest(new
            {
                message = "Đơn không thể thanh toán đặt cọc."
            });

        if (booking.NgayNhanPhong <
            DateOnly.FromDateTime(DateTime.Today))
            return BadRequest(new
            {
                message = "Đã qua ngày nhận phòng."
            });

        var deposits = await _db.DatCocs
            .Where(x => x.MaDatPhong == request.BookingId)
            .ToListAsync();

        if (deposits.Any(x => Paid(x.TrangThai)))
            return Conflict(new
            {
                message = "Đơn phòng đã thanh toán tiền cọc."
            });
        
        var unresolved = deposits
            .Where(x =>
                x.TrangThai == "Chờ thanh toán" ||
                x.TrangThai == "Hết hạn")
            .OrderByDescending(x => x.MaDatCoc)
            .FirstOrDefault();

        if (unresolved != null)
        {
            return Conflict(new
            {
                message = "Đơn đặt phòng có giao dịch VNPay chưa được đối soát. Vui lòng kiểm tra kết quả thanh toán trước khi tạo giao dịch mới."
            });
        }

        decimal total = await _db.ChiTietDatPhongs
            .Where(x => x.MaDatPhong == request.BookingId)
            .SumAsync(x => (decimal?)x.ThanhTien) ?? 0m;

        decimal amount = Math.Round(
            total * Rate(), 0,
            MidpointRounding.AwayFromZero);

        if (amount < 5000)
            return BadRequest(new
            {
                message = "Tiền cọc không hợp lệ."
            });

        long amountLong = decimal.ToInt64(amount);

        string reference = "DNK" +
            Guid.NewGuid().ToString("N").ToUpperInvariant();

        string ip = HttpContext.Connection
            .RemoteIpAddress?.MapToIPv4().ToString()
            ?? "127.0.0.1";

        string paymentUrl = _vnpay.CreateUrl(
            reference, amountLong, ip);

        var deposit = new DatCoc
        {
            MaDatPhong = request.BookingId,
            SoTien = amount,
            PhuongThuc = "VNPay",
            NgayDatCoc = DateTime.Now,
            TrangThai = "Chờ thanh toán",
            MaGiaoDich = reference,
            GhiChu = "Giao dịch VNPay Sandbox"
        };

        _db.DatCocs.Add(deposit);

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            paymentUrl,
            transactionReference = reference,
            amount
        });
    }

    [HttpGet("ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> Ipn()
    {

        Console.WriteLine(
            $"[VNPAY IPN] Thoi gian: {DateTime.Now:dd/MM/yyyy HH:mm:ss}"
        );

        Console.WriteLine(
            $"[VNPAY IPN] Ma giao dich: {Request.Query["vnp_TxnRef"]}"
        );

        Console.WriteLine(
            $"[VNPAY IPN] Co chu ky: {!string.IsNullOrEmpty(Request.Query["vnp_SecureHash"].ToString())}"
        );

        bool signatureValid =
            _vnpay.Verify(Request.Query) &&
            _vnpay.ValidMerchant(Request.Query);

        Console.WriteLine(
            $"[VNPAY IPN] Xac thuc hop le: {signatureValid}"
        );

        if (!signatureValid)
            return Ok(new
            {
                RspCode = "97",
                Message = "Invalid signature"
            });

        string reference =
            Request.Query["vnp_TxnRef"].ToString();

        string amountText =
            Request.Query["vnp_Amount"].ToString();

        if (!long.TryParse(
            amountText,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out long gatewayAmount))
            return Ok(new
            {
                RspCode = "04",
                Message = "Invalid amount"
            });

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var deposit = await _db.DatCocs
            .FirstOrDefaultAsync(x => x.MaGiaoDich == reference);

        if (deposit == null)
            return Ok(new
            {
                RspCode = "01",
                Message = "Order not found"
            });

        if (deposit.SoTien * 100 != gatewayAmount)
            return Ok(new
            {
                RspCode = "04",
                Message = "Invalid amount"
            });

        if (deposit.TrangThai != "Chờ thanh toán")
            return Ok(new
            {
                RspCode = "02",
                Message = "Order already processed"
            });

        var booking = await _db.DatPhongs
            .FirstOrDefaultAsync(x =>
                x.MaDatPhong == deposit.MaDatPhong);

        if (booking == null)
            return Ok(new
            {
                RspCode = "01",
                Message = "Booking not found"
            });

        bool successful =
            Request.Query["vnp_ResponseCode"].ToString() == "00" &&
            Request.Query["vnp_TransactionStatus"].ToString() == "00";

        if (successful)
        {
            if (booking.TrangThai != "Chờ xác nhận" &&
                booking.TrangThai != "Đã xác nhận")
            {
                return Ok(new
                {
                    RspCode = "02",
                    Message = "Booking status invalid"
                });
            }

            deposit.TrangThai = "Thành công";
            deposit.GhiChu = "VNPay xác nhận thanh toán thành công";

            booking.TrangThai = "Đã đặt cọc";
            booking.NgayXacNhan ??= DateTime.Now;
        }
        else
        {
            deposit.TrangThai = "Thất bại";
            deposit.GhiChu = "VNPay trả về giao dịch không thành công";
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            RspCode = "00",
            Message = "Confirm Success"
        });
    }

    [HttpGet("status")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Status(
        [FromQuery] string reference)
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var result = await (
            from d in _db.DatCocs.AsNoTracking()
            join b in _db.DatPhongs.AsNoTracking()
                on d.MaDatPhong equals b.MaDatPhong
            join c in _db.KhachHangs.AsNoTracking()
                on b.MaKhachHang equals c.MaKhachHang
            where d.MaGiaoDich == reference &&
                  c.MaTaiKhoan == accountId.Value
            select new
            {
                status = d.TrangThai,
                amount = d.SoTien,
                bookingId = d.MaDatPhong
            }
        ).FirstOrDefaultAsync();

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy giao dịch."
            });

        return Ok(result);
    }
}
