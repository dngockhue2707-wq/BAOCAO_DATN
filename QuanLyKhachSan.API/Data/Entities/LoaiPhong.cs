using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class LoaiPhong
{
    public int MaLoaiPhong { get; set; }

    public string TenLoaiPhong { get; set; } = null!;

    public string? MoTa { get; set; }

    public int SucChuaNguoiLon { get; set; }

    public int SucChuaTreEm { get; set; }

    public decimal? DienTich { get; set; }

    public int? SoGiuong { get; set; }

    public string? LoaiGiuong { get; set; }

    public decimal GiaCoBan { get; set; }

    public bool TrangThai { get; set; }

    public virtual ICollection<BangGiaPhong> BangGiaPhongs { get; set; } = new List<BangGiaPhong>();

    public virtual ICollection<DanhGium> DanhGia { get; set; } = new List<DanhGium>();

    public virtual ICollection<HinhAnhPhong> HinhAnhPhongs { get; set; } = new List<HinhAnhPhong>();

    public virtual ICollection<HoSoSoThich> HoSoSoThiches { get; set; } = new List<HoSoSoThich>();

    public virtual ICollection<KetQuaGoiY> KetQuaGoiYs { get; set; } = new List<KetQuaGoiY>();

    public virtual ICollection<LichSuTuongTac> LichSuTuongTacs { get; set; } = new List<LichSuTuongTac>();

    public virtual ICollection<Phong> Phongs { get; set; } = new List<Phong>();

    public virtual ICollection<TienNghi> MaTienNghis { get; set; } = new List<TienNghi>();
}
