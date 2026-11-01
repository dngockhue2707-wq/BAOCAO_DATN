using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class HoSoSoThich
{
    public int MaHoSo { get; set; }

    public int MaKhachHang { get; set; }

    public decimal? NganSachToiThieu { get; set; }

    public decimal? NganSachToiDa { get; set; }

    public int? SoNguoiMongMuon { get; set; }

    public int? MaLoaiPhongUuTien { get; set; }

    public decimal? DienTichToiThieu { get; set; }

    public decimal? MucDanhGiaMongMuon { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public virtual KhachHang MaKhachHangNavigation { get; set; } = null!;

    public virtual LoaiPhong? MaLoaiPhongUuTienNavigation { get; set; }

    public virtual ICollection<SoThichTienNghi> SoThichTienNghis { get; set; } = new List<SoThichTienNghi>();
}
