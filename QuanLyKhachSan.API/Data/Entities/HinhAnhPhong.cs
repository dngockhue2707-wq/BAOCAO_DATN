using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class HinhAnhPhong
{
    public int MaHinhAnh { get; set; }

    public int MaLoaiPhong { get; set; }

    public string DuongDan { get; set; } = null!;

    public string? MoTa { get; set; }

    public bool AnhDaiDien { get; set; }

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;
}
