using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class HoaDon
{
    public int MaHoaDon { get; set; }

    public int MaDatPhong { get; set; }

    public int? MaNhanVien { get; set; }

    public DateTime NgayLap { get; set; }

    public decimal TienPhong { get; set; }

    public decimal TienDichVu { get; set; }

    public decimal TienDatCoc { get; set; }

    public decimal GiamGia { get; set; }

    public decimal TongTien { get; set; }

    public decimal SoTienConLai { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? GhiChu { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;

    public virtual NhanVien? MaNhanVienNavigation { get; set; }

    public virtual ICollection<ThanhToan> ThanhToans { get; set; } = new List<ThanhToan>();
}
