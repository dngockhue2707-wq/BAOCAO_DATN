
using System;
using System.Data;
using System.Linq;
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

public sealed class CreateCancellationRequestDto
{
    public int BookingId { get; set; }

    public string Reason { get; set; } = "";
}

public sealed class ProcessCancellationDto
{
    public string? Note { get; set; }
}

public sealed class ConfirmRefundDto
{
    public string PaymentMethod { get; set; } = "";

    public string TransactionReference { get; set; } = "";

    public string? Note { get; set; }
}

[ApiController]
[Route("api/cancellations")]
[Authorize]
public sealed class CancellationController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    private const string Pending = "Chờ xử lý";
    private const string Approved = "Đã duyệt";
    private const string Rejected = "Từ chối";

    private const string RefundPending = "Chờ hoàn";
    private const string Refunded = "Đã hoàn";

    public CancellationController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    // Thoi gian Viet Nam UTC+7.
    private static DateTime VietnamNow()
    {
        return DateTime.UtcNow.AddHours(7);
    }

    // Gio nhan phong quy uoc: 14:00.
    private static DateTime CheckInTime(DateOnly date)
    {
        return date.ToDateTime(new TimeOnly(14, 0));
    }

    private static bool IsPaid(string status)
    {
        return status == "Thành công" ||
               status == "Đã thanh toán";
    }

    private static bool HasUnresolvedPayment(string status)
    {
        return status == "Chờ thanh toán" ||
               status == "Hết hạn";
    }

    private static bool CanCancelBooking(string status)
    {
        return status == "Chờ xác nhận" ||
               status == "Đã xác nhận" ||
               status == "Đã đặt cọc";
    }

    private static decimal CalculateRefundRate(
        DateTime requestTime,
        DateOnly checkIn)
    {
        double hours =
            (CheckInTime(checkIn) - requestTime).TotalHours;

        if (hours >= 72)
            return 100m;

        if (hours >= 24)
            return 50m;

        return 0m;
    }

    private static decimal CalculateAmount(
        decimal deposit,
        decimal rate)
    {
        return Math.Round(
            deposit * rate / 100m,
            0,
            MidpointRounding.AwayFromZero
        );
    }

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
    }

    private async Task<int?> CustomerId(
        CancellationToken ct)
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return null;

        return await _db.KhachHangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId.Value)
            .Select(x => (int?)x.MaKhachHang)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<int?> EmployeeId(
        CancellationToken ct)
    {
        int? accountId = AccountId();

        if (!accountId.HasValue)
            return null;

        return await _db.NhanViens
            .AsNoTracking()
            .Where(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai)
            .Select(x => (int?)x.MaNhanVien)
            .FirstOrDefaultAsync(ct);
    }

    private async Task<bool> ValidCsrf()
    {
        try
        {
            await _antiforgery.ValidateRequestAsync(
                HttpContext
            );

            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }

    // =====================================================
    // 1. CUSTOMER GUI YEU CAU HUY PHONG DA DAT COC
    // =====================================================

    [HttpPost("request")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateRequest(
        [FromBody] CreateCancellationRequestDto dto,
        CancellationToken ct)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message =
                    "Phiên bảo mật không hợp lệ. " +
                    "Vui lòng tải lại trang."
            });
        }

        if (dto == null || dto.BookingId <= 0)
        {
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });
        }

        string reason = dto.Reason?.Trim() ?? "";

        if (reason.Length < 5 || reason.Length > 500)
        {
            return BadRequest(new
            {
                message =
                    "Lý do hủy phải có từ 5 đến 500 ký tự."
            });
        }

        int? customerId = await CustomerId(ct);

        if (!customerId.HasValue)
            return Unauthorized();

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct
            );

        var booking = await _db.DatPhongs
            .FirstOrDefaultAsync(x =>
                x.MaDatPhong == dto.BookingId &&
                x.MaKhachHang == customerId.Value,
                ct
            );

        if (booking == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy đơn đặt phòng của bạn."
            });
        }

        if (!CanCancelBooking(booking.TrangThai))
        {
            return Conflict(new
            {
                message =
                    "Trạng thái đơn không cho phép yêu cầu hủy."
            });
        }

        DateTime now = VietnamNow();

        if (CheckInTime(booking.NgayNhanPhong) <= now)
        {
            return Conflict(new
            {
                message =
                    "Đã đến giờ nhận phòng. " +
                    "Vui lòng liên hệ khách sạn để được hỗ trợ."
            });
        }

        bool hasPendingRequest =
            await _db.YeuCauHuyPhongs.AnyAsync(x =>
                x.MaDatPhong == booking.MaDatPhong &&
                x.TrangThai == Pending,
                ct
            );

        if (hasPendingRequest)
        {
            return Conflict(new
            {
                message =
                    "Đơn này đã có yêu cầu hủy đang chờ xử lý."
            });
        }

        bool hasApprovedRequest =
            await _db.YeuCauHuyPhongs.AnyAsync(x =>
                x.MaDatPhong == booking.MaDatPhong &&
                x.TrangThai == Approved,
                ct
            );

        if (hasApprovedRequest)
        {
            return Conflict(new
            {
                message =
                    "Đơn này đã có yêu cầu hủy được duyệt."
            });
        }

        var deposits = await _db.DatCocs
            .AsNoTracking()
            .Where(x => x.MaDatPhong == booking.MaDatPhong)
            .ToListAsync(ct);

        if (deposits.Any(x =>
            HasUnresolvedPayment(x.TrangThai)))
        {
            return Conflict(new
            {
                message =
                    "Đơn đang có giao dịch VNPay cần đối soát. " +
                    "Chưa thể tạo yêu cầu hủy."
            });
        }

        decimal totalDeposit = deposits
            .Where(x => IsPaid(x.TrangThai))
            .Sum(x => x.SoTien);

        if (totalDeposit <= 0)
        {
            return Conflict(new
            {
                message =
                    "Đơn chưa có tiền cọc thành công. " +
                    "Bạn có thể dùng chức năng tự hủy hiện tại."
            });
        }

        decimal rate = CalculateRefundRate(
            now,
            booking.NgayNhanPhong
        );

        decimal estimatedRefund = CalculateAmount(
            totalDeposit,
            rate
        );

        var cancellation = new YeuCauHuyPhong
        {
            MaDatPhong = booking.MaDatPhong,
            LyDoHuy = reason,
            NgayYeuCau = now,
            TrangThai = Pending,
            TongTienCoc = totalDeposit,
            TyLeHoan = rate,
            SoTienDuKienHoan = estimatedRefund
        };

        _db.YeuCauHuyPhongs.Add(cancellation);

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new
        {
            success = true,
            message =
                "Đã gửi yêu cầu hủy phòng. " +
                "Vui lòng chờ khách sạn xử lý.",
            requestId = cancellation.MaYeuCau,
            bookingId = booking.MaDatPhong,
            status = cancellation.TrangThai,
            depositAmount = totalDeposit,
            refundRate = rate,
            estimatedRefund
        });
    }

    // =====================================================
    // 2. CUSTOMER XEM YEU CAU CUA MINH
    // =====================================================

    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Mine(
        CancellationToken ct)
    {
        int? customerId = await CustomerId(ct);

        if (!customerId.HasValue)
            return Unauthorized();

        var requests = await (
            from request in _db.YeuCauHuyPhongs
                .AsNoTracking()
            join booking in _db.DatPhongs
                .AsNoTracking()
                on request.MaDatPhong
                equals booking.MaDatPhong
            where booking.MaKhachHang == customerId.Value
            orderby request.NgayYeuCau descending
            select new
            {
                requestId = request.MaYeuCau,
                bookingId = request.MaDatPhong,
                reason = request.LyDoHuy,
                requestedAt = request.NgayYeuCau,
                status = request.TrangThai,
                depositAmount = request.TongTienCoc,
                refundRate = request.TyLeHoan,
                estimatedRefund = request.SoTienDuKienHoan,
                processedAt = request.NgayXuLy,
                processingNote = request.GhiChuXuLy,
                bookingStatus = booking.TrangThai
            }
        ).ToListAsync(ct);

        var requestIds = requests
            .Select(x => x.requestId)
            .ToList();

        var refunds = await _db.HoanCocs
            .AsNoTracking()
            .Where(x => requestIds.Contains(x.MaYeuCau))
            .Select(x => new
            {
                requestId = x.MaYeuCau,
                amount = x.SoTienHoan,
                status = x.TrangThai,
                refundedAt = x.NgayHoan
            })
            .ToListAsync(ct);

        var result = requests.Select(x => new
        {
            x.requestId,
            x.bookingId,
            x.reason,
            x.requestedAt,
            x.status,
            x.depositAmount,
            x.refundRate,
            x.estimatedRefund,
            x.processedAt,
            x.processingNote,
            x.bookingStatus,
            refundStatus = refunds
                .Where(r => r.requestId == x.requestId)
                .Select(r => r.status)
                .Distinct()
                .ToList(),
            refundedAmount = refunds
                .Where(r =>
                    r.requestId == x.requestId &&
                    r.status == Refunded)
                .Sum(r => r.amount)
        });

        return Ok(new
        {
            success = true,
            requests = result
        });
    }

    // =====================================================
    // 3. STAFF / ADMIN XEM DANH SACH YEU CAU
    // =====================================================

    [HttpGet("management")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Management(
        CancellationToken ct)
    {
        var requests = await (
            from request in _db.YeuCauHuyPhongs
                .AsNoTracking()
            join booking in _db.DatPhongs
                .AsNoTracking()
                on request.MaDatPhong
                equals booking.MaDatPhong
            join customer in _db.KhachHangs
                .AsNoTracking()
                on booking.MaKhachHang
                equals customer.MaKhachHang
            orderby request.NgayYeuCau descending
            select new
            {
                requestId = request.MaYeuCau,
                bookingId = request.MaDatPhong,
                customerName = customer.HoTen,
                reason = request.LyDoHuy,
                requestedAt = request.NgayYeuCau,
                checkIn = booking.NgayNhanPhong,
                checkOut = booking.NgayTraPhong,
                bookingStatus = booking.TrangThai,
                status = request.TrangThai,
                depositAmount = request.TongTienCoc,
                refundRate = request.TyLeHoan,
                estimatedRefund = request.SoTienDuKienHoan,
                processedAt = request.NgayXuLy,
                processingNote = request.GhiChuXuLy
            }
        ).ToListAsync(ct);

        return Ok(new
        {
            success = true,
            requests
        });
    }

    // =====================================================
    // 4. STAFF / ADMIN DUYET YEU CAU
    // =====================================================

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] ProcessCancellationDto? dto,
        CancellationToken ct)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        int? employeeId = await EmployeeId(ct);

        if (!employeeId.HasValue)
        {
            return StatusCode(403, new
            {
                message =
                    "Tài khoản chưa có hồ sơ nhân viên đang hoạt động."
            });
        }

        string note = dto?.Note?.Trim() ?? "";

        if (note.Length > 500)
        {
            return BadRequest(new
            {
                message = "Ghi chú tối đa 500 ký tự."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct
            );

        var request = await _db.YeuCauHuyPhongs
            .FirstOrDefaultAsync(
                x => x.MaYeuCau == id,
                ct
            );

        if (request == null)
            return NotFound(new
            {
                message = "Không tìm thấy yêu cầu."
            });

        if (request.TrangThai != Pending)
        {
            return Conflict(new
            {
                message = "Yêu cầu đã được xử lý."
            });
        }

        var booking = await _db.DatPhongs
            .FirstOrDefaultAsync(
                x => x.MaDatPhong == request.MaDatPhong,
                ct
            );

        if (booking == null ||
            !CanCancelBooking(booking.TrangThai))
        {
            return Conflict(new
            {
                message =
                    "Đơn đặt phòng không còn đủ điều kiện hủy."
            });
        }

        // Khong tu dong duyet neu khach da check-in.
        if (booking.TrangThai == "Đã nhận phòng")
        {
            return Conflict(new
            {
                message = "Khách đã nhận phòng."
            });
        }

        var deposits = await _db.DatCocs
            .Where(x => x.MaDatPhong == booking.MaDatPhong)
            .ToListAsync(ct);

        if (deposits.Any(x =>
            HasUnresolvedPayment(x.TrangThai)))
        {
            return Conflict(new
            {
                message =
                    "Đơn còn giao dịch VNPay chưa đối soát."
            });
        }

        var paidDeposits = deposits
            .Where(x => IsPaid(x.TrangThai))
            .ToList();

        decimal currentDeposit = paidDeposits
            .Sum(x => x.SoTien);

        if (currentDeposit <= 0 ||
            currentDeposit != request.TongTienCoc)
        {
            return Conflict(new
            {
                message =
                    "Tiền cọc hiện tại không khớp với " +
                    "thời điểm gửi yêu cầu. Cần kiểm tra lại."
            });
        }

        decimal expectedRate = CalculateRefundRate(
            request.NgayYeuCau,
            booking.NgayNhanPhong
        );

        decimal expectedRefund = CalculateAmount(
            currentDeposit,
            expectedRate
        );

        if (request.TyLeHoan != expectedRate ||
            request.SoTienDuKienHoan != expectedRefund)
        {
            return Conflict(new
            {
                message =
                    "Mức hoàn cọc lưu trong yêu cầu không khớp " +
                    "chính sách. Cần kiểm tra trước khi duyệt."
            });
        }

        request.TrangThai = Approved;
        request.MaNhanVienXuLy = employeeId.Value;
        request.NgayXuLy = VietnamNow();
        request.GhiChuXuLy = note;

        booking.TrangThai = "Đã hủy";
        booking.LyDoHuy = request.LyDoHuy;

        // Neu khong duoc hoan coc, khong tao
        // giao dich HoanCoc co so tien bang 0.
        if (expectedRefund > 0)
        {
            decimal remaining = expectedRefund;

            for (int i = 0; i < paidDeposits.Count; i++)
            {
                var deposit = paidDeposits[i];

                decimal amount = i == paidDeposits.Count - 1
                    ? remaining
                    : CalculateAmount(
                        deposit.SoTien,
                        expectedRate
                    );

                if (amount > remaining)
                    amount = remaining;

                remaining -= amount;

                if (amount <= 0)
                    continue;

                _db.HoanCocs.Add(new HoanCoc
                {
                    MaYeuCau = request.MaYeuCau,
                    MaDatCoc = deposit.MaDatCoc,
                    SoTienHoan = amount,
                    TrangThai = RefundPending,
                    NgayTao = VietnamNow(),
                    GhiChu =
                        "Chờ nhân viên thực hiện hoàn cọc"
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new
        {
            success = true,
            message = expectedRefund > 0
                ? "Đã duyệt hủy phòng. " +
                  "Yêu cầu hoàn cọc đang chờ thực hiện."
                : "Đã duyệt hủy phòng. " +
                  "Không phát sinh tiền cọc được hoàn.",
            requestId = id,
            bookingId = booking.MaDatPhong,
            bookingStatus = booking.TrangThai,
            refundRate = expectedRate,
            refundAmount = expectedRefund
        });
    }

    // =====================================================
    // 5. STAFF / ADMIN TU CHOI YEU CAU
    // =====================================================

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] ProcessCancellationDto? dto,
        CancellationToken ct)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        int? employeeId = await EmployeeId(ct);

        if (!employeeId.HasValue)
        {
            return StatusCode(403, new
            {
                message = "Không tìm thấy hồ sơ nhân viên."
            });
        }

        string note = dto?.Note?.Trim() ?? "";

        if (note.Length < 5 || note.Length > 500)
        {
            return BadRequest(new
            {
                message =
                    "Vui lòng nhập lý do từ chối " +
                    "từ 5 đến 500 ký tự."
            });
        }

        int affected = await _db.YeuCauHuyPhongs
            .Where(x =>
                x.MaYeuCau == id &&
                x.TrangThai == Pending)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.TrangThai, Rejected)
                    .SetProperty(
                        x => x.MaNhanVienXuLy,
                        employeeId)
                    .SetProperty(
                        x => x.NgayXuLy,
                        VietnamNow())
                    .SetProperty(
                        x => x.GhiChuXuLy,
                        note),
                ct
            );

        if (affected == 0)
        {
            return Conflict(new
            {
                message =
                    "Yêu cầu không tồn tại hoặc đã được xử lý."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã từ chối yêu cầu hủy phòng.",
            requestId = id
        });
    }

    // =====================================================
    // 6. STAFF / ADMIN XEM GIAO DICH HOAN COC
    // =====================================================

    [HttpGet("refunds")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Refunds(
        CancellationToken ct)
    {
        var refunds = await (
            from refund in _db.HoanCocs.AsNoTracking()
            join request in _db.YeuCauHuyPhongs
                .AsNoTracking()
                on refund.MaYeuCau equals request.MaYeuCau
            orderby refund.NgayTao descending
            select new
            {
                refundId = refund.MaHoanCoc,
                requestId = refund.MaYeuCau,
                bookingId = request.MaDatPhong,
                depositId = refund.MaDatCoc,
                amount = refund.SoTienHoan,
                status = refund.TrangThai,
                paymentMethod = refund.PhuongThuc,
                transactionReference =
                    refund.MaGiaoDichHoan,
                createdAt = refund.NgayTao,
                refundedAt = refund.NgayHoan,
                note = refund.GhiChu
            }
        ).ToListAsync(ct);

        return Ok(new
        {
            success = true,
            refunds
        });
    }

    // =====================================================
    // 7. XAC NHAN DA HOAN TIEN THUC TE
    // =====================================================

    [HttpPost("refunds/{id:int}/confirm")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> ConfirmRefund(
        int id,
        [FromBody] ConfirmRefundDto dto,
        CancellationToken ct)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        int? employeeId = await EmployeeId(ct);

        if (!employeeId.HasValue)
        {
            return StatusCode(403, new
            {
                message = "Không tìm thấy hồ sơ nhân viên."
            });
        }

        string method = dto?.PaymentMethod?.Trim() ?? "";

        string reference =
            dto?.TransactionReference?.Trim() ?? "";

        string note = dto?.Note?.Trim() ?? "";

        if (method.Length < 2 || method.Length > 50 ||
            reference.Length < 3 || reference.Length > 100 ||
            note.Length > 500)
        {
            return BadRequest(new
            {
                message =
                    "Vui lòng nhập phương thức hoàn, " +
                    "mã giao dịch hoàn tiền hợp lệ."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                ct
            );

        var refund = await _db.HoanCocs
            .FirstOrDefaultAsync(
                x => x.MaHoanCoc == id,
                ct
            );

        if (refund == null)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy giao dịch hoàn cọc."
            });
        }

        if (refund.TrangThai != RefundPending)
        {
            return Conflict(new
            {
                message =
                    "Giao dịch không ở trạng thái chờ hoàn."
            });
        }

        var request = await _db.YeuCauHuyPhongs
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.MaYeuCau == refund.MaYeuCau,
                ct
            );

        if (request == null ||
            request.TrangThai != Approved)
        {
            return Conflict(new
            {
                message =
                    "Yêu cầu hủy chưa được duyệt."
            });
        }

        bool duplicateReference = await _db.HoanCocs
            .AnyAsync(x =>
                x.MaHoanCoc != id &&
                x.TrangThai == Refunded &&
                x.MaGiaoDichHoan == reference,
                ct
            );

        if (duplicateReference)
        {
            return Conflict(new
            {
                message =
                    "Mã giao dịch hoàn tiền đã được sử dụng."
            });
        }

        // Chi goi endpoint nay SAU KHI da chuyen tien
        // va kiem tra giao dich hoan thanh thuc te.
        refund.TrangThai = Refunded;
        refund.PhuongThuc = method;
        refund.MaGiaoDichHoan = reference;
        refund.MaNhanVienThucHien = employeeId.Value;
        refund.NgayHoan = VietnamNow();
        refund.GhiChu = note;

        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return Ok(new
        {
            success = true,
            message = "Đã ghi nhận hoàn cọc thành công.",
            refundId = refund.MaHoanCoc,
            amount = refund.SoTienHoan,
            status = refund.TrangThai
        });
    }
}
