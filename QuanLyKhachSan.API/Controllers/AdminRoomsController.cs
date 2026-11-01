
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/admin/room-management")]
[Authorize(Roles = "Admin")]
public class AdminRoomsController : ControllerBase
{
    private readonly HotelDbContext _db;

    public AdminRoomsController(HotelDbContext db)
    {
        _db = db;
    }

    public class RoomRequest
    {
        public string RoomNumber { get; set; } = "";
        public int RoomTypeId { get; set; }
        public int? Floor { get; set; }
        public string Status { get; set; } = "Trống";
        public string? Description { get; set; }
    }

    public class RoomStatusRequest
    {
        public string Status { get; set; } = "";
    }

    public class RoomTypeRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int AdultCapacity { get; set; } = 2;
        public int ChildCapacity { get; set; }
        public decimal? Area { get; set; }
        public int? BedCount { get; set; }
        public string? BedType { get; set; }
        public decimal BasePrice { get; set; }
        public bool Active { get; set; } = true;
    }

    public class ImageRequest
    {
        public int RoomTypeId { get; set; }
        public string Path { get; set; } = "";
        public string? Description { get; set; }
        public bool IsCover { get; set; }
    }

    public class AmenityRequest
    {
        public int RoomTypeId { get; set; }
        public List<int> AmenityIds { get; set; } = new();
    }

    private static readonly string[] RoomStatuses =
    {
        "Trống",
        "Đang sử dụng",
        "Đang dọn",
        "Bảo trì",
        "Ngừng hoạt động"
    };

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
                id = room.MaPhong,
                roomNumber = room.SoPhong,
                roomTypeId = room.MaLoaiPhong,
                roomTypeName = type.TenLoaiPhong,
                floor = room.Tang,
                status = room.TrangThai,
                description = room.MoTa ?? "",
                basePrice = type.GiaCoBan
            }
        ).AsNoTracking().ToListAsync();

        return Ok(rooms);
    }

    [HttpGet("types")]
    public async Task<IActionResult> GetRoomTypes()
    {
        var types = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .OrderBy(x => x.MaLoaiPhong)
            .Select(x => new
            {
                id = x.MaLoaiPhong,
                name = x.TenLoaiPhong,
                description = x.MoTa ?? "",
                adultCapacity = x.SucChuaNguoiLon,
                childCapacity = x.SucChuaTreEm,
                area = x.DienTich,
                bedCount = x.SoGiuong,
                bedType = x.LoaiGiuong ?? "",
                basePrice = x.GiaCoBan,
                active = x.TrangThai
            })
            .ToListAsync();

        return Ok(types);
    }

    [HttpGet("amenities")]
    public async Task<IActionResult> GetAmenities()
    {
        var amenities = await _db.Set<TienNghi>()
            .AsNoTracking()
            .OrderBy(x => x.TenTienNghi)
            .Select(x => new
            {
                id = x.MaTienNghi,
                name = x.TenTienNghi,
                active = x.TrangThai
            })
            .ToListAsync();

        return Ok(amenities);
    }

    [HttpGet("type-details/{id:int}")]
    public async Task<IActionResult> GetRoomTypeDetails(int id)
    {
        var exists = await _db.Set<LoaiPhong>()
            .AnyAsync(x => x.MaLoaiPhong == id);

        if (!exists)
            return NotFound(new { message = "Không tìm thấy loại phòng." });

        var images = await _db.Set<HinhAnhPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == id)
            .OrderByDescending(x => x.AnhDaiDien)
            .ThenBy(x => x.MaHinhAnh)
            .Select(x => new
            {
                id = x.MaHinhAnh,
                path = x.DuongDan,
                description = x.MoTa ?? "",
                isCover = x.AnhDaiDien
            })
            .ToListAsync();

        var amenityIds = await _db.Set<LoaiPhong>()
            .AsNoTracking()
            .Where(x => x.MaLoaiPhong == id)
            .SelectMany(x => x.MaTienNghis)
            .Select(x => x.MaTienNghi)
            .ToListAsync();

        return Ok(new
        {
            images,
            amenityIds
        });
    }

    [HttpPut("rooms/{id:int}/status")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoomStatus(
        int id,
        RoomStatusRequest request)
    {
        string newStatus = request.Status?.Trim() ?? "";

        if (!RoomStatuses.Contains(newStatus))
            return BadRequest(new { message = "Trạng thái không hợp lệ." });

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var room = await _db.Set<Phong>()
            .FirstOrDefaultAsync(x => x.MaPhong == id);

        if (room == null)
            return NotFound(new { message = "Không tìm thấy phòng." });

        string currentStatus = room.TrangThai;

        if (currentStatus == newStatus)
            return Ok(new { message = "Trạng thái phòng không thay đổi." });

        bool allowed = currentStatus switch
        {
            "Trống" => newStatus is "Bảo trì" or "Ngừng hoạt động",
            "Bảo trì" => newStatus is "Trống" or "Ngừng hoạt động",
            "Ngừng hoạt động" => newStatus is "Trống" or "Bảo trì",
            "Đang dọn" => newStatus is "Trống" or "Bảo trì",
            _ => false
        };

        if (!allowed)
            return BadRequest(new
            {
                message = "Không được phép chuyển trạng thái này trực tiếp."
            });

        var occupied = await (
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where detail.MaPhong == id
               && booking.TrangThai == "Đã nhận phòng"
            select detail.MaPhong
        ).AnyAsync();

        if (occupied)
            return Conflict(new
            {
                message = "Phòng còn khách lưu trú, không thể đổi trạng thái."
            });

        room.TrangThai = newStatus;

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { message = "Cập nhật trạng thái phòng thành công." });
    }

    [HttpPost("rooms")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateRoom(RoomRequest request)
    {
        string number = request.RoomNumber?.Trim() ?? "";
        string status = request.Status?.Trim() ?? "";

        if (number.Length is < 1 or > 20)
            return BadRequest(new { message = "Số phòng không hợp lệ." });

        if (!RoomStatuses.Contains(status))
            return BadRequest(new { message = "Trạng thái phòng không hợp lệ." });

        if (request.Floor is < 0 or > 100)
            return BadRequest(new { message = "Tầng không hợp lệ." });

        if (request.Description?.Length > 500)
            return BadRequest(new { message = "Mô tả quá dài." });

        bool typeExists = await _db.Set<LoaiPhong>()
            .AnyAsync(x => x.MaLoaiPhong == request.RoomTypeId && x.TrangThai);

        if (!typeExists)
            return BadRequest(new
            {
                message = "Loại phòng không tồn tại hoặc đang ngừng hoạt động."
            });

        bool duplicate = await _db.Set<Phong>()
            .AnyAsync(x => x.SoPhong == number);

        if (duplicate)
            return Conflict(new { message = "Số phòng đã tồn tại." });

        var room = new Phong
        {
            SoPhong = number,
            MaLoaiPhong = request.RoomTypeId,
            Tang = request.Floor,
            TrangThai = status,
            MoTa = request.Description?.Trim()
        };

        _db.Set<Phong>().Add(room);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            return Conflict(new { message = "Số phòng đã tồn tại." });
        }

        return Ok(new
        {
            success = true,
            id = room.MaPhong,
            message = "Thêm phòng thành công."
        });
    }

    [HttpPut("rooms/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoom(
        int id,
        RoomRequest request)
    {
        string number = request.RoomNumber?.Trim() ?? "";
        string status = request.Status?.Trim() ?? "";

        if (number.Length is < 1 or > 20)
            return BadRequest(new { message = "Số phòng không hợp lệ." });

        if (!RoomStatuses.Contains(status))
            return BadRequest(new { message = "Trạng thái phòng không hợp lệ." });

        if (request.Floor is < 0 or > 100)
            return BadRequest(new { message = "Tầng không hợp lệ." });

        if (request.Description?.Length > 500)
            return BadRequest(new { message = "Mô tả quá dài." });

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var room = await _db.Set<Phong>()
            .FirstOrDefaultAsync(x => x.MaPhong == id);

        if (room == null)
            return NotFound(new { message = "Không tìm thấy phòng." });

        bool duplicate = await _db.Set<Phong>()
            .AnyAsync(x => x.MaPhong != id && x.SoPhong == number);

        if (duplicate)
            return Conflict(new { message = "Số phòng đã tồn tại." });

        bool typeExists = await _db.Set<LoaiPhong>()
            .AnyAsync(x => x.MaLoaiPhong == request.RoomTypeId);

        if (!typeExists)
            return BadRequest(new { message = "Loại phòng không tồn tại." });

        if (room.MaLoaiPhong != request.RoomTypeId)
        {
            bool hasActiveBookings = await (
                from detail in _db.Set<ChiTietDatPhong>()
                join booking in _db.Set<DatPhong>()
                    on detail.MaDatPhong equals booking.MaDatPhong
                where detail.MaPhong == id
                   && (booking.TrangThai == "Chờ xác nhận" ||
                       booking.TrangThai == "Đã xác nhận" ||
                       booking.TrangThai == "Đã đặt cọc" ||
                       booking.TrangThai == "Đã nhận phòng")
                select detail.MaPhong
            ).AnyAsync();

            if (hasActiveBookings)
                return BadRequest(new
                {
                    message = "Không thể đổi loại phòng khi còn đơn đặt phòng đang hoạt động."
                });
        }

        room.SoPhong = number;
        room.MaLoaiPhong = request.RoomTypeId;
        room.Tang = request.Floor;
        room.TrangThai = status;
        room.MoTa = request.Description?.Trim();

        try
        {
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            return Conflict(new { message = "Số phòng đã tồn tại." });
        }

        return Ok(new
        {
            success = true,
            message = "Cập nhật phòng thành công."
        });
    }

    private static string? ValidateRoomType(RoomTypeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            request.Name.Length > 100)
            return "Tên loại phòng không hợp lệ.";

        if (request.BasePrice <= 0)
            return "Giá phòng phải lớn hơn 0.";

        if (request.AdultCapacity is < 1 or > 100)
            return "Sức chứa người lớn không hợp lệ.";

        if (request.ChildCapacity is < 0 or > 100)
            return "Sức chứa trẻ em không hợp lệ.";

        if (request.Area < 0)
            return "Diện tích không hợp lệ.";

        if (request.BedCount < 0)
            return "Số giường không hợp lệ.";

        if (request.Description?.Length > 1000)
            return "Mô tả quá dài.";

        if (request.BedType?.Length > 100)
            return "Tên loại giường quá dài.";

        return null;
    }

    [HttpPost("types")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateRoomType(RoomTypeRequest request)
    {
        var error = ValidateRoomType(request);

        if (error != null)
            return BadRequest(new { message = error });

        var type = new LoaiPhong
        {
            TenLoaiPhong = request.Name.Trim(),
            MoTa = request.Description?.Trim(),
            SucChuaNguoiLon = request.AdultCapacity,
            SucChuaTreEm = request.ChildCapacity,
            DienTich = request.Area,
            SoGiuong = request.BedCount,
            LoaiGiuong = request.BedType?.Trim(),
            GiaCoBan = request.BasePrice,
            TrangThai = request.Active
        };

        _db.Set<LoaiPhong>().Add(type);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = type.MaLoaiPhong,
            message = "Thêm loại phòng thành công."
        });
    }

    [HttpPut("types/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateRoomType(
        int id,
        RoomTypeRequest request)
    {
        var error = ValidateRoomType(request);

        if (error != null)
            return BadRequest(new { message = error });

        var type = await _db.Set<LoaiPhong>()
            .FirstOrDefaultAsync(x => x.MaLoaiPhong == id);

        if (type == null)
            return NotFound(new { message = "Không tìm thấy loại phòng." });

        type.TenLoaiPhong = request.Name.Trim();
        type.MoTa = request.Description?.Trim();
        type.SucChuaNguoiLon = request.AdultCapacity;
        type.SucChuaTreEm = request.ChildCapacity;
        type.DienTich = request.Area;
        type.SoGiuong = request.BedCount;
        type.LoaiGiuong = request.BedType?.Trim();
        type.GiaCoBan = request.BasePrice;
        type.TrangThai = request.Active;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Cập nhật loại phòng thành công."
        });
    }

    [HttpPut("amenities")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateAmenities(
        AmenityRequest request)
    {
        if (request.RoomTypeId <= 0)
            return BadRequest(new { message = "Chưa chọn loại phòng." });

        var type = await _db.Set<LoaiPhong>()
            .Include(x => x.MaTienNghis)
            .FirstOrDefaultAsync(x =>
                x.MaLoaiPhong == request.RoomTypeId);

        if (type == null)
            return NotFound(new { message = "Loại phòng không tồn tại." });

        var ids = (request.AmenityIds ?? new List<int>())
            .Distinct()
            .ToList();

        var amenities = await _db.Set<TienNghi>()
            .Where(x => ids.Contains(x.MaTienNghi))
            .ToListAsync();

        if (amenities.Count != ids.Count)
            return BadRequest(new
            {
                message = "Danh sách tiện nghi không hợp lệ."
            });

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        type.MaTienNghis.Clear();

        await _db.SaveChangesAsync();

        foreach (var amenity in amenities)
            type.MaTienNghis.Add(amenity);

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message = "Cập nhật tiện nghi thành công."
        });
    }

    [HttpPost("images")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> AddImage(ImageRequest request)
    {
        string path = request.Path?.Trim() ?? "";

        bool validPath = path.StartsWith("/") &&
                         !path.StartsWith("//");

        bool validHttps = Uri.TryCreate(
            path,
            UriKind.Absolute,
            out var uri
        ) && uri.Scheme == Uri.UriSchemeHttps;

        if (path.Length is < 1 or > 500 ||
            (!validPath && !validHttps))
            return BadRequest(new
            {
                message = "Đường dẫn ảnh không hợp lệ."
            });

        if (request.Description?.Length > 255)
            return BadRequest(new { message = "Mô tả ảnh quá dài." });

        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        bool typeExists = await _db.Set<LoaiPhong>()
            .AnyAsync(x => x.MaLoaiPhong == request.RoomTypeId);

        if (!typeExists)
            return NotFound(new { message = "Không tìm thấy loại phòng." });

        if (request.IsCover)
        {
            await _db.Set<HinhAnhPhong>()
                .Where(x => x.MaLoaiPhong == request.RoomTypeId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.AnhDaiDien, false));
        }

        var image = new HinhAnhPhong
        {
            MaLoaiPhong = request.RoomTypeId,
            DuongDan = path,
            MoTa = request.Description?.Trim(),
            AnhDaiDien = request.IsCover
        };

        _db.Set<HinhAnhPhong>().Add(image);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            id = image.MaHinhAnh,
            message = "Thêm hình ảnh thành công."
        });
    }

    [HttpPut("images/{id:int}/cover")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SetCoverImage(int id)
    {
        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var image = await _db.Set<HinhAnhPhong>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaHinhAnh == id);

        if (image == null)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        await _db.Set<HinhAnhPhong>()
            .Where(x => x.MaLoaiPhong == image.MaLoaiPhong)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(
                    x => x.AnhDaiDien,
                    x => x.MaHinhAnh == id));

        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật ảnh đại diện."
        });
    }

    [HttpDelete("images/{id:int}")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteImage(int id)
    {
        await using var transaction = await _db.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var image = await _db.Set<HinhAnhPhong>()
            .FirstOrDefaultAsync(x => x.MaHinhAnh == id);

        if (image == null)
            return NotFound(new { message = "Không tìm thấy ảnh." });

        int typeId = image.MaLoaiPhong;
        bool wasCover = image.AnhDaiDien;

        _db.Set<HinhAnhPhong>().Remove(image);
        await _db.SaveChangesAsync();

        if (wasCover)
        {
            var nextImage = await _db.Set<HinhAnhPhong>()
                .Where(x => x.MaLoaiPhong == typeId)
                .OrderBy(x => x.MaHinhAnh)
                .FirstOrDefaultAsync();

            if (nextImage != null)
            {
                nextImage.AnhDaiDien = true;
                await _db.SaveChangesAsync();
            }
        }

        await transaction.CommitAsync();

        return Ok(new
        {
            success = true,
            message = "Đã xóa hình ảnh."
        });
    }
}
