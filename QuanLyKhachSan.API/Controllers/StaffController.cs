
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Roles = "Staff")]
public class StaffController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public StaffController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
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

    private int? AccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        var pending = await _db.Set<DatPhong>()
            .CountAsync(x => x.TrangThai == "Chờ xác nhận");

        var arrivalsToday = await _db.Set<DatPhong>()
            .CountAsync(x =>
                x.NgayNhanPhong == today &&
                (x.TrangThai == "Đã xác nhận" ||
                 x.TrangThai == "Đã đặt cọc"));

        var checkedIn = await _db.Set<DatPhong>()
            .CountAsync(x => x.TrangThai == "Đã nhận phòng");

        var cleaning = await _db.Set<Phong>()
            .CountAsync(x => x.TrangThai == "Đang dọn");

        return Ok(new
        {
            pending,
            arrivalsToday,
            checkedIn,
            cleaning
        });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings()
    {
        var items = await (
            from booking in _db.Set<DatPhong>()
            join customer in _db.Set<KhachHang>()
                on booking.MaKhachHang equals customer.MaKhachHang
            join detail in _db.Set<ChiTietDatPhong>()
                on booking.MaDatPhong equals detail.MaDatPhong
            join room in _db.Set<Phong>()
                on detail.MaPhong equals room.MaPhong
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby booking.MaDatPhong descending
            select new
            {
                id = booking.MaDatPhong,
                customer = customer.HoTen,
                roomNumber = room.SoPhong,
                roomType = type.TenLoaiPhong,
                checkIn = booking.NgayNhanPhong,
                checkOut = booking.NgayTraPhong,
                status = booking.TrangThai
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPost("bookings/{id:int}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        int? accountId = AccountId();

        if (!accountId.HasValue)
            return Unauthorized();

        var employeeId = await _db.Set<NhanVien>()
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId.Value)
            .Select(x => (int?)x.MaNhanVien)
            .FirstOrDefaultAsync();

        if (!employeeId.HasValue)
        {
            return BadRequest(new
            {
                message = "Không tìm thấy hồ sơ nhân viên."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        int affected = await _db.Set<DatPhong>()
            .Where(x =>
                x.MaDatPhong == id &&
                x.TrangThai == "Chờ xác nhận" &&
                x.NgayNhanPhong >= today)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(
                    x => x.TrangThai,
                    "Đã xác nhận")
                .SetProperty(
                    x => x.NgayXacNhan,
                    DateTime.Now)
                .SetProperty(
                    x => x.MaNhanVienXacNhan,
                    employeeId.Value));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Không thể xác nhận đơn này."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã xác nhận đơn."
        });
    }

    [HttpPost("bookings/{id:int}/check-in")]
    public async Task<IActionResult> CheckIn(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            var booking = await _db.Set<DatPhong>()
                .FirstOrDefaultAsync(x =>
                    x.MaDatPhong == id &&
                    (x.TrangThai == "Đã xác nhận" ||
                     x.TrangThai == "Đã đặt cọc") &&
                    x.NgayNhanPhong <= today &&
                    x.NgayTraPhong > today);

            if (booking == null)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Đơn chưa đủ điều kiện nhận phòng."
                });
            }

            var roomIds = await _db.Set<ChiTietDatPhong>()
                .Where(x => x.MaDatPhong == id)
                .Select(x => x.MaPhong)
                .ToListAsync();

            if (roomIds.Count == 0)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Đơn chưa có phòng được phân bổ."
                });
            }

            int occupied = await _db.Set<Phong>()
                .CountAsync(x =>
                    roomIds.Contains(x.MaPhong) &&
                    x.TrangThai != "Trống");

            if (occupied > 0)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Chưa thể nhận phòng. Kiểm tra lịch và trạng thái phòng."
                });
            }

            booking.TrangThai = "Đã nhận phòng";

            int updatedRooms = await _db.Set<Phong>()
                .Where(x =>
                    roomIds.Contains(x.MaPhong) &&
                    x.TrangThai == "Trống")
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đang sử dụng"));

            if (updatedRooms != roomIds.Distinct().Count())
            {
                await transaction.RollbackAsync();

                return Conflict(new
                {
                    message = "Trạng thái phòng đã thay đổi. Vui lòng thử lại."
                });
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Nhận phòng thành công."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPost("bookings/{id:int}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            var booking = await _db.Set<DatPhong>()
                .FirstOrDefaultAsync(x =>
                    x.MaDatPhong == id &&
                    x.TrangThai == "Đã nhận phòng");

            if (booking == null)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Đơn không ở trạng thái đã nhận phòng."
                });
            }

            var roomIds = await _db.Set<ChiTietDatPhong>()
                .Where(x => x.MaDatPhong == id)
                .Select(x => x.MaPhong)
                .ToListAsync();

            if (roomIds.Count == 0)
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Không tìm thấy phòng của đơn đặt."
                });
            }

            booking.TrangThai = "Đã trả phòng";

            await _db.Set<Phong>()
                .Where(x => roomIds.Contains(x.MaPhong))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đang dọn"));

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Trả phòng thành công. Phòng chuyển sang đang dọn."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    
    [HttpGet("operations/rooms")]
    private async Task<bool> HasActiveBooking(int roomId)
    {
        return await (
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where detail.MaPhong == roomId
                && booking.TrangThai == "Đã nhận phòng"
            select booking.MaDatPhong
        ).AnyAsync();
    }

    private async Task<bool> HasUpcomingBooking(int roomId)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        return await (
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where detail.MaPhong == roomId
                && (booking.TrangThai == "Chờ xác nhận"
                    || booking.TrangThai == "Đã xác nhận"
                    || booking.TrangThai == "Đã đặt cọc"
                    || booking.TrangThai == "Đã nhận phòng")
                && booking.NgayTraPhong > today
            select booking.MaDatPhong
        ).AnyAsync();
    }

    [HttpPost("operations/rooms/{id:int}/cleaned")]
    public async Task<IActionResult> MarkRoomCleaned(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (await HasActiveBooking(id))
        {
            return BadRequest(new
            {
                message = "Không thể hoàn tất dọn phòng khi phòng vẫn có khách."
            });
        }

        if (await HasUpcomingBooking(id))
        {
            return BadRequest(new
            {
                message = "Phòng đang có đơn đặt chưa hoàn tất. Vui lòng kiểm tra lịch đặt phòng trước khi đưa phòng về trạng thái trống."
            });
        }

        int affected = await _db.Set<Phong>()
            .Where(x => x.MaPhong == id && x.TrangThai == "Đang dọn")
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.TrangThai, "Trống"));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Phòng không ở trạng thái đang dọn hoặc không tồn tại."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã hoàn tất vệ sinh. Phòng hiện đã sẵn sàng."
        });
    }

    [HttpPost("operations/rooms/{id:int}/maintenance")]
    public async Task<IActionResult> StartRoomMaintenance(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (await HasActiveBooking(id))
        {
            return BadRequest(new
            {
                message = "Không thể bảo trì phòng đang có khách."
            });
        }

        if (await HasUpcomingBooking(id))
        {
            return BadRequest(new
            {
                message = "Phòng đã có lịch đặt trong tương lai. Không thể chuyển sang bảo trì."
            });
        }

        int affected = await _db.Set<Phong>()
            .Where(x => x.MaPhong == id && x.TrangThai == "Trống")
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.TrangThai, "Bảo trì"));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Chỉ có thể đưa phòng đang trống vào bảo trì."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã chuyển phòng sang trạng thái bảo trì."
        });
    }

    [HttpPost("operations/rooms/{id:int}/maintenance-complete")]
    public async Task<IActionResult> CompleteRoomMaintenance(int id)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (await HasUpcomingBooking(id))
        {
            return BadRequest(new
            {
                message = "Phòng đang có lịch đặt chưa hoàn tất. Không thể đưa về trạng thái trống."
            });
        }

        int affected = await _db.Set<Phong>()
            .Where(x => x.MaPhong == id && x.TrangThai == "Bảo trì")
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.TrangThai, "Trống"));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Phòng không ở trạng thái bảo trì hoặc không tồn tại."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã hoàn tất bảo trì. Phòng hiện đã sẵn sàng."
        });
    }

}
