using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class KhachHang
{
    public int MaKhachHang { get; set; }

    public int? MaTaiKhoan { get; set; }

    public string HoTen { get; set; } = null!;

    public string? SoDienThoai { get; set; }

    public string? Email { get; set; }

    public string? CCCD { get; set; }

    public DateOnly? NgaySinh { get; set; }

    public string? GioiTinh { get; set; }

    public string? DiaChi { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual ICollection<DanhGium> DanhGia { get; set; } = new List<DanhGium>();

    public virtual ICollection<DatPhong> DatPhongs { get; set; } = new List<DatPhong>();

    public virtual HoSoSoThich? HoSoSoThich { get; set; }

    public virtual ICollection<LanGoiY> LanGoiYs { get; set; } = new List<LanGoiY>();

    public virtual ICollection<LichSuTuongTac> LichSuTuongTacs { get; set; } = new List<LichSuTuongTac>();

    public virtual ICollection<LienHe> LienHes { get; set; } = new List<LienHe>();

    public virtual TaiKhoan? MaTaiKhoanNavigation { get; set; }
}
