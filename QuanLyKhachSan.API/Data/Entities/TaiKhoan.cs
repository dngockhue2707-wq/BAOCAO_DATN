using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class TaiKhoan
{
    public int MaTaiKhoan { get; set; }

    public string TenDangNhap { get; set; } = null!;

    public string MatKhau { get; set; } = null!;

    public string? Email { get; set; }

    public int MaVaiTro { get; set; }

    public bool TrangThai { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual KhachHang? KhachHang { get; set; }

    public virtual VaiTro MaVaiTroNavigation { get; set; } = null!;

    public virtual NhanVien? NhanVien { get; set; }
}
