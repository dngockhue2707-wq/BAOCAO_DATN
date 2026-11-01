using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class ChiTietDatPhong
{
    public int MaChiTietDatPhong { get; set; }

    public int MaDatPhong { get; set; }

    public int MaPhong { get; set; }

    public decimal DonGia { get; set; }

    public int SoDem { get; set; }

    public decimal ThanhTien { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;

    public virtual Phong MaPhongNavigation { get; set; } = null!;
}
