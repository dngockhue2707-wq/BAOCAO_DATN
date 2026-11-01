using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class DanhGium
{
    public int MaDanhGia { get; set; }

    public int MaKhachHang { get; set; }

    public int MaDatPhong { get; set; }

    public int MaLoaiPhong { get; set; }

    public int SoSao { get; set; }

    public string? NoiDung { get; set; }

    public DateTime NgayDanhGia { get; set; }

    public bool TrangThai { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;

    public virtual KhachHang MaKhachHangNavigation { get; set; } = null!;

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;
}
