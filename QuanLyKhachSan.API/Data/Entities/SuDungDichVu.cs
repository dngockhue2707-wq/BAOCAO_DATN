using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class SuDungDichVu
{
    public int MaSuDungDichVu { get; set; }

    public int MaDatPhong { get; set; }

    public int? MaPhong { get; set; }

    public int MaDichVu { get; set; }

    public int SoLuong { get; set; }

    public decimal DonGia { get; set; }

    public decimal ThanhTien { get; set; }

    public DateTime ThoiGianSuDung { get; set; }

    public virtual DatPhong MaDatPhongNavigation { get; set; } = null!;

    public virtual DichVu MaDichVuNavigation { get; set; } = null!;

    public virtual Phong? MaPhongNavigation { get; set; }
}
