
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/room-catalog")]
public class RoomCatalogController : ControllerBase
{
    private readonly HotelDbContext _db;

    public RoomCatalogController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoomCatalog()
    {
        var roomTypes = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .OrderBy(x => x.MaLoaiPhong)
            .Select(x => new RoomTypeCatalogDto
            {
                MaLoaiPhong = x.MaLoaiPhong,
                TenLoaiPhong = x.TenLoaiPhong,
                MoTa = x.MoTa,
                GiaCoBan = x.GiaCoBan
            })
            .ToListAsync();

        var rooms = await _db.Set<Phong>()
            .AsNoTracking()
            .OrderBy(x => x.MaLoaiPhong)
            .ThenBy(x => x.Tang)
            .ThenBy(x => x.SoPhong)
            .Select(x => new
            {
                x.MaLoaiPhong,
                Room = new RoomCatalogItemDto
                {
                    MaPhong = x.MaPhong,
                    SoPhong = x.SoPhong,
                    Tang = x.Tang,
                    TrangThai = x.TrangThai,
                    MoTa = x.MoTa
                }
            })
            .ToListAsync();

        var lookup = roomTypes.ToDictionary(x => x.MaLoaiPhong);

        var photos = await _db.Set<HinhAnhChiTietPhong>()
            .AsNoTracking()
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.ThuTuHienThi)
            .Select(x => new
            {
                x.MaPhong,
                x.DuongDan
            })
            .ToListAsync();

        var photoLookup = photos
            .GroupBy(x => x.MaPhong)
            .ToDictionary(x => x.Key, x => x.First().DuongDan);

        foreach (var room in rooms)
        {
            if (lookup.TryGetValue(room.MaLoaiPhong, out var roomType))
            {
                if (photoLookup.TryGetValue(room.Room.MaPhong, out var photo))
                {
                    room.Room.HinhAnh = photo;
                }

                roomType.Phong.Add(room.Room);
            }
        }

        return Ok(new
        {
            success = true,
            tongLoaiPhong = roomTypes.Count,
            tongPhong = roomTypes.Sum(x => x.Phong.Count),
            danhSach = roomTypes
        });
    }

    public class RoomTypeCatalogDto
    {
        public int MaLoaiPhong { get; set; }

        public string TenLoaiPhong { get; set; } = "";

        public string? MoTa { get; set; }

        public decimal? GiaCoBan { get; set; }

        public List<RoomCatalogItemDto> Phong { get; set; }
            = new();
    }

    public class RoomCatalogItemDto
    {
        public int MaPhong { get; set; }

        public string SoPhong { get; set; } = "";

        public int? Tang { get; set; }

        public string? TrangThai { get; set; }

        public string? MoTa { get; set; }

        public string? HinhAnh { get; set; }
    }
}
