using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class LienHe
{
    public int MaLienHe { get; set; }

    public int? MaKhachHang { get; set; }

    public string HoTen { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string? SoDienThoai { get; set; }

    public string ChuDe { get; set; } = null!;

    public string NoiDung { get; set; } = null!;

    public DateTime NgayGui { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? NoiDungPhanHoi { get; set; }

    public int? MaNhanVienPhanHoi { get; set; }

    public DateTime? NgayPhanHoi { get; set; }

    public virtual KhachHang? MaKhachHangNavigation { get; set; }

    public virtual NhanVien? MaNhanVienPhanHoiNavigation { get; set; }
}
