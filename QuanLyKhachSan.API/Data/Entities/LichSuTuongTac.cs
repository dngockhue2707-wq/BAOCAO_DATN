using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class LichSuTuongTac
{
    public long MaTuongTac { get; set; }

    public int MaKhachHang { get; set; }

    public int MaLoaiPhong { get; set; }

    public string LoaiTuongTac { get; set; } = null!;

    public DateTime ThoiGian { get; set; }

    public decimal? MucDoQuanTam { get; set; }

    public virtual KhachHang MaKhachHangNavigation { get; set; } = null!;

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;
}
