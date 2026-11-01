using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Data;

public partial class HotelDbContext : DbContext
{
    public HotelDbContext(DbContextOptions<HotelDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<BangGiaPhong> BangGiaPhongs { get; set; }

    public virtual DbSet<ChiTietDatPhong> ChiTietDatPhongs { get; set; }

    public virtual DbSet<DanhGium> DanhGia { get; set; }

    public virtual DbSet<DatCoc> DatCocs { get; set; }

    public virtual DbSet<DatPhong> DatPhongs { get; set; }

    public virtual DbSet<DichVu> DichVus { get; set; }

    public virtual DbSet<HinhAnhChiTietPhong> HinhAnhChiTietPhongs { get; set; }

    public virtual DbSet<HinhAnhPhong> HinhAnhPhongs { get; set; }

    public virtual DbSet<HoSoSoThich> HoSoSoThiches { get; set; }

    public virtual DbSet<HoaDon> HoaDons { get; set; }

    public virtual DbSet<KetQuaGoiY> KetQuaGoiYs { get; set; }

    public virtual DbSet<KhachHang> KhachHangs { get; set; }

    public virtual DbSet<LanGoiY> LanGoiYs { get; set; }

    public virtual DbSet<LichSuTuongTac> LichSuTuongTacs { get; set; }

    public virtual DbSet<LienHe> LienHes { get; set; }

    public virtual DbSet<LoaiPhong> LoaiPhongs { get; set; }

    public virtual DbSet<NhanVien> NhanViens { get; set; }

    public virtual DbSet<Phong> Phongs { get; set; }

    public virtual DbSet<SoThichTienNghi> SoThichTienNghis { get; set; }

    public virtual DbSet<SuDungDichVu> SuDungDichVus { get; set; }

    public virtual DbSet<TaiKhoan> TaiKhoans { get; set; }

    public virtual DbSet<ThanhToan> ThanhToans { get; set; }

    public virtual DbSet<TienNghi> TienNghis { get; set; }

    public virtual DbSet<TieuChiGoiY> TieuChiGoiYs { get; set; }

    public virtual DbSet<VaiTro> VaiTros { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BangGiaPhong>(entity =>
        {
            entity.HasKey(e => e.MaBangGia).HasName("PK__BangGiaP__5DAC5A684DB76500");

            entity.ToTable("BangGiaPhong");

            entity.Property(e => e.GiaPhong).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.MoTa).HasMaxLength(255);

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.BangGiaPhongs)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BangGiaPhong_LoaiPhong");
        });

        modelBuilder.Entity<ChiTietDatPhong>(entity =>
        {
            entity.HasKey(e => e.MaChiTietDatPhong).HasName("PK__ChiTietD__FBAB62C9D92A074B");

            entity.ToTable("ChiTietDatPhong");

            entity.Property(e => e.DonGia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ThanhTien).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.MaDatPhongNavigation).WithMany(p => p.ChiTietDatPhongs)
                .HasForeignKey(d => d.MaDatPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDatPhong_DatPhong");

            entity.HasOne(d => d.MaPhongNavigation).WithMany(p => p.ChiTietDatPhongs)
                .HasForeignKey(d => d.MaPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiTietDatPhong_Phong");
        });

        modelBuilder.Entity<DanhGium>(entity =>
        {
            entity.HasKey(e => e.MaDanhGia).HasName("PK__DanhGia__AA9515BF323CF9A0");

            entity.Property(e => e.NgayDanhGia).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.NoiDung).HasMaxLength(1000);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);

            entity.HasOne(d => d.MaDatPhongNavigation).WithMany(p => p.DanhGia)
                .HasForeignKey(d => d.MaDatPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGia_DatPhong");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.DanhGia)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGia_KhachHang");

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.DanhGia)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGia_LoaiPhong");
        });

        modelBuilder.Entity<DatCoc>(entity =>
        {
            entity.HasKey(e => e.MaDatCoc).HasName("PK__DatCoc__707D7704624FA470");

            entity.ToTable("DatCoc");

            entity.Property(e => e.GhiChu).HasMaxLength(255);
            entity.Property(e => e.MaGiaoDich).HasMaxLength(100);
            entity.Property(e => e.NgayDatCoc).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.PhuongThuc).HasMaxLength(50);
            entity.Property(e => e.SoTien).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(50)
                .HasDefaultValue("Đã thanh toán");

            entity.HasOne(d => d.MaDatPhongNavigation).WithMany(p => p.DatCocs)
                .HasForeignKey(d => d.MaDatPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DatCoc_DatPhong");
        });

        modelBuilder.Entity<DatPhong>(entity =>
        {
            entity.HasKey(e => e.MaDatPhong).HasName("PK__DatPhong__6344ADEAC57AE4ED");

            entity.ToTable("DatPhong");

            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.LyDoHuy).HasMaxLength(500);
            entity.Property(e => e.NgayDat).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.SoNguoiLon).HasDefaultValue(1);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(50)
                .HasDefaultValue("Chờ xác nhận");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.DatPhongs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DatPhong_KhachHang");

            entity.HasOne(d => d.MaNhanVienXacNhanNavigation).WithMany(p => p.DatPhongs)
                .HasForeignKey(d => d.MaNhanVienXacNhan)
                .HasConstraintName("FK_DatPhong_NhanVien");
        });

        modelBuilder.Entity<DichVu>(entity =>
        {
            entity.HasKey(e => e.MaDichVu).HasName("PK__DichVu__C0E6DE8F2B433638");

            entity.ToTable("DichVu");

            entity.Property(e => e.DonGia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.DonViTinh).HasMaxLength(50);
            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.TenDichVu).HasMaxLength(100);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);
            entity.Property(e => e.HinhAnh).HasMaxLength(500);
        });

        modelBuilder.Entity<HinhAnhChiTietPhong>(entity =>
        {
            entity.HasKey(e => e.MaHinhAnh).HasName("PK__HinhAnhC__A9C37A9B31D2B27A");

            entity.ToTable("HinhAnhChiTietPhong");

            entity.HasIndex(e => e.MaPhong, "UX_HinhAnhChiTietPhong_DaiDien")
                .IsUnique()
                .HasFilter("([AnhDaiDien]=(1))");

            entity.Property(e => e.DuongDan).HasMaxLength(500);
            entity.Property(e => e.MoTa).HasMaxLength(255);

            entity.HasOne(d => d.MaPhongNavigation).WithOne(p => p.HinhAnhChiTietPhong)
                .HasForeignKey<HinhAnhChiTietPhong>(d => d.MaPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HinhAnhChiTietPhong_Phong");
        });

        modelBuilder.Entity<HinhAnhPhong>(entity =>
        {
            entity.HasKey(e => e.MaHinhAnh).HasName("PK__HinhAnhP__A9C37A9B3C6560B0");

            entity.ToTable("HinhAnhPhong");

            entity.Property(e => e.DuongDan).HasMaxLength(500);
            entity.Property(e => e.MoTa).HasMaxLength(255);

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.HinhAnhPhongs)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HinhAnhPhong_LoaiPhong");
        });

        modelBuilder.Entity<HoSoSoThich>(entity =>
        {
            entity.HasKey(e => e.MaHoSo).HasName("PK__HoSoSoTh__1666423CA067FC79");

            entity.ToTable("HoSoSoThich");

            entity.HasIndex(e => e.MaKhachHang, "UQ__HoSoSoTh__88D2F0E4A2EF593D").IsUnique();

            entity.Property(e => e.DienTichToiThieu).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.MucDanhGiaMongMuon).HasColumnType("decimal(3, 2)");
            entity.Property(e => e.NganSachToiDa).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NganSachToiThieu).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NgayCapNhat).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaKhachHangNavigation).WithOne(p => p.HoSoSoThich)
                .HasForeignKey<HoSoSoThich>(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HoSoSoThich_KhachHang");

            entity.HasOne(d => d.MaLoaiPhongUuTienNavigation).WithMany(p => p.HoSoSoThiches)
                .HasForeignKey(d => d.MaLoaiPhongUuTien)
                .HasConstraintName("FK_HoSoSoThich_LoaiPhong");
        });

        modelBuilder.Entity<HoaDon>(entity =>
        {
            entity.HasKey(e => e.MaHoaDon).HasName("PK__HoaDon__835ED13B851951B6");

            entity.ToTable("HoaDon");

            entity.HasIndex(e => e.MaDatPhong, "UQ__HoaDon__6344ADEB7192B696").IsUnique();

            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.GiamGia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.NgayLap).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.SoTienConLai).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TienDatCoc).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TienDichVu).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TienPhong).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TongTien).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(50)
                .HasDefaultValue("Chưa thanh toán");

            entity.HasOne(d => d.MaDatPhongNavigation).WithOne(p => p.HoaDon)
                .HasForeignKey<HoaDon>(d => d.MaDatPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_HoaDon_DatPhong");

            entity.HasOne(d => d.MaNhanVienNavigation).WithMany(p => p.HoaDons)
                .HasForeignKey(d => d.MaNhanVien)
                .HasConstraintName("FK_HoaDon_NhanVien");
        });

        modelBuilder.Entity<KetQuaGoiY>(entity =>
        {
            entity.HasKey(e => e.MaKetQua).HasName("PK__KetQuaGo__D5B3102A9F1A8A88");

            entity.ToTable("KetQuaGoiY");

            entity.Property(e => e.DiemContentBased).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.DiemPhuHop).HasColumnType("decimal(10, 6)");
            entity.Property(e => e.DiemWeightedScoring).HasColumnType("decimal(10, 6)");

            entity.HasOne(d => d.MaLanGoiYNavigation).WithMany(p => p.KetQuaGoiYs)
                .HasForeignKey(d => d.MaLanGoiY)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_KetQuaGoiY_LanGoiY");

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.KetQuaGoiYs)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_KetQuaGoiY_LoaiPhong");
        });

        modelBuilder.Entity<KhachHang>(entity =>
        {
            entity.HasKey(e => e.MaKhachHang).HasName("PK__KhachHan__88D2F0E57FB42E3F");

            entity.ToTable("KhachHang");

            entity.HasIndex(e => e.MaTaiKhoan, "UX_KhachHang_MaTaiKhoan_NotNull")
                .IsUnique()
                .HasFilter("([MaTaiKhoan] IS NOT NULL)");

            entity.Property(e => e.CCCD)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.DiaChi).HasMaxLength(255);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.GioiTinh).HasMaxLength(20);
            entity.Property(e => e.HoTen).HasMaxLength(100);
            entity.Property(e => e.NgayTao).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithOne(p => p.KhachHang)
                .HasForeignKey<KhachHang>(d => d.MaTaiKhoan)
                .HasConstraintName("FK_KhachHang_TaiKhoan");
        });

        modelBuilder.Entity<LanGoiY>(entity =>
        {
            entity.HasKey(e => e.MaLanGoiY).HasName("PK__LanGoiY__A733CDDEFD7296C5");

            entity.ToTable("LanGoiY");

            entity.Property(e => e.ThoiGianGoiY).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.LanGoiYs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LanGoiY_KhachHang");
        });

        modelBuilder.Entity<LichSuTuongTac>(entity =>
        {
            entity.HasKey(e => e.MaTuongTac).HasName("PK__LichSuTu__E947A5AC421ADD44");

            entity.ToTable("LichSuTuongTac");

            entity.Property(e => e.LoaiTuongTac).HasMaxLength(50);
            entity.Property(e => e.MucDoQuanTam)
                .HasDefaultValue(1m)
                .HasColumnType("decimal(5, 2)");
            entity.Property(e => e.ThoiGian).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.LichSuTuongTacs)
                .HasForeignKey(d => d.MaKhachHang)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSuTuongTac_KhachHang");

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.LichSuTuongTacs)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LichSuTuongTac_LoaiPhong");
        });

        modelBuilder.Entity<LienHe>(entity =>
        {
            entity.HasKey(e => e.MaLienHe);

            entity.ToTable("LienHe");

            entity.Property(e => e.ChuDe).HasMaxLength(150);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.HoTen).HasMaxLength(100);
            entity.Property(e => e.NgayGui).HasDefaultValueSql("(sysdatetime())", "DF_LienHe_NgayGui");
            entity.Property(e => e.NoiDung).HasMaxLength(3000);
            entity.Property(e => e.NoiDungPhanHoi).HasMaxLength(3000);
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasDefaultValue("Chờ xử lý", "DF_LienHe_TrangThai");

            entity.HasOne(d => d.MaKhachHangNavigation).WithMany(p => p.LienHes)
                .HasForeignKey(d => d.MaKhachHang)
                .HasConstraintName("FK_LienHe_KhachHang");

            entity.HasOne(d => d.MaNhanVienPhanHoiNavigation).WithMany(p => p.LienHes)
                .HasForeignKey(d => d.MaNhanVienPhanHoi)
                .HasConstraintName("FK_LienHe_NhanVien");
        });

        modelBuilder.Entity<LoaiPhong>(entity =>
        {
            entity.HasKey(e => e.MaLoaiPhong).HasName("PK__LoaiPhon__230212174EA17DD4");

            entity.ToTable("LoaiPhong");

            entity.Property(e => e.DienTich).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.GiaCoBan).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.LoaiGiuong).HasMaxLength(100);
            entity.Property(e => e.MoTa).HasMaxLength(1000);
            entity.Property(e => e.SoGiuong).HasDefaultValue(1);
            entity.Property(e => e.TenLoaiPhong).HasMaxLength(100);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);

            entity.HasMany(d => d.MaTienNghis).WithMany(p => p.MaLoaiPhongs)
                .UsingEntity<Dictionary<string, object>>(
                    "PhongTienNghi",
                    r => r.HasOne<TienNghi>().WithMany()
                        .HasForeignKey("MaTienNghi")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PhongTienNghi_TienNghi"),
                    l => l.HasOne<LoaiPhong>().WithMany()
                        .HasForeignKey("MaLoaiPhong")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PhongTienNghi_LoaiPhong"),
                    j =>
                    {
                        j.HasKey("MaLoaiPhong", "MaTienNghi").HasName("PK__PhongTie__EDD5AAE35B08CE2F");
                        j.ToTable("PhongTienNghi");
                    });
        });

        modelBuilder.Entity<NhanVien>(entity =>
        {
            entity.HasKey(e => e.MaNhanVien).HasName("PK__NhanVien__77B2CA475C2381A2");

            entity.ToTable("NhanVien");

            entity.HasIndex(e => e.MaTaiKhoan, "UQ__NhanVien__AD7C65288C92EA46").IsUnique();

            entity.Property(e => e.ChucVu).HasMaxLength(100);
            entity.Property(e => e.DiaChi).HasMaxLength(255);
            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.HoTen).HasMaxLength(100);
            entity.Property(e => e.SoDienThoai)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);

            entity.HasOne(d => d.MaTaiKhoanNavigation).WithOne(p => p.NhanVien)
                .HasForeignKey<NhanVien>(d => d.MaTaiKhoan)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhanVien_TaiKhoan");
        });

        modelBuilder.Entity<Phong>(entity =>
        {
            entity.HasKey(e => e.MaPhong).HasName("PK__Phong__20BD5E5B0BE55D68");

            entity.ToTable("Phong");

            entity.HasIndex(e => e.SoPhong, "UQ__Phong__7C736CA1EB7FE40E").IsUnique();

            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.SoPhong).HasMaxLength(20);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasDefaultValue("Trống");

            entity.HasOne(d => d.MaLoaiPhongNavigation).WithMany(p => p.Phongs)
                .HasForeignKey(d => d.MaLoaiPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Phong_LoaiPhong");
        });

        modelBuilder.Entity<SoThichTienNghi>(entity =>
        {
            entity.HasKey(e => new { e.MaHoSo, e.MaTienNghi }).HasName("PK__SoThichT__D8B1FAC8C47280D9");

            entity.ToTable("SoThichTienNghi");

            entity.Property(e => e.MucDoUuTien).HasDefaultValue(1);

            entity.HasOne(d => d.MaHoSoNavigation).WithMany(p => p.SoThichTienNghis)
                .HasForeignKey(d => d.MaHoSo)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SoThichTienNghi_HoSo");

            entity.HasOne(d => d.MaTienNghiNavigation).WithMany(p => p.SoThichTienNghis)
                .HasForeignKey(d => d.MaTienNghi)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SoThichTienNghi_TienNghi");
        });

        modelBuilder.Entity<SuDungDichVu>(entity =>
        {
            entity.HasKey(e => e.MaSuDungDichVu).HasName("PK__SuDungDi__DA37D0B3A0B6C9B1");

            entity.ToTable("SuDungDichVu");

            entity.Property(e => e.DonGia).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SoLuong).HasDefaultValue(1);
            entity.Property(e => e.ThanhTien).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ThoiGianSuDung).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.MaDatPhongNavigation).WithMany(p => p.SuDungDichVus)
                .HasForeignKey(d => d.MaDatPhong)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SuDungDichVu_DatPhong");

            entity.HasOne(d => d.MaDichVuNavigation).WithMany(p => p.SuDungDichVus)
                .HasForeignKey(d => d.MaDichVu)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SuDungDichVu_DichVu");

            entity.HasOne(d => d.MaPhongNavigation).WithMany(p => p.SuDungDichVus)
                .HasForeignKey(d => d.MaPhong)
                .HasConstraintName("FK_SuDungDichVu_Phong");
        });

        modelBuilder.Entity<TaiKhoan>(entity =>
        {
            entity.HasKey(e => e.MaTaiKhoan).HasName("PK__TaiKhoan__AD7C6529BA753EB7");

            entity.ToTable("TaiKhoan");

            entity.HasIndex(e => e.TenDangNhap, "UQ__TaiKhoan__55F68FC076579C44").IsUnique();

            entity.Property(e => e.Email).HasMaxLength(150);
            entity.Property(e => e.MatKhau).HasMaxLength(255);
            entity.Property(e => e.NgayTao).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.TenDangNhap).HasMaxLength(100);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);

            entity.HasOne(d => d.MaVaiTroNavigation).WithMany(p => p.TaiKhoans)
                .HasForeignKey(d => d.MaVaiTro)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TaiKhoan_VaiTro");
        });

        modelBuilder.Entity<ThanhToan>(entity =>
        {
            entity.HasKey(e => e.MaThanhToan).HasName("PK__ThanhToa__D4B2584480FEF8EC");

            entity.ToTable("ThanhToan");

            entity.Property(e => e.MaGiaoDich).HasMaxLength(100);
            entity.Property(e => e.NgayThanhToan).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.PhuongThuc).HasMaxLength(50);
            entity.Property(e => e.SoTien).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(50)
                .HasDefaultValue("Thành công");

            entity.HasOne(d => d.MaHoaDonNavigation).WithMany(p => p.ThanhToans)
                .HasForeignKey(d => d.MaHoaDon)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ThanhToan_HoaDon");
        });

        modelBuilder.Entity<TienNghi>(entity =>
        {
            entity.HasKey(e => e.MaTienNghi).HasName("PK__TienNghi__ED7B8F4DF97ABB5A");

            entity.ToTable("TienNghi");

            entity.HasIndex(e => e.TenTienNghi, "UQ__TienNghi__6CE380096A090B32").IsUnique();

            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.TenTienNghi).HasMaxLength(100);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);
        });

        modelBuilder.Entity<TieuChiGoiY>(entity =>
        {
            entity.HasKey(e => e.MaTieuChi).HasName("PK__TieuChiG__41F85A3526F3210B");

            entity.ToTable("TieuChiGoiY");

            entity.HasIndex(e => e.TenTieuChi, "UQ__TieuChiG__D7AD86BA1A1EC0DF").IsUnique();

            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.TenTieuChi).HasMaxLength(100);
            entity.Property(e => e.TrangThai).HasDefaultValue(true);
            entity.Property(e => e.TrongSo).HasColumnType("decimal(5, 4)");
        });

        modelBuilder.Entity<VaiTro>(entity =>
        {
            entity.HasKey(e => e.MaVaiTro).HasName("PK__VaiTro__C24C41CF0E67F24B");

            entity.ToTable("VaiTro");

            entity.HasIndex(e => e.TenVaiTro, "UQ__VaiTro__1DA55814F6644640").IsUnique();

            entity.Property(e => e.MoTa).HasMaxLength(255);
            entity.Property(e => e.TenVaiTro).HasMaxLength(50);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
