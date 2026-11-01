
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

public class UpdateRoomStatusDto
{
    public string Status { get; set; } = "";
}

public class UpdateBookingStatusDto
{
    public string Status { get; set; } = "";
}

[ApiController]
[Route("api/management")]
[Authorize(Roles = "Admin,Staff")]
public class ManagementController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public ManagementController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private async Task<bool> ValidToken()
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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalRooms = await _db.Set<Phong>()
            .CountAsync();

        var availableRooms = await _db.Set<Phong>()
            .CountAsync(x => x.TrangThai == "Trống");

        var pendingBookings = await _db.Set<DatPhong>()
            .CountAsync(x => x.TrangThai == "Chờ xác nhận");

        var totalCustomers = await _db.Set<KhachHang>()
            .CountAsync();

        return Ok(new
        {
            totalRooms,
            availableRooms,
            pendingBookings,
            totalCustomers
        });
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await (
            from room in _db.Set<Phong>()
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby room.Tang, room.SoPhong
            select new
            {
                number = room.SoPhong,
                id = room.MaPhong,
                floor = room.Tang ?? 0,
                status = room.TrangThai,
                roomType = type.TenLoaiPhong
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { rooms });
    }

    [HttpPut("rooms/{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRoomStatus(
        int id,
        [FromBody] UpdateRoomStatusDto dto)
    {
        if (!await ValidToken())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string[] valid =
        {
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        };

        if (!valid.Contains(dto.Status))
        {
            return BadRequest(new
            {
                message = "Trạng thái phòng không hợp lệ."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        var blockedRooms =
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where booking.TrangThai == "Chờ xác nhận" ||
                  booking.TrangThai == "Đã xác nhận" ||
                  booking.TrangThai == "Đã đặt cọc" ||
                  booking.TrangThai == "Đã nhận phòng"
            where booking.NgayTraPhong > today
            select detail.MaPhong;

        var query = _db.Set<Phong>()
            .Where(x => x.MaPhong == id);

        if (dto.Status is "Bảo trì" or "Ngừng hoạt động")
        {
            query = query.Where(x =>
                !blockedRooms.Contains(x.MaPhong));
        }

        int affected = await query.ExecuteUpdateAsync(
            setters => setters.SetProperty(
                x => x.TrangThai,
                dto.Status));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Không thể cập nhật phòng do có đặt phòng hoặc phòng không tồn tại."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật trạng thái phòng."
        });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings()
    {
        var bookings = await (
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
                roomType = type.TenLoaiPhong,
                roomNumber = room.SoPhong,
                checkIn = booking.NgayNhanPhong,
                checkOut = booking.NgayTraPhong,
                status = booking.TrangThai,
                total = detail.ThanhTien
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { bookings });
    }

    [HttpPut("bookings/{id:int}/status")]
    public async Task<IActionResult> UpdateBookingStatus(
        int id,
        [FromBody] UpdateBookingStatusDto dto)
    {
        if (!await ValidToken())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (dto.Status != "Đã xác nhận" &&
            dto.Status != "Đã hủy")
        {
            return BadRequest(new
            {
                message = "Trang này chỉ hỗ trợ xác nhận hoặc hủy đơn chờ duyệt."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        var query = _db.Set<DatPhong>()
            .Where(x =>
                x.MaDatPhong == id &&
                x.TrangThai == "Chờ xác nhận" &&
                x.NgayNhanPhong >= today);

        int affected;

        if (dto.Status == "Đã xác nhận")
        {
            affected = await query.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đã xác nhận")
                    .SetProperty(
                        x => x.NgayXacNhan,
                        DateTime.Now));
        }
        else
        {
            affected = await query.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đã hủy")
                    .SetProperty(
                        x => x.LyDoHuy,
                        "Nhân viên hủy đơn"));
        }

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Đơn không còn ở trạng thái chờ xác nhận."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật trạng thái đặt phòng."
        });
    }
}
