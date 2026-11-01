using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class TienNghi
{
    public int MaTienNghi { get; set; }

    public string TenTienNghi { get; set; } = null!;

    public string? MoTa { get; set; }

    public bool TrangThai { get; set; }

    public virtual ICollection<SoThichTienNghi> SoThichTienNghis { get; set; } = new List<SoThichTienNghi>();

    public virtual ICollection<LoaiPhong> MaLoaiPhongs { get; set; } = new List<LoaiPhong>();
}
