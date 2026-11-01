using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class BangGiaPhong
{
    public int MaBangGia { get; set; }

    public int MaLoaiPhong { get; set; }

    public decimal GiaPhong { get; set; }

    public DateOnly TuNgay { get; set; }

    public DateOnly? DenNgay { get; set; }

    public string? MoTa { get; set; }

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;
}
