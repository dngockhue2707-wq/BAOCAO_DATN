
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

public class CreateBookingDto
{
    public int RoomTypeId { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime CheckOut { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; }
    public string? Note { get; set; }
}

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    private static readonly string[] BlockingStatuses =
    {
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đã đặt cọc",
        "Đã nhận phòng"
    };

    public BookingController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
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

    private async Task<int?> CustomerId()
    {
        var accountId = AccountId();

        if (!accountId.HasValue)
            return null;

        return await _db.KhachHangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId.Value)
            .Select(x => (int?)x.MaKhachHang)
            .FirstOrDefaultAsync();
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create(
        [FromBody] CreateBookingDto dto)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ. Vui lòng tải lại trang."
            });

        int? customerId = await CustomerId();

        if (!customerId.HasValue)
            return Unauthorized(new
            {
                message = "Không tìm thấy hồ sơ khách hàng."
            });

        DateTime start = dto.CheckIn.Date;
        DateTime end = dto.CheckOut.Date;
        int nights = (end - start).Days;

        if (dto.RoomTypeId <= 0 ||
            start < DateTime.Today ||
            nights < 1 || nights > 30 ||
            dto.Adults < 1 || dto.Adults > 20 ||
            dto.Children < 0 || dto.Children > 20)
        {
            return BadRequest(new
            {
                message = "Thông tin đặt phòng không hợp lệ."
            });
        }

        string? note = dto.Note?.Trim();

        if (note?.Length > 500)
            return BadRequest(new
            {
                message = "Ghi chú tối đa 500 ký tự."
            });

        DateOnly checkIn = DateOnly.FromDateTime(start);
        DateOnly checkOut = DateOnly.FromDateTime(end);

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            var type = await _db.LoaiPhongs
                .AsNoTracking()
                .Where(x =>
                    x.MaLoaiPhong == dto.RoomTypeId &&
                    x.TrangThai &&
                    x.SucChuaNguoiLon >= dto.Adults &&
                    x.SucChuaTreEm >= dto.Children)
                .Select(x => new
                {
                    x.MaLoaiPhong,
                    x.GiaCoBan
                })
                .FirstOrDefaultAsync();

            if (type == null)
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại hoặc không đủ sức chứa."
                });

            var busyIds =
                from detail in _db.ChiTietDatPhongs
                join existingBooking in _db.DatPhongs
                    on detail.MaDatPhong equals existingBooking.MaDatPhong
                where BlockingStatuses.Contains(existingBooking.TrangThai)
                    && existingBooking.NgayNhanPhong < checkOut
                    && existingBooking.NgayTraPhong > checkIn
                select detail.MaPhong;

            var room = await _db.Phongs
                .Where(x =>
                    x.MaLoaiPhong == dto.RoomTypeId &&
                    x.TrangThai == "Trống" &&
                    !busyIds.Contains(x.MaPhong))
                .OrderBy(x => x.MaPhong)
                .FirstOrDefaultAsync();

            if (room == null)
                return Conflict(new
                {
                    message = "Không còn phòng trống trong thời gian đã chọn."
                });

            decimal price = type.GiaCoBan;
            decimal total = price * nights;

            var booking = new DatPhong
            {
                MaKhachHang = customerId.Value,
                NgayDat = DateTime.Now,
                NgayNhanPhong = checkIn,
                NgayTraPhong = checkOut,
                SoNguoiLon = dto.Adults,
                SoTreEm = dto.Children,
                TrangThai = "Chờ xác nhận",
                GhiChu = note
            };

            _db.DatPhongs.Add(booking);
            await _db.SaveChangesAsync();

            _db.ChiTietDatPhongs.Add(new ChiTietDatPhong
            {
                MaDatPhong = booking.MaDatPhong,
                MaPhong = room.MaPhong,
                DonGia = price,
                SoDem = nights,
                ThanhTien = total
            });

            _db.LichSuTuongTacs.Add(new LichSuTuongTac
            {
                MaKhachHang = customerId.Value,
                MaLoaiPhong = dto.RoomTypeId,
                LoaiTuongTac = "Đặt phòng",
                ThoiGian = DateTime.Now,
                MucDoQuanTam = 5m
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Đặt phòng thành công! Đơn đang chờ xác nhận.",
                bookingId = booking.MaDatPhong,
                roomId = room.MaPhong,
                nights,
                pricePerNight = price,
                total,
                status = booking.TrangThai
            });
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is SqlException
            {
                Number: 1205 or 1222 or 3960
            })
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message = "Phòng đang có yêu cầu đặt khác. Vui lòng thử lại."
            });
        }
        catch (SqlException ex)
            when (ex.Number is 1205 or 1222 or 3960)
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message = "Phòng đang được đặt. Vui lòng thử lại."
            });
        }
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMine()
    {
        int? customerId = await CustomerId();

        if (!customerId.HasValue)
            return Unauthorized();

        var bookings = await (
            from b in _db.DatPhongs.AsNoTracking()
            join d in _db.ChiTietDatPhongs.AsNoTracking()
                on b.MaDatPhong equals d.MaDatPhong
            join p in _db.Phongs.AsNoTracking()
                on d.MaPhong equals p.MaPhong
            join t in _db.LoaiPhongs.AsNoTracking()
                on p.MaLoaiPhong equals t.MaLoaiPhong
            where b.MaKhachHang == customerId.Value
            orderby b.NgayDat descending, b.MaDatPhong descending
            select new
            {
                bookingId = b.MaDatPhong,
                roomName = t.TenLoaiPhong,
                roomNumber = p.SoPhong,
                bookedAt = b.NgayDat,
                checkIn = b.NgayNhanPhong,
                checkOut = b.NgayTraPhong,
                adults = b.SoNguoiLon,
                children = b.SoTreEm,
                status = b.TrangThai,
                total = d.ThanhTien
            }
        ).ToListAsync();

        return Ok(new
        {
            success = true,
            bookings
        });
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Cancel(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ."
            });

        int? customerId = await CustomerId();

        if (!customerId.HasValue)
            return Unauthorized();

        if (id <= 0)
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var booking = await _db.DatPhongs
            .FirstOrDefaultAsync(x =>
                x.MaDatPhong == id &&
                x.MaKhachHang == customerId.Value);

        if (booking == null)
            return NotFound(new
            {
                message = "Không tìm thấy đơn đặt phòng."
            });

        if (booking.TrangThai != "Chờ xác nhận" &&
            booking.TrangThai != "Đã xác nhận")
        {
            return BadRequest(new
            {
                message = "Trạng thái đơn không cho phép tự hủy."
            });
        }

        if (booking.NgayNhanPhong <=
            DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message = "Đã đến ngày nhận phòng. Vui lòng liên hệ khách sạn."
            });
        }

        bool hasPaid = await _db.DatCocs
            .AnyAsync(x =>
                x.MaDatPhong == id &&
                (x.TrangThai == "Thành công" ||
                 x.TrangThai == "Đã thanh toán"));

        if (hasPaid)
            return Conflict(new
            {
                message = "Đơn đã có tiền cọc. Vui lòng liên hệ khách sạn để được xử lý hủy và hoàn cọc."
            });

        bool hasPendingPayment = await _db.DatCocs
            .AnyAsync(x =>
                x.MaDatPhong == id &&
                (x.TrangThai == "Chờ thanh toán" ||
                 x.TrangThai == "Hết hạn"));

        if (hasPendingPayment)
            return Conflict(new
            {
                message = "Đơn có giao dịch VNPay cần đối soát trước khi hủy."
            });

        booking.TrangThai = "Đã hủy";
        booking.LyDoHuy = "Khách hàng tự hủy";

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message = "Hủy đặt phòng thành công."
        });
    }

    [HttpGet("management")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Management()
    {
        var bookings = await (
            from b in _db.DatPhongs.AsNoTracking()
            join c in _db.KhachHangs.AsNoTracking()
                on b.MaKhachHang equals c.MaKhachHang
            orderby b.NgayDat descending
            select new
            {
                bookingId = b.MaDatPhong,
                customerName = c.HoTen,
                checkIn = b.NgayNhanPhong,
                checkOut = b.NgayTraPhong,
                adults = b.SoNguoiLon,
                children = b.SoTreEm,
                status = b.TrangThai,
                bookedAt = b.NgayDat,
                confirmedAt = b.NgayXacNhan
            }
        ).ToListAsync();

        return Ok(new
        {
            success = true,
            bookings
        });
    }

    [HttpPost("{id:int}/confirm")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Confirm(int id)
    {
        if (!await ValidCsrf())
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ."
            });

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var employeeId = await _db.NhanViens
            .AsNoTracking()
            .Where(x =>
                x.MaTaiKhoan == accountId.Value &&
                x.TrangThai)
            .Select(x => (int?)x.MaNhanVien)
            .FirstOrDefaultAsync();

        if (!employeeId.HasValue)
            return Forbid();

        int affected = await _db.DatPhongs
            .Where(x =>
                x.MaDatPhong == id &&
                x.TrangThai == "Chờ xác nhận" &&
                x.NgayNhanPhong >=
                    DateOnly.FromDateTime(DateTime.Today))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.TrangThai, "Đã xác nhận")
                .SetProperty(x => x.MaNhanVienXacNhan, employeeId)
                .SetProperty(x => x.NgayXacNhan, DateTime.Now));

        if (affected == 0)
            return Conflict(new
            {
                message = "Không thể xác nhận. Đơn không tồn tại hoặc trạng thái đã thay đổi."
            });

        return Ok(new
        {
            success = true,
            message = "Xác nhận đặt phòng thành công.",
            bookingId = id,
            status = "Đã xác nhận"
        });
    }
}
