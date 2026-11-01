using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class Phong
{
    public int MaPhong { get; set; }

    public string SoPhong { get; set; } = null!;

    public int MaLoaiPhong { get; set; }

    public int? Tang { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? MoTa { get; set; }

    public virtual ICollection<ChiTietDatPhong> ChiTietDatPhongs { get; set; } = new List<ChiTietDatPhong>();

    public virtual HinhAnhChiTietPhong? HinhAnhChiTietPhong { get; set; }

    public virtual LoaiPhong MaLoaiPhongNavigation { get; set; } = null!;

    public virtual ICollection<SuDungDichVu> SuDungDichVus { get; set; } = new List<SuDungDichVu>();
}
