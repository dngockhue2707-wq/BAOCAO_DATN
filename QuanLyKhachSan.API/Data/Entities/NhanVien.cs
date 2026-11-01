using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class NhanVien
{
    public int MaNhanVien { get; set; }

    public int MaTaiKhoan { get; set; }

    public string HoTen { get; set; } = null!;

    public string? SoDienThoai { get; set; }

    public string? Email { get; set; }

    public string? DiaChi { get; set; }

    public string? ChucVu { get; set; }

    public DateOnly? NgayVaoLam { get; set; }

    public bool TrangThai { get; set; }

    public virtual ICollection<DatPhong> DatPhongs { get; set; } = new List<DatPhong>();

    public virtual ICollection<HoaDon> HoaDons { get; set; } = new List<HoaDon>();

    public virtual ICollection<LienHe> LienHes { get; set; } = new List<LienHe>();

    public virtual TaiKhoan MaTaiKhoanNavigation { get; set; } = null!;
}
