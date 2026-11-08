
using System;
using System.Collections.Generic;
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

public class TienNghiYeuThichDto
{
    public int MaTienNghi { get; set; }

    public int MucDoUuTien { get; set; } = 3;
}

public class CapNhatSoThichDto
{
    public decimal? NganSachToiThieu { get; set; }

    public decimal? NganSachToiDa { get; set; }

    public int? SoNguoiMongMuon { get; set; }

    public int? MaLoaiPhongUuTien { get; set; }

    public decimal? DienTichToiThieu { get; set; }

    public List<TienNghiYeuThichDto> TienNghiYeuThich
        { get; set; } = new();
}

[ApiController]
[Route("api/so-thich-luu-tru")]
[Authorize(Roles = "Customer")]
public class SoThichLuuTruController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;

    public SoThichLuuTruController(
        HotelDbContext db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private int? LayMaTaiKhoan()
    {
        string? value = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        return int.TryParse(value, out int id)
            ? id
            : null;
    }

    private async Task<int?> LayMaKhachHang()
    {
        int? accountId = LayMaTaiKhoan();

        if (!accountId.HasValue)
            return null;

        return await _db.KhachHangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == accountId.Value)
            .Select(x => (int?)x.MaKhachHang)
            .FirstOrDefaultAsync();
    }

    // ======================================
    // DANH MỤC LOẠI PHÒNG VÀ TIỆN NGHI
    // ======================================

    [HttpGet("options")]
    public async Task<IActionResult> GetOptions()
    {
        var roomTypes = await _db.LoaiPhongs
            .AsNoTracking()
            .Where(x => x.TrangThai)
            .OrderBy(x => x.MaLoaiPhong)
            .Select(x => new
            {
                maLoaiPhong = x.MaLoaiPhong,
                tenLoaiPhong = x.TenLoaiPhong,
                giaCoBan = x.GiaCoBan,
                dienTich = x.DienTich,
                sucChuaNguoiLon = x.SucChuaNguoiLon,
                sucChuaTreEm = x.SucChuaTreEm
            })
            .ToListAsync();

        var amenities = await _db.TienNghis
            .AsNoTracking()
            .Where(x => x.TrangThai)
            .OrderBy(x => x.MaTienNghi)
            .Select(x => new
            {
                maTienNghi = x.MaTienNghi,
                tenTienNghi = x.TenTienNghi,
                moTa = x.MoTa
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            roomTypes,
            amenities
        });
    }

    // ======================================
    // LẤY SỞ THÍCH CỦA KHÁCH ĐĂNG NHẬP
    // ======================================

    [HttpGet]
    public async Task<IActionResult> GetPreferences()
    {
        int? customerId = await LayMaKhachHang();

        if (!customerId.HasValue)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy hồ sơ khách hàng của tài khoản."
            });
        }

        var profile = await _db.HoSoSoThiches
            .AsNoTracking()
            .Where(x => x.MaKhachHang == customerId.Value)
            .Select(x => new
            {
                maHoSo = x.MaHoSo,
                nganSachToiThieu = x.NganSachToiThieu,
                nganSachToiDa = x.NganSachToiDa,
                soNguoiMongMuon = x.SoNguoiMongMuon,
                maLoaiPhongUuTien = x.MaLoaiPhongUuTien,
                dienTichToiThieu = x.DienTichToiThieu,
                ngayCapNhat = x.NgayCapNhat
            })
            .FirstOrDefaultAsync();

        if (profile == null)
        {
            return Ok(new
            {
                success = true,
                hasPreferences = false,
                preferences = (object?)null,
                amenities = Array.Empty<object>()
            });
        }

        var amenities = await _db.SoThichTienNghis
            .AsNoTracking()
            .Where(x => x.MaHoSo == profile.maHoSo)
            .OrderBy(x => x.MaTienNghi)
            .Select(x => new
            {
                maTienNghi = x.MaTienNghi,
                mucDoUuTien = x.MucDoUuTien
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            hasPreferences = true,
            preferences = profile,
            amenities
        });
    }

    // ======================================
    // LƯU HOẶC CẬP NHẬT SỞ THÍCH
    // ======================================

    [HttpPut]
    public async Task<IActionResult> SavePreferences(
        [FromBody] CapNhatSoThichDto dto)
    {
        try
        {
            await _antiforgery.ValidateRequestAsync(
                HttpContext
            );
        }
        catch (AntiforgeryValidationException)
        {
            return BadRequest(new
            {
                message =
                    "Phiên bảo mật không hợp lệ. Hãy tải lại trang."
            });
        }

        int? customerId = await LayMaKhachHang();

        if (!customerId.HasValue)
        {
            return NotFound(new
            {
                message =
                    "Không tìm thấy hồ sơ khách hàng."
            });
        }

        // KIỂM TRA NGÂN SÁCH

        if (dto.NganSachToiThieu.HasValue &&
            (dto.NganSachToiThieu.Value < 0 ||
             dto.NganSachToiThieu.Value > 100000000))
        {
            return BadRequest(new
            {
                message = "Ngân sách tối thiểu không hợp lệ."
            });
        }

        if (dto.NganSachToiDa.HasValue &&
            (dto.NganSachToiDa.Value < 0 ||
             dto.NganSachToiDa.Value > 100000000))
        {
            return BadRequest(new
            {
                message = "Ngân sách tối đa không hợp lệ."
            });
        }

        if (dto.NganSachToiThieu.HasValue &&
            dto.NganSachToiDa.HasValue &&
            dto.NganSachToiThieu.Value >
            dto.NganSachToiDa.Value)
        {
            return BadRequest(new
            {
                message =
                    "Ngân sách tối thiểu không được lớn hơn tối đa."
            });
        }

        // KIỂM TRA SỐ NGƯỜI

        if (dto.SoNguoiMongMuon.HasValue &&
            (dto.SoNguoiMongMuon.Value < 1 ||
             dto.SoNguoiMongMuon.Value > 20))
        {
            return BadRequest(new
            {
                message = "Số người mong muốn phải từ 1 đến 20."
            });
        }

        // KIỂM TRA DIỆN TÍCH

        if (dto.DienTichToiThieu.HasValue &&
            (dto.DienTichToiThieu.Value < 0 ||
             dto.DienTichToiThieu.Value > 10000))
        {
            return BadRequest(new
            {
                message = "Diện tích mong muốn không hợp lệ."
            });
        }

        // KIỂM TRA LOẠI PHÒNG CÓ TỒN TẠI

        if (dto.MaLoaiPhongUuTien.HasValue)
        {
            bool roomExists = await _db.LoaiPhongs
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaLoaiPhong ==
                        dto.MaLoaiPhongUuTien.Value &&
                    x.TrangThai
                );

            if (!roomExists)
            {
                return BadRequest(new
                {
                    message =
                        "Loại phòng ưu tiên không tồn tại hoặc ngừng hoạt động."
                });
            }
        }

        var selectedAmenities =
            dto.TienNghiYeuThich ?? new();

        if (selectedAmenities.Count > 100)
        {
            return BadRequest(new
            {
                message = "Số tiện nghi được chọn quá nhiều."
            });
        }

        // KHÔNG CHO GỬI TRÙNG MÃ TIỆN NGHI

        if (selectedAmenities
            .Select(x => x.MaTienNghi)
            .Distinct()
            .Count() != selectedAmenities.Count)
        {
            return BadRequest(new
            {
                message = "Danh sách tiện nghi bị trùng."
            });
        }

        // ĐỘ ƯU TIÊN TỪ 1 ĐẾN 5

        if (selectedAmenities.Any(x =>
            x.MaTienNghi <= 0 ||
            x.MucDoUuTien < 1 ||
            x.MucDoUuTien > 5))
        {
            return BadRequest(new
            {
                message = "Mức độ ưu tiên tiện nghi không hợp lệ."
            });
        }

        var amenityIds = selectedAmenities
            .Select(x => x.MaTienNghi)
            .ToList();

        if (amenityIds.Count > 0)
        {
            int validCount = await _db.TienNghis
                .AsNoTracking()
                .CountAsync(x =>
                    amenityIds.Contains(x.MaTienNghi) &&
                    x.TrangThai
                );

            if (validCount != amenityIds.Count)
            {
                return BadRequest(new
                {
                    message =
                        "Danh sách có tiện nghi không tồn tại hoặc ngừng hoạt động."
                });
            }
        }

        // TRANSACTION: LƯU HỒ SƠ VÀ TIỆN NGHI CÙNG NHAU

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        try
        {
            var profile = await _db.HoSoSoThiches
                .FirstOrDefaultAsync(x =>
                    x.MaKhachHang == customerId.Value
                );

            if (profile == null)
            {
                profile = new HoSoSoThich
                {
                    MaKhachHang = customerId.Value,
                    NgayCapNhat = DateTime.Now
                };

                _db.HoSoSoThiches.Add(profile);
            }

            profile.NganSachToiThieu =
                dto.NganSachToiThieu;

            profile.NganSachToiDa =
                dto.NganSachToiDa;

            profile.SoNguoiMongMuon =
                dto.SoNguoiMongMuon;

            profile.MaLoaiPhongUuTien =
                dto.MaLoaiPhongUuTien;

            profile.DienTichToiThieu =
                dto.DienTichToiThieu;

            profile.NgayCapNhat = DateTime.Now;

            await _db.SaveChangesAsync();

            // THAY DANH SÁCH TIỆN NGHI CŨ
            // BẰNG DANH SÁCH KHÁCH VỪA CHỌN

            var oldAmenities = await _db.SoThichTienNghis
                .Where(x => x.MaHoSo == profile.MaHoSo)
                .ToListAsync();

            _db.SoThichTienNghis.RemoveRange(
                oldAmenities
            );

            await _db.SaveChangesAsync();

            foreach (var item in selectedAmenities)
            {
                _db.SoThichTienNghis.Add(
                    new SoThichTienNghi
                    {
                        MaHoSo = profile.MaHoSo,
                        MaTienNghi = item.MaTienNghi,
                        MucDoUuTien = item.MucDoUuTien
                    }
                );
            }

            await _db.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message =
                    "Đã lưu sở thích lưu trú thành công!"
            });
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message =
                    "Không thể lưu sở thích do dữ liệu vừa thay đổi. " +
                    "Hãy tải lại trang và thử lại."
            });
        }
    }
}
