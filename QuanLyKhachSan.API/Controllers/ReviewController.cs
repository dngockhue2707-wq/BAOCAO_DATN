
using System;
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

public class ReviewRequest
{
    public int MaDatPhong { get; set; }
    public int MaLoaiPhong { get; set; }
    public int SoSao { get; set; }
    public string? NoiDung { get; set; }
}

public class ReviewUpdateRequest
{
    public int SoSao { get; set; }
    public string? NoiDung { get; set; }
}

[ApiController]
[Route("api/reviews")]
public class ReviewController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public ReviewController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private async Task<int?> GetCustomerId()
    {
        var accountIdString =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(accountIdString, out int accountId))
            return null;

        return await _db.KhachHangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId)
            .Select(x => (int?)x.MaKhachHang)
            .FirstOrDefaultAsync();
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

    private static bool ValidRating(int stars, string? content)
    {
        return stars >= 1 &&
               stars <= 5 &&
               (content?.Length ?? 0) <= 1000;
    }

    private async Task<bool> CanReview(
        int customerId,
        int bookingId,
        int roomTypeId)
    {
        var booking = await _db.DatPhongs
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.MaDatPhong == bookingId &&
                x.MaKhachHang == customerId);

        if (booking == null)
            return false;

        if (booking.TrangThai != "Đã trả phòng" &&
            booking.TrangThai != "Hoàn thành")
            return false;

        return await (
            from detail in _db.ChiTietDatPhongs
            join room in _db.Phongs
                on detail.MaPhong equals room.MaPhong
            where detail.MaDatPhong == bookingId &&
                  room.MaLoaiPhong == roomTypeId
            select detail.MaChiTietDatPhong
        ).AnyAsync();
    }

    [HttpGet("eligible")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Eligible()
    {
        var customerId = await GetCustomerId();

        if (customerId == null)
        {
            return Unauthorized(new
            {
                message = "Không tìm thấy thông tin khách hàng."
            });
        }

        var bookings = await (
            from booking in _db.DatPhongs.AsNoTracking()
            join detail in _db.ChiTietDatPhongs.AsNoTracking()
                on booking.MaDatPhong equals detail.MaDatPhong
            join room in _db.Phongs.AsNoTracking()
                on detail.MaPhong equals room.MaPhong
            join type in _db.LoaiPhongs.AsNoTracking()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            where booking.MaKhachHang == customerId.Value
                && (booking.TrangThai == "Đã trả phòng" ||
                    booking.TrangThai == "Hoàn thành")
            select new
            {
                booking.MaDatPhong,
                booking.NgayNhanPhong,
                booking.NgayTraPhong,
                type.MaLoaiPhong,
                type.TenLoaiPhong,
                room.SoPhong
            }
        ).ToListAsync();

        var reviews = await _db.DanhGia
            .AsNoTracking()
            .Where(x => x.MaKhachHang == customerId.Value)
            .Select(x => new
            {
                x.MaDanhGia,
                x.MaDatPhong,
                x.MaLoaiPhong,
                x.SoSao,
                x.NoiDung,
                x.NgayDanhGia,
                x.TrangThai
            })
            .ToListAsync();

        var result = bookings
            .GroupBy(x => new
            {
                x.MaDatPhong,
                x.MaLoaiPhong
            })
            .Select(group =>
            {
                var first = group.First();

                var review = reviews.FirstOrDefault(x =>
                    x.MaDatPhong == first.MaDatPhong &&
                    x.MaLoaiPhong == first.MaLoaiPhong);

                return new
                {
                    maDatPhong = first.MaDatPhong,
                    maLoaiPhong = first.MaLoaiPhong,
                    tenLoaiPhong = first.TenLoaiPhong,
                    soPhong = string.Join(", ",
                        group.Select(x => x.SoPhong).Distinct()),
                    ngayNhanPhong = first.NgayNhanPhong,
                    ngayTraPhong = first.NgayTraPhong,
                    daDanhGia = review != null,
                    maDanhGia = review?.MaDanhGia,
                    soSao = review?.SoSao,
                    noiDung = review?.NoiDung,
                    ngayDanhGia = review?.NgayDanhGia,
                    trangThai = review?.TrangThai
                };
            })
            .OrderByDescending(x => x.ngayTraPhong)
            .ToList();

        return Ok(new
        {
            success = true,
            danhSach = result
        });
    }

    [HttpGet("room-type/{roomTypeId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> ByRoomType(int roomTypeId)
    {
        var reviews = await (
            from review in _db.DanhGia.AsNoTracking()
            join customer in _db.KhachHangs.AsNoTracking()
                on review.MaKhachHang equals customer.MaKhachHang
            where review.MaLoaiPhong == roomTypeId &&
                  review.TrangThai
            orderby review.NgayDanhGia descending
            select new
            {
                review.MaDanhGia,
                customer.HoTen,
                review.SoSao,
                review.NoiDung,
                review.NgayDanhGia
            }
        ).ToListAsync();

        return Ok(new
        {
            success = true,
            tongDanhGia = reviews.Count,
            diemTrungBinh = reviews.Count == 0
                ? 0
                : Math.Round(reviews.Average(x => x.SoSao), 1),
            danhSach = reviews
        });
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create(
        [FromBody] ReviewRequest request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        if (request == null ||
            request.MaDatPhong <= 0 ||
            request.MaLoaiPhong <= 0 ||
            !ValidRating(request.SoSao, request.NoiDung))
        {
            return BadRequest(new
            {
                message = "Thông tin đánh giá không hợp lệ."
            });
        }

        var customerId = await GetCustomerId();

        if (customerId == null)
        {
            return Unauthorized(new
            {
                message = "Vui lòng đăng nhập."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            if (!await CanReview(
                customerId.Value,
                request.MaDatPhong,
                request.MaLoaiPhong))
            {
                await transaction.RollbackAsync();

                return BadRequest(new
                {
                    message = "Đơn đặt phòng chưa đủ điều kiện đánh giá."
                });
            }

            var exists = await _db.DanhGia.AnyAsync(x =>
                x.MaDatPhong == request.MaDatPhong &&
                x.MaLoaiPhong == request.MaLoaiPhong);

            if (exists)
            {
                await transaction.RollbackAsync();

                return Conflict(new
                {
                    message = "Đơn này đã được đánh giá. Bạn có thể sửa đánh giá cũ."
                });
            }

            var review = new DanhGium
            {
                MaKhachHang = customerId.Value,
                MaDatPhong = request.MaDatPhong,
                MaLoaiPhong = request.MaLoaiPhong,
                SoSao = request.SoSao,
                NoiDung = request.NoiDung?.Trim() ?? "",
                NgayDanhGia = DateTime.Now,
                TrangThai = true
            };

            _db.DanhGia.Add(review);

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Gửi đánh giá thành công!",
                maDanhGia = review.MaDanhGia
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] ReviewUpdateRequest request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        if (request == null ||
            !ValidRating(request.SoSao, request.NoiDung))
        {
            return BadRequest(new
            {
                message = "Đánh giá phải từ 1 đến 5 sao, nội dung tối đa 1000 ký tự."
            });
        }

        var customerId = await GetCustomerId();

        if (customerId == null)
        {
            return Unauthorized(new
            {
                message = "Vui lòng đăng nhập."
            });
        }

        var review = await _db.DanhGia
            .FirstOrDefaultAsync(x =>
                x.MaDanhGia == id &&
                x.MaKhachHang == customerId.Value);

        if (review == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy đánh giá."
            });
        }

        review.SoSao = request.SoSao;
        review.NoiDung = request.NoiDung?.Trim() ?? "";

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Cập nhật đánh giá thành công!"
        });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminList()
    {
        var reviews = await (
            from review in _db.DanhGia.AsNoTracking()
            join customer in _db.KhachHangs.AsNoTracking()
                on review.MaKhachHang equals customer.MaKhachHang
            join type in _db.LoaiPhongs.AsNoTracking()
                on review.MaLoaiPhong equals type.MaLoaiPhong
            orderby review.NgayDanhGia descending
            select new
            {
                review.MaDanhGia,
                review.MaDatPhong,
                customer.HoTen,
                type.TenLoaiPhong,
                review.SoSao,
                review.NoiDung,
                review.NgayDanhGia,
                review.TrangThai
            }
        ).ToListAsync();

        return Ok(new
        {
            success = true,
            danhSach = reviews
        });
    }

    [HttpPut("admin/{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ChangeStatus(
        int id,
        [FromBody] ReviewStatusRequest request)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Phiên bảo mật không hợp lệ."
            });
        }

        if (request == null)
        {
            return BadRequest(new
            {
                message = "Trạng thái không hợp lệ."
            });
        }

        var review = await _db.DanhGia.FindAsync(id);

        if (review == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy đánh giá."
            });
        }

        review.TrangThai = request.TrangThai;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = review.TrangThai
                ? "Đã hiển thị đánh giá."
                : "Đã ẩn đánh giá."
        });
    }
}

public class ReviewStatusRequest
{
    public bool TrangThai { get; set; }
}
