using System;
using System.Collections.Generic;

namespace QuanLyKhachSan.API.Data.Entities;

public partial class TieuChiGoiY
{
    public int MaTieuChi { get; set; }

    public string TenTieuChi { get; set; } = null!;

    public decimal TrongSo { get; set; }

    public string? MoTa { get; set; }

    public bool TrangThai { get; set; }
}
