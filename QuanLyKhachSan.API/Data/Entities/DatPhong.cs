using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class DatPhong
{
    public int MaDatPhong { get; set; }

    public int MaKhachHang { get; set; }

    public DateTime NgayDat { get; set; }

    public DateOnly NgayNhanPhong { get; set; }

    public DateOnly NgayTraPhong { get; set; }

    public int SoNguoiLon { get; set; }

    public int SoTreEm { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? GhiChu { get; set; }

    public int? MaNhanVienXacNhan { get; set; }

    public DateTime? NgayXacNhan { get; set; }

    public string? LyDoHuy { get; set; }

    public virtual ICollection<ChiTietDatPhong> ChiTietDatPhongs { get; set; } = new List<ChiTietDatPhong>();

    public virtual ICollection<DanhGium> DanhGia { get; set; } = new List<DanhGium>();

    public virtual ICollection<DatCoc> DatCocs { get; set; } = new List<DatCoc>();

    public virtual HoaDon? HoaDon { get; set; }

    public virtual KhachHang MaKhachHangNavigation { get; set; } = null!;

    public virtual NhanVien? MaNhanVienXacNhanNavigation { get; set; }

    public virtual ICollection<SuDungDichVu> SuDungDichVus { get; set; } = new List<SuDungDichVu>();
}
