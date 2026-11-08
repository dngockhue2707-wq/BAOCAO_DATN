
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

        var roomImages = await _db.Set<HinhAnhChiTietPhong>()
            .AsNoTracking()
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.ThuTuHienThi)
            .Select(x => new
            {
                x.MaPhong,
                x.DuongDan
            })
            .ToListAsync();

        var roomImageLookup = roomImages
            .Where(x => !string.IsNullOrWhiteSpace(x.DuongDan))
            .GroupBy(x => x.MaPhong)
            .ToDictionary(
                x => x.Key,
                x => x.First().DuongDan
            );

        var typeImages = await _db.Set<HinhAnhPhong>()
            .AsNoTracking()
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.MaHinhAnh)
            .Select(x => new
            {
                x.MaLoaiPhong,
                x.DuongDan
            })
            .ToListAsync();

        var typeImageLookup = typeImages
            .Where(x => !string.IsNullOrWhiteSpace(x.DuongDan))
            .GroupBy(x => x.MaLoaiPhong)
            .ToDictionary(
                x => x.Key,
                x => x.First().DuongDan
            );

        var result = rooms.Select(room =>
        {
            roomImageLookup.TryGetValue(
                room.id,
                out var roomImage
            );

            typeImageLookup.TryGetValue(
                room.roomTypeId,
                out var typeImage
            );

            return new
            {
                room.id,
                room.roomNumber,
                room.floor,
                room.roomTypeId,
                room.roomTypeName,
                room.pricePerNight,
                room.adultCapacity,
                room.childCapacity,
                room.area,
                room.description,
                room.nights,
                room.estimatedTotal,
                hinhAnh = roomImage ?? typeImage ?? ""
            };
        }).ToList();

        return Ok(new
        {
            success = true,
            checkIn,
            checkOut,
            nights,
            availableCount = result.Count,
            rooms = result
        });

    }
}
