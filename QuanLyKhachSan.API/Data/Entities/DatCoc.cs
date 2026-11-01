using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class DatCoc
{
    public int MaDatCoc { get; set; }

    public int MaDatPhong { get; set; }

    public decimal SoTien { get; set; }

    public DateTime NgayDatCoc { get; set; }

    public string? PhuongThuc { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? MaGiaoDich { get; set; }

    public string? GhiChu { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;
}
