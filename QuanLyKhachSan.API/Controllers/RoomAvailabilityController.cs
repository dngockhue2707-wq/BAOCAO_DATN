
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/room-availability")]
public class RoomAvailabilityController : ControllerBase
{
    private readonly HotelDbContext _db;

    public RoomAvailabilityController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAvailableRooms(
        [FromQuery] DateOnly checkIn,
        [FromQuery] DateOnly checkOut,
        [FromQuery] int? roomTypeId)
    {
        if (checkIn == default || checkOut == default)
        {
            return BadRequest(new
            {
                message = "Vui lòng chọn ngày nhận và ngày trả phòng."
            });
        }

        if (checkIn < DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new
            {
                message = "Ngày nhận phòng không được ở trong quá khứ."
            });
        }

        if (checkOut <= checkIn)
        {
            return BadRequest(new
            {
                message = "Ngày trả phòng phải sau ngày nhận phòng."
            });
        }

        int nights = checkOut.DayNumber - checkIn.DayNumber;

        if (nights > 30)
        {
            return BadRequest(new
            {
                message = "Mỗi lượt đặt phòng tối đa 30 đêm."
            });
        }

        if (roomTypeId.HasValue && roomTypeId.Value <= 0)
        {
            return BadRequest(new
            {
                message = "Loại phòng không hợp lệ."
            });
        }

        var busyRoomIds = _db.Set<ChiTietDatPhong>()
            .AsNoTracking()
            .Where(x =>
                x.MaDatPhongNavigation.TrangThai == "Chờ xác nhận" ||
                x.MaDatPhongNavigation.TrangThai == "Đã xác nhận" ||
                x.MaDatPhongNavigation.TrangThai == "Đã đặt cọc" ||
                x.MaDatPhongNavigation.TrangThai == "Đã nhận phòng")
            .Where(x =>
                x.MaDatPhongNavigation.NgayNhanPhong < checkOut &&
                x.MaDatPhongNavigation.NgayTraPhong > checkIn)
            .Select(x => x.MaPhong);

        var rooms = await _db.Set<Phong>()
            .AsNoTracking()
            .Where(x => x.TrangThai == "Trống")
            .Where(x => x.MaLoaiPhongNavigation.TrangThai)
            .Where(x =>
                !roomTypeId.HasValue ||
                x.MaLoaiPhong == roomTypeId.Value)
            .Where(x => !busyRoomIds.Contains(x.MaPhong))
            .OrderBy(x => x.MaLoaiPhongNavigation.GiaCoBan)
            .ThenBy(x => x.Tang)
            .ThenBy(x => x.SoPhong)
            .Select(x => new
            {
                id = x.MaPhong,
                roomNumber = x.SoPhong,
                floor = x.Tang,
                roomTypeId = x.MaLoaiPhong,
                roomTypeName = x.MaLoaiPhongNavigation.TenLoaiPhong,
                pricePerNight = x.MaLoaiPhongNavigation.GiaCoBan,
                adultCapacity = x.MaLoaiPhongNavigation.SucChuaNguoiLon,
                childCapacity = x.MaLoaiPhongNavigation.SucChuaTreEm,
                area = x.MaLoaiPhongNavigation.DienTich,
                description = x.MoTa ?? "",
                nights,
                estimatedTotal =
                    x.MaLoaiPhongNavigation.GiaCoBan * nights
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            checkIn,
            checkOut,
            nights,
            availableCount = rooms.Count,
            rooms
        });
    }
}
