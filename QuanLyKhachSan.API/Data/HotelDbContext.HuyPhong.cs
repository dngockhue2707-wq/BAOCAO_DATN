
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Data;

public partial class HotelDbContext
{
    public virtual DbSet<YeuCauHuyPhong> YeuCauHuyPhongs
        => Set<YeuCauHuyPhong>();

    public virtual DbSet<HoanCoc> HoanCocs
        => Set<HoanCoc>();

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        // =============================================
        // BANG YEU CAU HUY PHONG
        // =============================================

        modelBuilder.Entity<YeuCauHuyPhong>(entity =>
        {
            entity.ToTable("YeuCauHuyPhong");

            entity.HasKey(e => e.MaYeuCau);

            entity.Property(e => e.MaYeuCau)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.LyDoHuy)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(e => e.NgayYeuCau)
                .HasColumnType("datetime2")
                .HasDefaultValueSql("SYSDATETIME()");

            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasDefaultValue("Chờ xử lý")
                .IsRequired();

            entity.Property(e => e.TongTienCoc)
                .HasColumnType("decimal(18,2)");

            entity.Property(e => e.TyLeHoan)
                .HasColumnType("decimal(5,2)");

            entity.Property(e => e.SoTienDuKienHoan)
                .HasColumnType("decimal(18,2)");

            entity.Property(e => e.NgayXuLy)
                .HasColumnType("datetime2");

            entity.Property(e => e.GhiChuXuLy)
                .HasMaxLength(500);

            entity.HasIndex(e => e.MaDatPhong)
                .IsUnique()
                .HasDatabaseName(
                    "UX_YeuCauHuyPhong_ChoXuLy"
                )
                .HasFilter(
                    "[TrangThai] = N'Chờ xử lý'"
                );

            entity.HasOne(e => e.MaDatPhongNavigation)
                .WithMany()
                .HasForeignKey(e => e.MaDatPhong)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName(
                    "FK_YeuCauHuyPhong_DatPhong"
                );

            entity.HasOne(e => e.MaNhanVienXuLyNavigation)
                .WithMany()
                .HasForeignKey(e => e.MaNhanVienXuLy)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName(
                    "FK_YeuCauHuyPhong_NhanVien"
                );
        });

        // =============================================
        // BANG HOAN COC
        // =============================================

        modelBuilder.Entity<HoanCoc>(entity =>
        {
            entity.ToTable("HoanCoc");

            entity.HasKey(e => e.MaHoanCoc);

            entity.Property(e => e.MaHoanCoc)
                .ValueGeneratedOnAdd();

            entity.Property(e => e.SoTienHoan)
                .HasColumnType("decimal(18,2)");

            entity.Property(e => e.PhuongThuc)
                .HasMaxLength(50);

            entity.Property(e => e.MaGiaoDichHoan)
                .HasMaxLength(100);

            entity.Property(e => e.TrangThai)
                .HasMaxLength(30)
                .HasDefaultValue("Chờ hoàn")
                .IsRequired();

            entity.Property(e => e.NgayTao)
                .HasColumnType("datetime2")
                .HasDefaultValueSql("SYSDATETIME()");

            entity.Property(e => e.NgayHoan)
                .HasColumnType("datetime2");

            entity.Property(e => e.GhiChu)
                .HasMaxLength(500);

            entity.HasIndex(e => e.MaDatCoc)
                .IsUnique()
                .HasDatabaseName(
                    "UX_HoanCoc_MaDatCoc"
                );

            entity.HasOne(e => e.MaYeuCauNavigation)
                .WithMany()
                .HasForeignKey(e => e.MaYeuCau)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName(
                    "FK_HoanCoc_YeuCauHuyPhong"
                );

            entity.HasOne(e => e.MaDatCocNavigation)
                .WithMany()
                .HasForeignKey(e => e.MaDatCoc)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName(
                    "FK_HoanCoc_DatCoc"
                );

            entity.HasOne(e => e.MaNhanVienThucHienNavigation)
                .WithMany()
                .HasForeignKey(e => e.MaNhanVienThucHien)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName(
                    "FK_HoanCoc_NhanVien"
                );
        });
    }
}
