using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class SoThichTienNghi
{
    public int MaHoSo { get; set; }

    public int MaTienNghi { get; set; }

    public int MucDoUuTien { get; set; }

    public virtual HoSoSoThich MaHoSoNavigation { get; set; } = null!;

    public virtual TienNghi MaTienNghiNavigation { get; set; } = null!;
}
