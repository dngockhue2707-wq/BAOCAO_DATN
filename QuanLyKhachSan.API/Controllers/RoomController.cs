
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/rooms")]
public class RoomController : ControllerBase
{
    private readonly HotelDbContext _db;

    public RoomController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRooms(
        [FromQuery] DateTime? checkIn,
        [FromQuery] DateTime? checkOut,
        [FromQuery] int adults = 1,
        [FromQuery] int children = 0)
    {
        DateTime start = (checkIn ?? DateTime.Today).Date;
        DateTime end = (checkOut ?? start.AddDays(1)).Date;

        if (start < DateTime.Today ||
            end <= start ||
            end > start.AddDays(30) ||
            adults < 1 || adults > 20 ||
            children < 0 || children > 20)
        {
            return BadRequest(new
            {
                message = "Ngày lưu trú hoặc số khách không hợp lệ."
            });
        }

        var startDate = DateOnly.FromDateTime(start);
        var endDate = DateOnly.FromDateTime(end);

        string[] blockingStatuses =
        {
            "Chờ xác nhận",
            "Đã xác nhận",
            "Đã đặt cọc",
            "Đã nhận phòng"
        };

        var busyRoomIds =
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where blockingStatuses.Contains(booking.TrangThai)
               && booking.NgayNhanPhong < endDate
               && booking.NgayTraPhong > startDate
            select detail.MaPhong;

        var roomTypes = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .Where(x =>
                x.TrangThai &&
                x.SucChuaNguoiLon >= adults &&
                x.SucChuaTreEm >= children)
            .OrderBy(x => x.GiaCoBan)
            .Select(x => new
            {
                x.MaLoaiPhong,
                x.TenLoaiPhong,
                x.MoTa,
                x.SucChuaNguoiLon,
                x.SucChuaTreEm,
                x.DienTich,
                x.SoGiuong,
                x.LoaiGiuong,
                x.GiaCoBan
            })
            .ToListAsync();

        var rooms = await _db.Set<Phong>()
            .AsNoTracking()
            .Select(x => new
            {
                x.MaLoaiPhong,
                x.MaPhong,
                x.TrangThai,
                IsBusy = busyRoomIds.Contains(x.MaPhong)
            })
            .ToListAsync();

        var images = await _db.Set<HinhAnhPhong>()
            .AsNoTracking()
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.MaHinhAnh)
            .Select(x => new
            {
                x.MaLoaiPhong,
                x.DuongDan
            })
            .ToListAsync();

        var imageLookup = images
            .GroupBy(x => x.MaLoaiPhong)
            .ToDictionary(
                x => x.Key,
                x => x.First().DuongDan
            );

        var roomLookup = rooms
            .GroupBy(x => x.MaLoaiPhong)
            .ToDictionary(
                x => x.Key,
                x => new
                {
                    Total = x.Count(),
                    Available = x.Count(r =>
                        r.TrangThai == "Trống" && !r.IsBusy)
                }
            );

        var result = roomTypes.Select(type =>
        {
            roomLookup.TryGetValue(
                type.MaLoaiPhong,
                out var roomSummary);

            imageLookup.TryGetValue(
                type.MaLoaiPhong,
                out var image);

            return new
            {
                maLoaiPhong = type.MaLoaiPhong,
                tenLoaiPhong = type.TenLoaiPhong,
                moTa = type.MoTa ?? "",
                sucChuaNguoiLon = type.SucChuaNguoiLon,
                sucChuaTreEm = type.SucChuaTreEm,
                dienTich = type.DienTich,
                soGiuong = type.SoGiuong ?? 0,
                loaiGiuong = type.LoaiGiuong ?? "",
                giaCoBan = type.GiaCoBan,
                hinhAnh = image ?? "",
                tongPhong = roomSummary?.Total ?? 0,
                phongConTrong = roomSummary?.Available ?? 0
            };
        }).ToList();

        return Ok(new
        {
            success = true,
            danhSach = result
        });
    }

    [HttpGet("by-room/{roomId:int}")]
    public async Task<IActionResult> GetRoomByRoomId(int roomId)
    {
        var room = await (
            from p in _db.Set<Phong>().AsNoTracking()
            join t in _db.Set<LoaiPhong>().AsNoTracking()
                on p.MaLoaiPhong equals t.MaLoaiPhong
            where p.MaPhong == roomId && t.TrangThai
            select new
            {
                maPhong = p.MaPhong,
                soPhong = p.SoPhong,
                tang = p.Tang,
                trangThai = p.TrangThai,
                maLoaiPhong = t.MaLoaiPhong,
                tenLoaiPhong = t.TenLoaiPhong,
                moTa = t.MoTa ?? "",
                sucChuaNguoiLon = t.SucChuaNguoiLon,
                sucChuaTreEm = t.SucChuaTreEm,
                dienTich = t.DienTich,
                soGiuong = t.SoGiuong ?? 0,
                loaiGiuong = t.LoaiGiuong ?? "",
                giaCoBan = t.GiaCoBan
            }
        ).FirstOrDefaultAsync();

        if (room == null)
            return NotFound(new { message = "Không tìm thấy phòng." });

        var images = await _db.Set<HinhAnhChiTietPhong>()
            .AsNoTracking()
            .Where(x => x.MaPhong == roomId)
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.ThuTuHienThi)
            .Select(x => x.DuongDan)
            .ToListAsync();

        var amenities = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == room.maLoaiPhong)
            .SelectMany(x => x.MaTienNghis)
            .Where(x => x.TrangThai)
            .OrderBy(x => x.TenTienNghi)
            .Select(x => x.TenTienNghi)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            room,
            images,
            amenities
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetRoomDetail(int id)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Mã loại phòng không hợp lệ."
            });
        }

        var type = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == id && x.TrangThai)
            .Select(x => new
            {
                maLoaiPhong = x.MaLoaiPhong,
                tenLoaiPhong = x.TenLoaiPhong,
                moTa = x.MoTa ?? "",
                sucChuaNguoiLon = x.SucChuaNguoiLon,
                sucChuaTreEm = x.SucChuaTreEm,
                dienTich = x.DienTich,
                soGiuong = x.SoGiuong ?? 0,
                loaiGiuong = x.LoaiGiuong ?? "",
                giaCoBan = x.GiaCoBan
            })
            .FirstOrDefaultAsync();

        if (type == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy loại phòng."
            });
        }

        var images = await _db.Set<HinhAnhPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == id)
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.MaHinhAnh)
            .Select(x => x.DuongDan)
            .ToListAsync();
       
        var amenities = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == id)
            .SelectMany(x => x.MaTienNghis)
            .Where(x => x.TrangThai)
            .OrderBy(x => x.TenTienNghi)
            .Select(x => x.TenTienNghi)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            room = type,
            images,
            amenities
        });
    }
}
