
using System;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class HoanCoc
{
    public int MaHoanCoc { get; set; }

    public int MaYeuCau { get; set; }

    public int MaDatCoc { get; set; }

    public decimal SoTienHoan { get; set; }

    public string? PhuongThuc { get; set; }

    public string? MaGiaoDichHoan { get; set; }

    public string TrangThai { get; set; } = "Chờ hoàn";

    public DateTime NgayTao { get; set; }

    public DateTime? NgayHoan { get; set; }

    public int? MaNhanVienThucHien { get; set; }

    public string? GhiChu { get; set; }

    public virtual YeuCauHuyPhong MaYeuCauNavigation { get; set; } = null!;

    public virtual DatCoc MaDatCocNavigation { get; set; } = null!;

    public virtual NhanVien? MaNhanVienThucHienNavigation { get; set; }
}
