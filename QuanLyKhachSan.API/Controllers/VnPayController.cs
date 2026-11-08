
using System.Collections.Concurrent;
using System.Data;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;
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

    // Chi luu URL giao dich trong RAM khi ung dung dang chay.
    // Khong tao DatCoc moi khi khach tiep tuc thanh toan.
    private sealed record PendingPaymentLink(
        string Reference,
        string Url,
        DateTime ExpireAt
    );

    private static readonly ConcurrentDictionary<int, PendingPaymentLink>
        PendingLinks = new();

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
            out int id
        ) ? id : null;
    }

    private decimal Rate()
    {
        decimal rate = _config.GetValue<decimal>(
            "VnPay:DepositRate",
            0.30m
        );

        if (rate <= 0 || rate > 1)
        {
            throw new InvalidOperationException(
                "Tỷ lệ đặt cọc không hợp lệ."
            );
        }

        return rate;
    }

    private static bool Paid(string status)
    {
        return status == "Thành công" ||
               status == "Đã thanh toán";
    }

    // =====================================================
    // 1. LAY THONG TIN DAT COC CUA KHACH HANG
    // =====================================================

    [HttpGet("bookings")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Bookings()
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var bookings = await (
            from booking in _db.DatPhongs.AsNoTracking()
            join customer in _db.KhachHangs.AsNoTracking()
                on booking.MaKhachHang equals customer.MaKhachHang
            where customer.MaTaiKhoan == accountId.Value
            orderby booking.MaDatPhong descending
            select new
            {
                booking.MaDatPhong,
                booking.NgayNhanPhong,
                booking.NgayTraPhong,
                booking.TrangThai
            }
        ).ToListAsync();

        var ids = bookings
            .Select(x => x.MaDatPhong)
            .ToList();

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
                x.MaGiaoDich,
                x.NgayDatCoc
            })
            .ToListAsync();

        var result = bookings.Select(booking =>
        {
            decimal total = details
                .Where(x => x.MaDatPhong == booking.MaDatPhong)
                .Sum(x => x.ThanhTien);

            decimal depositAmount = Math.Round(
                total * Rate(),
                0,
                MidpointRounding.AwayFromZero
            );

            var history = deposits
                .Where(x => x.MaDatPhong == booking.MaDatPhong)
                .ToList();

            var latest = history.FirstOrDefault();

            bool hasPaid = history.Any(x =>
                Paid(x.TrangThai)
            );

            bool pending = history.Any(x =>
                x.TrangThai == "Chờ thanh toán" ||
                x.TrangThai == "Hết hạn"
            );

            bool canResume = false;

            if (
                !hasPaid &&
                latest != null &&
                latest.TrangThai == "Chờ thanh toán" &&
                (
                    booking.TrangThai == "Chờ xác nhận" ||
                    booking.TrangThai == "Đã xác nhận"
                ) &&
                booking.NgayNhanPhong >=
                    DateOnly.FromDateTime(DateTime.Today) &&
                PendingLinks.TryGetValue(
                    booking.MaDatPhong,
                    out var savedLink
                )
            )
            {
                canResume =
                    savedLink.Reference == latest.MaGiaoDich &&
                    DateTime.Now < savedLink.ExpireAt &&
                    DateTime.Now < latest.NgayDatCoc.AddMinutes(14);
            }

            return new
            {
                bookingId = booking.MaDatPhong,
                checkIn = booking.NgayNhanPhong,
                checkOut = booking.NgayTraPhong,
                bookingStatus = booking.TrangThai,
                roomTotal = total,
                depositAmount,
                hasPaid,
                pending,
                lastStatus = latest?.TrangThai,
                canResume
            };
        }).ToList();

        return Ok(new
        {
            bookings = result
        });
    }

    // =====================================================
    // 2. TAO THANH TOAN VNPAY MOI
    // =====================================================

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
        {
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        var booking = await (
            from b in _db.DatPhongs
            join c in _db.KhachHangs
                on b.MaKhachHang equals c.MaKhachHang
            where b.MaDatPhong == request.BookingId &&
                  c.MaTaiKhoan == accountId.Value
            select b
        ).FirstOrDefaultAsync();

        if (booking == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy đơn đặt phòng của bạn."
            });
        }

        if (
            booking.TrangThai != "Chờ xác nhận" &&
            booking.TrangThai != "Đã xác nhận"
        )
        {
            return BadRequest(new
            {
                message = "Đơn không thể thanh toán đặt cọc."
            });
        }

        if (
            booking.NgayNhanPhong <
            DateOnly.FromDateTime(DateTime.Today)
        )
        {
            return BadRequest(new
            {
                message = "Đã qua ngày nhận phòng."
            });
        }

        var deposits = await _db.DatCocs
            .Where(x => x.MaDatPhong == request.BookingId)
            .ToListAsync();

        if (deposits.Any(x => Paid(x.TrangThai)))
        {
            return Conflict(new
            {
                message = "Đơn đã thanh toán tiền cọc."
            });
        }

        var unresolved = deposits
            .Where(x =>
                x.TrangThai == "Chờ thanh toán" ||
                x.TrangThai == "Hết hạn"
            )
            .OrderByDescending(x => x.MaDatCoc)
            .FirstOrDefault();

        if (unresolved != null)
        {
            return Conflict(new
            {
                message =
                    "Đơn đang có giao dịch VNPay chưa được đối soát. " +
                    "Vui lòng kiểm tra giao dịch cũ trước khi tạo mới."
            });
        }

        decimal total = await _db.ChiTietDatPhongs
            .Where(x => x.MaDatPhong == request.BookingId)
            .SumAsync(x => (decimal?)x.ThanhTien) ?? 0m;

        decimal amount = Math.Round(
            total * Rate(),
            0,
            MidpointRounding.AwayFromZero
        );

        if (amount < 5000)
        {
            return BadRequest(new
            {
                message = "Tiền cọc không hợp lệ."
            });
        }

        long amountLong = decimal.ToInt64(amount);

        string reference = "DNK" +
            Guid.NewGuid().ToString("N").ToUpperInvariant();

        string ip = HttpContext.Connection
            .RemoteIpAddress?
            .MapToIPv4()
            .ToString() ?? "127.0.0.1";

        string paymentUrl = _vnpay.CreateUrl(
            reference,
            amountLong,
            ip
        );

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

        // Luu URL trong RAM de khach co the quay lai.
        PendingLinks[request.BookingId] =
            new PendingPaymentLink(
                reference,
                paymentUrl,
                DateTime.Now.AddMinutes(14)
            );

        return Ok(new
        {
            paymentUrl,
            transactionReference = reference,
            amount
        });
    }

    // =====================================================
    // 3. TIEP TUC THANH TOAN DANG CHO
    // =====================================================

    [HttpPost("resume")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Resume(
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
                message = "Mã bảo vệ yêu cầu không hợp lệ."
            });
        }

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        if (request.BookingId <= 0)
        {
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });
        }

        // Chi truy cap don thuoc tai khoan dang dang nhap.
        var booking = await (
            from b in _db.DatPhongs.AsNoTracking()
            join c in _db.KhachHangs.AsNoTracking()
                on b.MaKhachHang equals c.MaKhachHang
            where b.MaDatPhong == request.BookingId &&
                  c.MaTaiKhoan == accountId.Value
            select new
            {
                b.MaDatPhong,
                b.TrangThai,
                b.NgayNhanPhong
            }
        ).FirstOrDefaultAsync();

        if (booking == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy đơn đặt phòng của bạn."
            });
        }

        if (
            booking.TrangThai != "Chờ xác nhận" &&
            booking.TrangThai != "Đã xác nhận"
        )
        {
            return Conflict(new
            {
                message = "Đơn không còn đủ điều kiện thanh toán."
            });
        }

        if (
            booking.NgayNhanPhong <
            DateOnly.FromDateTime(DateTime.Today)
        )
        {
            return Conflict(new
            {
                message = "Đã qua ngày nhận phòng."
            });
        }

        var deposits = await _db.DatCocs
            .AsNoTracking()
            .Where(x => x.MaDatPhong == request.BookingId)
            .OrderByDescending(x => x.MaDatCoc)
            .Select(x => new
            {
                x.MaGiaoDich,
                x.TrangThai,
                x.NgayDatCoc
            })
            .ToListAsync();

        if (deposits.Any(x => Paid(x.TrangThai)))
        {
            return Conflict(new
            {
                message = "Đơn đã được ghi nhận đặt cọc."
            });
        }

        var latest = deposits.FirstOrDefault();

        if (
            latest == null ||
            latest.TrangThai != "Chờ thanh toán"
        )
        {
            return Conflict(new
            {
                message = "Không có giao dịch đang chờ để tiếp tục."
            });
        }

        // Khong mo URL VNPay khi da het han.
        if (
            DateTime.Now < latest.NgayDatCoc ||
            DateTime.Now >= latest.NgayDatCoc.AddMinutes(14)
        )
        {
            return Conflict(new
            {
                message =
                    "Đường dẫn VNPay đã hết hạn. " +
                    "Cần đối soát giao dịch trước khi thanh toán lại."
            });
        }

        if (
            !PendingLinks.TryGetValue(
                request.BookingId,
                out var link
            ) ||
            link.Reference != latest.MaGiaoDich ||
            DateTime.Now >= link.ExpireAt
        )
        {
            return Conflict(new
            {
                message =
                    "Không còn đường dẫn VNPay trong phiên máy chủ. " +
                    "Cần đối soát giao dịch trước khi tạo giao dịch khác."
            });
        }

        return Ok(new
        {
            success = true,
            paymentUrl = link.Url,
            transactionReference = link.Reference
        });
    }

    // =====================================================
    // 4. NHAN IPN TU VNPAY
    // =====================================================

    [HttpGet("ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> Ipn()
    {
        Console.WriteLine(
            $"[VNPAY IPN] Thoi gian: " +
            $"{DateTime.Now:dd/MM/yyyy HH:mm:ss}"
        );

        Console.WriteLine(
            $"[VNPAY IPN] Ma giao dich: " +
            $"{Request.Query["vnp_TxnRef"]}"
        );

        Console.WriteLine(
            $"[VNPAY IPN] Co chu ky: " +
            $"{!string.IsNullOrEmpty(Request.Query["vnp_SecureHash"].ToString())}"
        );

        bool signatureValid =
            _vnpay.Verify(Request.Query) &&
            _vnpay.ValidMerchant(Request.Query);

        Console.WriteLine(
            $"[VNPAY IPN] Xac thuc hop le: {signatureValid}"
        );

        if (!signatureValid)
        {
            return Ok(new
            {
                RspCode = "97",
                Message = "Invalid signature"
            });
        }

        string reference =
            Request.Query["vnp_TxnRef"].ToString();

        string amountText =
            Request.Query["vnp_Amount"].ToString();

        if (!long.TryParse(
            amountText,
            NumberStyles.None,
            CultureInfo.InvariantCulture,
            out long gatewayAmount
        ))
        {
            return Ok(new
            {
                RspCode = "04",
                Message = "Invalid amount"
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        var deposit = await _db.DatCocs
            .FirstOrDefaultAsync(
                x => x.MaGiaoDich == reference
            );

        if (deposit == null)
        {
            return Ok(new
            {
                RspCode = "01",
                Message = "Order not found"
            });
        }

        if (deposit.SoTien * 100m != gatewayAmount)
        {
            return Ok(new
            {
                RspCode = "04",
                Message = "Invalid amount"
            });
        }

        if (deposit.TrangThai != "Chờ thanh toán")
        {
            return Ok(new
            {
                RspCode = "02",
                Message = "Order already processed"
            });
        }

        var booking = await _db.DatPhongs
            .FirstOrDefaultAsync(
                x => x.MaDatPhong == deposit.MaDatPhong
            );

        if (booking == null)
        {
            return Ok(new
            {
                RspCode = "01",
                Message = "Booking not found"
            });
        }

        bool successful =
            Request.Query["vnp_ResponseCode"].ToString() == "00" &&
            Request.Query["vnp_TransactionStatus"].ToString() == "00";

        if (successful)
        {
            if (
                booking.TrangThai != "Chờ xác nhận" &&
                booking.TrangThai != "Đã xác nhận"
            )
            {
                return Ok(new
                {
                    RspCode = "02",
                    Message = "Booking status invalid"
                });
            }

            deposit.TrangThai = "Thành công";
            deposit.GhiChu =
                "VNPay xác nhận thanh toán thành công";

            booking.TrangThai = "Đã đặt cọc";
            booking.NgayXacNhan ??= DateTime.Now;
        }
        else
        {
            deposit.TrangThai = "Thất bại";
            deposit.GhiChu =
                "VNPay trả về giao dịch không thành công";
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        PendingLinks.TryRemove(
            deposit.MaDatPhong,
            out _
        );

        return Ok(new
        {
            RspCode = "00",
            Message = "Confirm Success"
        });
    }

    // =====================================================
    // 5. KIEM TRA RETURN CO CHU KY - SANDBOX DEV
    // =====================================================

    [HttpPost("confirm-return")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> ConfirmReturn(
        [FromBody] Dictionary<string, string>? values,
        [FromServices] IWebHostEnvironment environment)
    {
        if (
            !environment.IsDevelopment() ||
            !_config.GetValue<bool>(
                "VnPay:AllowSignedReturnFallback"
            )
        )
        {
            return StatusCode(403, new
            {
                message =
                    "Chức năng kiểm tra Return chỉ bật khi kiểm thử."
            });
        }

        try
        {
            await _antiforgery.ValidateRequestAsync(HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ yêu cầu không hợp lệ."
            });
        }

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        if (
            values == null ||
            values.Count == 0 ||
            values.Count > 40
        )
        {
            return BadRequest(new
            {
                message = "Thiếu thông tin giao dịch VNPay."
            });
        }

        var queryValues =
            new Dictionary<string, StringValues>(
                StringComparer.Ordinal
            );

        foreach (var item in values)
        {
            if (
                !item.Key.StartsWith(
                    "vnp_",
                    StringComparison.Ordinal
                ) ||
                item.Value == null ||
                item.Value.Length > 2048
            )
            {
                return BadRequest(new
                {
                    message = "Tham số VNPay không hợp lệ."
                });
            }

            queryValues[item.Key] = item.Value;
        }

        var vnpQuery = new QueryCollection(queryValues);

        if (
            !_vnpay.Verify(vnpQuery) ||
            !_vnpay.ValidMerchant(vnpQuery)
        )
        {
            return BadRequest(new
            {
                message =
                    "Không xác minh được chữ ký hoặc merchant VNPay."
            });
        }

        string reference =
            vnpQuery["vnp_TxnRef"].ToString();

        string amountText =
            vnpQuery["vnp_Amount"].ToString();

        if (
            string.IsNullOrWhiteSpace(reference) ||
            !long.TryParse(
                amountText,
                NumberStyles.None,
                CultureInfo.InvariantCulture,
                out long gatewayAmount
            )
        )
        {
            return BadRequest(new
            {
                message = "Mã giao dịch hoặc số tiền không hợp lệ."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        var result = await (
            from deposit in _db.DatCocs
            join booking in _db.DatPhongs
                on deposit.MaDatPhong equals booking.MaDatPhong
            join customer in _db.KhachHangs
                on booking.MaKhachHang equals customer.MaKhachHang
            where deposit.MaGiaoDich == reference &&
                  customer.MaTaiKhoan == accountId.Value
            select new
            {
                Deposit = deposit,
                Booking = booking
            }
        ).FirstOrDefaultAsync();

        if (result == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy giao dịch thuộc tài khoản này."
            });
        }

        var depositRecord = result.Deposit;
        var bookingRecord = result.Booking;

        if (
            depositRecord.SoTien * 100m != gatewayAmount
        )
        {
            return BadRequest(new
            {
                message = "Số tiền VNPay không khớp với tiền cọc."
            });
        }

        if (Paid(depositRecord.TrangThai))
        {
            return Ok(new
            {
                success = true,
                confirmed = true,
                bookingId = bookingRecord.MaDatPhong,
                status = depositRecord.TrangThai,
                message = "Giao dịch đã được xác nhận."
            });
        }

        bool gatewaySuccess =
            vnpQuery["vnp_ResponseCode"].ToString() == "00" &&
            vnpQuery["vnp_TransactionStatus"].ToString() == "00";

        if (!gatewaySuccess)
        {
            return Ok(new
            {
                success = true,
                confirmed = false,
                bookingId = bookingRecord.MaDatPhong,
                status = depositRecord.TrangThai,
                message = "VNPay chưa báo giao dịch thành công."
            });
        }

        if (
            depositRecord.TrangThai != "Chờ thanh toán"
        )
        {
            return Conflict(new
            {
                message =
                    "Giao dịch đã có trạng thái khác. " +
                    "Cần đối soát với VNPay trước khi cập nhật."
            });
        }

        if (
            bookingRecord.TrangThai != "Chờ xác nhận" &&
            bookingRecord.TrangThai != "Đã xác nhận"
        )
        {
            return Conflict(new
            {
                message =
                    "Trạng thái đơn đã thay đổi. " +
                    "Cần kiểm tra giao dịch trước khi ghi nhận."
            });
        }

        bool anotherPaid = await _db.DatCocs
            .AnyAsync(x =>
                x.MaDatPhong == bookingRecord.MaDatPhong &&
                x.MaDatCoc != depositRecord.MaDatCoc &&
                (
                    x.TrangThai == "Thành công" ||
                    x.TrangThai == "Đã thanh toán"
                )
            );

        if (anotherPaid)
        {
            return Conflict(new
            {
                message =
                    "Đơn đã có giao dịch cọc được thanh toán."
            });
        }

        // Chi su dung de kiem thu trong Development.
        depositRecord.TrangThai = "Thành công";
        depositRecord.GhiChu =
            "VNPay Sandbox: xác minh Return có chữ ký " +
            "(Development fallback)";

        bookingRecord.TrangThai = "Đã đặt cọc";
        bookingRecord.NgayXacNhan ??= DateTime.Now;

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        PendingLinks.TryRemove(
            bookingRecord.MaDatPhong,
            out _
        );

        return Ok(new
        {
            success = true,
            confirmed = true,
            bookingId = bookingRecord.MaDatPhong,
            status = depositRecord.TrangThai,
            message = "Đã xác minh kết quả VNPay Sandbox."
        });
    }

    // =====================================================
    // 6. XEM TRANG THAI THANH TOAN THEO MA GIAO DICH
    // =====================================================

    [HttpGet("status")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Status(
        [FromQuery] string reference)
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var result = await (
            from deposit in _db.DatCocs.AsNoTracking()
            join booking in _db.DatPhongs.AsNoTracking()
                on deposit.MaDatPhong equals booking.MaDatPhong
            join customer in _db.KhachHangs.AsNoTracking()
                on booking.MaKhachHang equals customer.MaKhachHang
            where deposit.MaGiaoDich == reference &&
                  customer.MaTaiKhoan == accountId.Value
            select new
            {
                status = deposit.TrangThai,
                amount = deposit.SoTien,
                bookingId = deposit.MaDatPhong
            }
        ).FirstOrDefaultAsync();

        if (result == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy giao dịch."
            });
        }

        return Ok(result);
    }
}
