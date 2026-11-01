using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class HinhAnhChiTietPhong
{
    public int MaHinhAnh { get; set; }

    public int MaPhong { get; set; }

    public string DuongDan { get; set; } = null!;

    public string? MoTa { get; set; }

    public bool AnhDaiDien { get; set; }

    public int ThuTuHienThi { get; set; }

    public virtual Phong MaPhongNavigation { get; set; } = null!;
}
