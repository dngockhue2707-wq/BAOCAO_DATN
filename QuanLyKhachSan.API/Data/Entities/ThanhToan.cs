using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class ThanhToan
{
    public int MaThanhToan { get; set; }

    public int MaHoaDon { get; set; }

    public decimal SoTien { get; set; }

    public string? PhuongThuc { get; set; }

    public DateTime NgayThanhToan { get; set; }

    public string? MaGiaoDich { get; set; }

    public string? TrangThai { get; set; }

    public virtual HoaDon MaHoaDonNavigation { get; set; } = null!;
}
