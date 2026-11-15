
using System;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class YeuCauHuyPhong
{
    public int MaYeuCau { get; set; }

    public int MaDatPhong { get; set; }

    public string LyDoHuy { get; set; } = null!;

    public DateTime NgayYeuCau { get; set; }

    public string TrangThai { get; set; } = "Chờ xử lý";

    public decimal TongTienCoc { get; set; }

    public decimal TyLeHoan { get; set; }

    public decimal SoTienDuKienHoan { get; set; }

    public int? MaNhanVienXuLy { get; set; }

    public DateTime? NgayXuLy { get; set; }

    public string? GhiChuXuLy { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;

    public virtual NhanVien? MaNhanVienXuLyNavigation { get; set; }
}
