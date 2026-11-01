using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class KetQuaGoiY
{
    public long MaKetQua { get; set; }

    public long MaLanGoiY { get; set; }

    public int MaLoaiPhong { get; set; }

    public decimal DiemContentBased { get; set; }

    public decimal DiemWeightedScoring { get; set; }

    public decimal DiemPhuHop { get; set; }

    public int ThuHang { get; set; }

    public virtual LanGoiY MaLanGoiYNavigation { get; set; } = null!;

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;
}
