using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class DichVu
{
    public int MaDichVu { get; set; }

    public string TenDichVu { get; set; } = null!;

    public string? DonViTinh { get; set; }

    public decimal DonGia { get; set; }

    public string? MoTa { get; set; }

    public bool TrangThai { get; set; }

    public string? HinhAnh { get; set; }

    public virtual ICollection<SuDungDichVu> SuDungDichVus { get; set; } = new List<SuDungDichVu>();
}
