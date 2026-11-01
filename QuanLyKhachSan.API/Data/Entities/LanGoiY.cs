using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class LanGoiY
{
    public long MaLanGoiY { get; set; }

    public int MaKhachHang { get; set; }

    public DateOnly? NgayNhanPhong { get; set; }

    public DateOnly? NgayTraPhong { get; set; }

    public int? SoNguoi { get; set; }

    public DateTime ThoiGianGoiY { get; set; }

    public virtual ICollection<KetQuaGoiY> KetQuaGoiYs { get; set; } = new List<KetQuaGoiY>();

    public virtual KhachHang MaKhachHangNavigation { get; set; } = null!;
}
