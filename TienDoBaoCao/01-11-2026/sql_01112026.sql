USE [QuanLyKhachSan]
GO
/****** Object:  Table [dbo].[BangGiaPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[BangGiaPhong](
	[MaBangGia] [int] IDENTITY(1,1) NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[GiaPhong] [decimal](18, 2) NOT NULL,
	[TuNgay] [date] NOT NULL,
	[DenNgay] [date] NULL,
	[MoTa] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaBangGia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ChiTietDatPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ChiTietDatPhong](
	[MaChiTietDatPhong] [int] IDENTITY(1,1) NOT NULL,
	[MaDatPhong] [int] NOT NULL,
	[MaPhong] [int] NOT NULL,
	[DonGia] [decimal](18, 2) NOT NULL,
	[SoDem] [int] NOT NULL,
	[ThanhTien] [decimal](18, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaChiTietDatPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DanhGia]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DanhGia](
	[MaDanhGia] [int] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NOT NULL,
	[MaDatPhong] [int] NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[SoSao] [int] NOT NULL,
	[NoiDung] [nvarchar](1000) NULL,
	[NgayDanhGia] [datetime2](7) NOT NULL,
	[TrangThai] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaDanhGia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DatCoc]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DatCoc](
	[MaDatCoc] [int] IDENTITY(1,1) NOT NULL,
	[MaDatPhong] [int] NOT NULL,
	[SoTien] [decimal](18, 2) NOT NULL,
	[NgayDatCoc] [datetime2](7) NOT NULL,
	[PhuongThuc] [nvarchar](50) NULL,
	[TrangThai] [nvarchar](50) NOT NULL,
	[MaGiaoDich] [nvarchar](100) NULL,
	[GhiChu] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaDatCoc] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DatPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DatPhong](
	[MaDatPhong] [int] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NOT NULL,
	[NgayDat] [datetime2](7) NOT NULL,
	[NgayNhanPhong] [date] NOT NULL,
	[NgayTraPhong] [date] NOT NULL,
	[SoNguoiLon] [int] NOT NULL,
	[SoTreEm] [int] NOT NULL,
	[TrangThai] [nvarchar](50) NOT NULL,
	[GhiChu] [nvarchar](500) NULL,
	[MaNhanVienXacNhan] [int] NULL,
	[NgayXacNhan] [datetime2](7) NULL,
	[LyDoHuy] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaDatPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DichVu]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DichVu](
	[MaDichVu] [int] IDENTITY(1,1) NOT NULL,
	[TenDichVu] [nvarchar](100) NOT NULL,
	[DonViTinh] [nvarchar](50) NULL,
	[DonGia] [decimal](18, 2) NOT NULL,
	[MoTa] [nvarchar](500) NULL,
	[TrangThai] [bit] NOT NULL,
	[HinhAnh] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaDichVu] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HinhAnhChiTietPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HinhAnhChiTietPhong](
	[MaHinhAnh] [int] IDENTITY(1,1) NOT NULL,
	[MaPhong] [int] NOT NULL,
	[DuongDan] [nvarchar](500) NOT NULL,
	[MoTa] [nvarchar](255) NULL,
	[AnhDaiDien] [bit] NOT NULL,
	[ThuTuHienThi] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaHinhAnh] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HinhAnhPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HinhAnhPhong](
	[MaHinhAnh] [int] IDENTITY(1,1) NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[DuongDan] [nvarchar](500) NOT NULL,
	[MoTa] [nvarchar](255) NULL,
	[AnhDaiDien] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaHinhAnh] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HoaDon]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HoaDon](
	[MaHoaDon] [int] IDENTITY(1,1) NOT NULL,
	[MaDatPhong] [int] NOT NULL,
	[MaNhanVien] [int] NULL,
	[NgayLap] [datetime2](7) NOT NULL,
	[TienPhong] [decimal](18, 2) NOT NULL,
	[TienDichVu] [decimal](18, 2) NOT NULL,
	[TienDatCoc] [decimal](18, 2) NOT NULL,
	[GiamGia] [decimal](18, 2) NOT NULL,
	[TongTien] [decimal](18, 2) NOT NULL,
	[SoTienConLai] [decimal](18, 2) NOT NULL,
	[TrangThai] [nvarchar](50) NOT NULL,
	[GhiChu] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaHoaDon] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[HoSoSoThich]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[HoSoSoThich](
	[MaHoSo] [int] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NOT NULL,
	[NganSachToiThieu] [decimal](18, 2) NULL,
	[NganSachToiDa] [decimal](18, 2) NULL,
	[SoNguoiMongMuon] [int] NULL,
	[MaLoaiPhongUuTien] [int] NULL,
	[DienTichToiThieu] [decimal](10, 2) NULL,
	[MucDanhGiaMongMuon] [decimal](3, 2) NULL,
	[NgayCapNhat] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaHoSo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[KetQuaGoiY]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[KetQuaGoiY](
	[MaKetQua] [bigint] IDENTITY(1,1) NOT NULL,
	[MaLanGoiY] [bigint] NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[DiemContentBased] [decimal](10, 6) NOT NULL,
	[DiemWeightedScoring] [decimal](10, 6) NOT NULL,
	[DiemPhuHop] [decimal](10, 6) NOT NULL,
	[ThuHang] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaKetQua] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[KhachHang]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[KhachHang](
	[MaKhachHang] [int] IDENTITY(1,1) NOT NULL,
	[MaTaiKhoan] [int] NULL,
	[HoTen] [nvarchar](100) NOT NULL,
	[SoDienThoai] [varchar](20) NULL,
	[Email] [nvarchar](150) NULL,
	[CCCD] [varchar](20) NULL,
	[NgaySinh] [date] NULL,
	[GioiTinh] [nvarchar](20) NULL,
	[DiaChi] [nvarchar](255) NULL,
	[NgayTao] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaKhachHang] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LanGoiY]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LanGoiY](
	[MaLanGoiY] [bigint] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NOT NULL,
	[NgayNhanPhong] [date] NULL,
	[NgayTraPhong] [date] NULL,
	[SoNguoi] [int] NULL,
	[ThoiGianGoiY] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaLanGoiY] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LichSuTuongTac]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LichSuTuongTac](
	[MaTuongTac] [bigint] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[LoaiTuongTac] [nvarchar](50) NOT NULL,
	[ThoiGian] [datetime2](7) NOT NULL,
	[MucDoQuanTam] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaTuongTac] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LienHe]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LienHe](
	[MaLienHe] [int] IDENTITY(1,1) NOT NULL,
	[MaKhachHang] [int] NULL,
	[HoTen] [nvarchar](100) NOT NULL,
	[Email] [nvarchar](150) NOT NULL,
	[SoDienThoai] [varchar](20) NULL,
	[ChuDe] [nvarchar](150) NOT NULL,
	[NoiDung] [nvarchar](3000) NOT NULL,
	[NgayGui] [datetime2](7) NOT NULL,
	[TrangThai] [nvarchar](30) NOT NULL,
	[NoiDungPhanHoi] [nvarchar](3000) NULL,
	[MaNhanVienPhanHoi] [int] NULL,
	[NgayPhanHoi] [datetime2](7) NULL,
 CONSTRAINT [PK_LienHe] PRIMARY KEY CLUSTERED 
(
	[MaLienHe] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LoaiPhong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LoaiPhong](
	[MaLoaiPhong] [int] IDENTITY(1,1) NOT NULL,
	[TenLoaiPhong] [nvarchar](100) NOT NULL,
	[MoTa] [nvarchar](1000) NULL,
	[SucChuaNguoiLon] [int] NOT NULL,
	[SucChuaTreEm] [int] NOT NULL,
	[DienTich] [decimal](10, 2) NULL,
	[SoGiuong] [int] NULL,
	[LoaiGiuong] [nvarchar](100) NULL,
	[GiaCoBan] [decimal](18, 2) NOT NULL,
	[TrangThai] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaLoaiPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[NhanVien]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[NhanVien](
	[MaNhanVien] [int] IDENTITY(1,1) NOT NULL,
	[MaTaiKhoan] [int] NOT NULL,
	[HoTen] [nvarchar](100) NOT NULL,
	[SoDienThoai] [varchar](20) NULL,
	[Email] [nvarchar](150) NULL,
	[DiaChi] [nvarchar](255) NULL,
	[ChucVu] [nvarchar](100) NULL,
	[NgayVaoLam] [date] NULL,
	[TrangThai] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaNhanVien] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Phong]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Phong](
	[MaPhong] [int] IDENTITY(1,1) NOT NULL,
	[SoPhong] [nvarchar](20) NOT NULL,
	[MaLoaiPhong] [int] NOT NULL,
	[Tang] [int] NULL,
	[TrangThai] [nvarchar](30) NOT NULL,
	[MoTa] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PhongTienNghi]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PhongTienNghi](
	[MaLoaiPhong] [int] NOT NULL,
	[MaTienNghi] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaLoaiPhong] ASC,
	[MaTienNghi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SoThichTienNghi]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SoThichTienNghi](
	[MaHoSo] [int] NOT NULL,
	[MaTienNghi] [int] NOT NULL,
	[MucDoUuTien] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaHoSo] ASC,
	[MaTienNghi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SuDungDichVu]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SuDungDichVu](
	[MaSuDungDichVu] [int] IDENTITY(1,1) NOT NULL,
	[MaDatPhong] [int] NOT NULL,
	[MaPhong] [int] NULL,
	[MaDichVu] [int] NOT NULL,
	[SoLuong] [int] NOT NULL,
	[DonGia] [decimal](18, 2) NOT NULL,
	[ThanhTien] [decimal](18, 2) NOT NULL,
	[ThoiGianSuDung] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaSuDungDichVu] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TaiKhoan]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TaiKhoan](
	[MaTaiKhoan] [int] IDENTITY(1,1) NOT NULL,
	[TenDangNhap] [nvarchar](100) NOT NULL,
	[MatKhau] [nvarchar](255) NOT NULL,
	[Email] [nvarchar](150) NULL,
	[MaVaiTro] [int] NOT NULL,
	[TrangThai] [bit] NOT NULL,
	[NgayTao] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaTaiKhoan] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ThanhToan]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ThanhToan](
	[MaThanhToan] [int] IDENTITY(1,1) NOT NULL,
	[MaHoaDon] [int] NOT NULL,
	[SoTien] [decimal](18, 2) NOT NULL,
	[PhuongThuc] [nvarchar](50) NULL,
	[NgayThanhToan] [datetime2](7) NOT NULL,
	[MaGiaoDich] [nvarchar](100) NULL,
	[TrangThai] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaThanhToan] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TienNghi]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TienNghi](
	[MaTienNghi] [int] IDENTITY(1,1) NOT NULL,
	[TenTienNghi] [nvarchar](100) NOT NULL,
	[MoTa] [nvarchar](500) NULL,
	[TrangThai] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaTienNghi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TieuChiGoiY]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TieuChiGoiY](
	[MaTieuChi] [int] IDENTITY(1,1) NOT NULL,
	[TenTieuChi] [nvarchar](100) NOT NULL,
	[TrongSo] [decimal](5, 4) NOT NULL,
	[MoTa] [nvarchar](500) NULL,
	[TrangThai] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[MaTieuChi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VaiTro]    Script Date: 11/1/2026 9:55:42 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VaiTro](
	[MaVaiTro] [int] IDENTITY(1,1) NOT NULL,
	[TenVaiTro] [nvarchar](50) NOT NULL,
	[MoTa] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED 
(
	[MaVaiTro] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET IDENTITY_INSERT [dbo].[BangGiaPhong] ON 

INSERT [dbo].[BangGiaPhong] ([MaBangGia], [MaLoaiPhong], [GiaPhong], [TuNgay], [DenNgay], [MoTa]) VALUES (1, 1, CAST(650000.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date), NULL, N'Giá phòng tiêu chuẩn')
INSERT [dbo].[BangGiaPhong] ([MaBangGia], [MaLoaiPhong], [GiaPhong], [TuNgay], [DenNgay], [MoTa]) VALUES (2, 2, CAST(850000.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date), NULL, N'Giá phòng cao cấp')
INSERT [dbo].[BangGiaPhong] ([MaBangGia], [MaLoaiPhong], [GiaPhong], [TuNgay], [DenNgay], [MoTa]) VALUES (3, 3, CAST(1200000.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date), NULL, N'Giá phòng sang trọng')
INSERT [dbo].[BangGiaPhong] ([MaBangGia], [MaLoaiPhong], [GiaPhong], [TuNgay], [DenNgay], [MoTa]) VALUES (4, 4, CAST(2200000.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date), NULL, N'Giá phòng thượng hạng')
INSERT [dbo].[BangGiaPhong] ([MaBangGia], [MaLoaiPhong], [GiaPhong], [TuNgay], [DenNgay], [MoTa]) VALUES (5, 8, CAST(3500000.00 AS Decimal(18, 2)), CAST(N'2026-01-01' AS Date), NULL, N'Giá phòng hiện hành')
SET IDENTITY_INSERT [dbo].[BangGiaPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[ChiTietDatPhong] ON 

INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (1, 1, 11, CAST(1200000.00 AS Decimal(18, 2)), 2, CAST(2400000.00 AS Decimal(18, 2)))
INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (2, 2, 6, CAST(850000.00 AS Decimal(18, 2)), 2, CAST(1700000.00 AS Decimal(18, 2)))
INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (3, 3, 1, CAST(650000.00 AS Decimal(18, 2)), 2, CAST(1300000.00 AS Decimal(18, 2)))
INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (4, 4, 19, CAST(2200000.00 AS Decimal(18, 2)), 3, CAST(6600000.00 AS Decimal(18, 2)))
INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (5, 5, 7, CAST(850000.00 AS Decimal(18, 2)), 9, CAST(7650000.00 AS Decimal(18, 2)))
INSERT [dbo].[ChiTietDatPhong] ([MaChiTietDatPhong], [MaDatPhong], [MaPhong], [DonGia], [SoDem], [ThanhTien]) VALUES (6, 6, 11, CAST(1200000.00 AS Decimal(18, 2)), 1, CAST(1200000.00 AS Decimal(18, 2)))
SET IDENTITY_INSERT [dbo].[ChiTietDatPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[DanhGia] ON 

INSERT [dbo].[DanhGia] ([MaDanhGia], [MaKhachHang], [MaDatPhong], [MaLoaiPhong], [SoSao], [NoiDung], [NgayDanhGia], [TrangThai]) VALUES (1, 6, 3, 1, 5, N'Phòng sạch sẽ, nhân viên thân thiện, dịch vụ tốt.', CAST(N'2026-09-18T09:00:00.0000000' AS DateTime2), 1)
SET IDENTITY_INSERT [dbo].[DanhGia] OFF
GO
SET IDENTITY_INSERT [dbo].[DatCoc] ON 

INSERT [dbo].[DatCoc] ([MaDatCoc], [MaDatPhong], [SoTien], [NgayDatCoc], [PhuongThuc], [TrangThai], [MaGiaoDich], [GhiChu]) VALUES (1, 2, CAST(500000.00 AS Decimal(18, 2)), CAST(N'2026-10-18T11:00:00.0000000' AS DateTime2), N'Chuyển khoản', N'Thành công', N'DNK-MAU-COC-001', N'Tiền đặt cọc phòng 201')
INSERT [dbo].[DatCoc] ([MaDatCoc], [MaDatPhong], [SoTien], [NgayDatCoc], [PhuongThuc], [TrangThai], [MaGiaoDich], [GhiChu]) VALUES (2, 4, CAST(1980000.00 AS Decimal(18, 2)), CAST(N'2026-10-31T22:47:23.3552543' AS DateTime2), N'VNPay', N'Chờ thanh toán', N'DNK594C843FE0B242149D17AE026BA99BB1', N'Giao dịch VNPay Sandbox')
INSERT [dbo].[DatCoc] ([MaDatCoc], [MaDatPhong], [SoTien], [NgayDatCoc], [PhuongThuc], [TrangThai], [MaGiaoDich], [GhiChu]) VALUES (3, 5, CAST(2295000.00 AS Decimal(18, 2)), CAST(N'2026-10-31T22:50:14.0957099' AS DateTime2), N'VNPay', N'Chờ thanh toán', N'DNK2E4D33AF841145E59C75DDAB08471D78', N'Giao dịch VNPay Sandbox')
INSERT [dbo].[DatCoc] ([MaDatCoc], [MaDatPhong], [SoTien], [NgayDatCoc], [PhuongThuc], [TrangThai], [MaGiaoDich], [GhiChu]) VALUES (4, 6, CAST(360000.00 AS Decimal(18, 2)), CAST(N'2026-10-31T22:57:47.3050239' AS DateTime2), N'VNPay', N'Chờ thanh toán', N'DNK79AB0843D0504D5096A6D574BB14D3AB', N'Giao dịch VNPay Sandbox')
SET IDENTITY_INSERT [dbo].[DatCoc] OFF
GO
SET IDENTITY_INSERT [dbo].[DatPhong] ON 

INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (1, 4, CAST(N'2026-10-20T09:00:00.0000000' AS DateTime2), CAST(N'2026-11-05' AS Date), CAST(N'2026-11-07' AS Date), 2, 0, N'Đã xác nhận', N'Khách yêu cầu phòng yên tĩnh', NULL, CAST(N'2026-10-25T13:24:33.0105587' AS DateTime2), NULL)
INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (2, 5, CAST(N'2026-10-18T10:00:00.0000000' AS DateTime2), CAST(N'2026-11-10' AS Date), CAST(N'2026-11-12' AS Date), 2, 0, N'Đã đặt cọc', N'Khách đã chuyển tiền đặt cọc', 4, CAST(N'2026-10-18T10:30:00.0000000' AS DateTime2), NULL)
INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (3, 6, CAST(N'2026-09-01T09:00:00.0000000' AS DateTime2), CAST(N'2026-09-15' AS Date), CAST(N'2026-09-17' AS Date), 2, 0, N'Đã trả phòng', N'Khách đã hoàn thành kỳ nghỉ', 4, CAST(N'2026-09-01T09:30:00.0000000' AS DateTime2), NULL)
INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (4, 7, CAST(N'2026-10-31T22:45:29.3901335' AS DateTime2), CAST(N'2026-11-06' AS Date), CAST(N'2026-11-09' AS Date), 4, 2, N'Chờ xác nhận', N'', NULL, NULL, NULL)
INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (5, 7, CAST(N'2026-10-31T22:50:03.2198098' AS DateTime2), CAST(N'2026-11-04' AS Date), CAST(N'2026-11-13' AS Date), 2, 0, N'Chờ xác nhận', N'', NULL, NULL, NULL)
INSERT [dbo].[DatPhong] ([MaDatPhong], [MaKhachHang], [NgayDat], [NgayNhanPhong], [NgayTraPhong], [SoNguoiLon], [SoTreEm], [TrangThai], [GhiChu], [MaNhanVienXacNhan], [NgayXacNhan], [LyDoHuy]) VALUES (6, 7, CAST(N'2026-10-31T22:57:40.3255168' AS DateTime2), CAST(N'2026-11-04' AS Date), CAST(N'2026-11-05' AS Date), 2, 0, N'Chờ xác nhận', N'', NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[DatPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[DichVu] ON 

INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (1, N'Ăn sáng', N'Suất', CAST(120000.00 AS Decimal(18, 2)), N'Bữa sáng phục vụ tại nhà hàng', 1, N'/uploads/services/80d08ce022b641febd5b22c4abbb3150.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (2, N'Giặt ủi', N'Kg', CAST(50000.00 AS Decimal(18, 2)), N'Dịch vụ giặt và ủi quần áo', 1, N'/uploads/services/ff1265be52894d77a2cc240d7f37c28b.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (3, N'Đưa đón', N'Lượt', CAST(350000.00 AS Decimal(18, 2)), N'Đưa đón tại sân bay', 1, N'/uploads/services/56cb5cd2a8584a96ba490ab039c7796a.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (4, N'Trang trí phòng sinh nhật', N'Lần', CAST(250000.00 AS Decimal(18, 2)), N'Trang trí theo yêu cầu', 0, N'/uploads/services/315483d85a0849afbaf2b8fdbb28b71a.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (5, N'Thuê xe máy', N'Ngày', CAST(160000.00 AS Decimal(18, 2)), N'Cho thuê xe máy', 1, N'/uploads/services/0fc443e40ac44acd9959058d169c0773.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (6, N'Dọn phòng', N'Lần', CAST(80000.00 AS Decimal(18, 2)), N'Dọn phòng', 1, N'/uploads/services/66e94c75626b48ea9ed53fa7f2d138d5.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (7, N'Spa', N'Lần', CAST(400000.00 AS Decimal(18, 2)), N'massage, giác hơi', 0, N'/uploads/services/347601c065d24f669875956e22169f3d.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (8, N'Nước suối minibar', N'Chai', CAST(15000.00 AS Decimal(18, 2)), N'Nước suối phục vụ khách trong thời gian lưu trú.', 1, N'/uploads/services/128cd786976a4d63b05a451dc46fd920.png')
INSERT [dbo].[DichVu] ([MaDichVu], [TenDichVu], [DonViTinh], [DonGia], [MoTa], [TrangThai], [HinhAnh]) VALUES (9, N'Thuê xe ô tô riêng', N'Ngày', CAST(800000.00 AS Decimal(18, 2)), N'Dịch vụ thuê xe ô tô riêng có tài xế, phục vụ đưa đón sân bay, tham quan và di chuyển theo nhu cầu của khách hàng.', 1, N'/uploads/services/f812268ac0144410916783da59eac97c.png')
SET IDENTITY_INSERT [dbo].[DichVu] OFF
GO
SET IDENTITY_INSERT [dbo].[HinhAnhChiTietPhong] ON 

INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (1, 1, N'/uploads/rooms/329a4bcd0dcb4132a68aba6116b0120d.jpg', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (2, 1, N'/uploads/rooms/d466427499274e74b0dc0a41d4787f6f.png', NULL, 0, 1)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (3, 2, N'/uploads/rooms/0efa0b08fe944f15a7d6f944222ed3de.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (4, 3, N'/uploads/rooms/e90856a4dcca4476b964047977df0352.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (6, 5, N'/uploads/rooms/368982958e034feea2256453c6f1ba7e.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (7, 6, N'/uploads/rooms/db2c971e7e0d4bdab274b6e5765f5b7e.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (8, 7, N'/uploads/rooms/19ae66d4af7e45e98dd9bdd5fc51ce16.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (10, 9, N'/uploads/rooms/7354d8f9a5d54ec785ab75e014d0904e.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (13, 17, N'/uploads/rooms/51e7efffa14944758cae8897cd58b60c.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (14, 12, N'/uploads/rooms/08866ec288be4f1e9175bc16442d9e18.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (16, 15, N'/uploads/rooms/c635290b0ab649d589427055b7b1a899.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (17, 16, N'/uploads/rooms/5cfd22f3398546a28c1fa5b9960a7015.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (18, 11, N'/uploads/rooms/87caeaabf1dd422b88cc9a3b7cdd83d5.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (19, 10, N'/uploads/rooms/a851f923bf0e456b8b6e628045f6b4f0.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (21, 14, N'/uploads/rooms/86bd726514de4c10ad0ed34cacfb2aed.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (22, 8, N'/uploads/rooms/b5b1d516889f4548ac3fff0a3c2ed25d.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (23, 13, N'/uploads/rooms/279ab1eecdac4ff39c99ef8a4d548c83.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (24, 4, N'/uploads/rooms/fd818c174fc04b40967beefad0908673.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (25, 20, N'/uploads/rooms/2da6c89c70d64f84b13e8ae8c8d8d710.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (26, 19, N'/uploads/rooms/b4566418a3d74db0ac5b086d7e198b65.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (27, 18, N'/uploads/rooms/1fdfbc46bcab4f889b4fe9fecc58b3be.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (28, 21, N'/uploads/rooms/078aff66f1754695af3e57922d6b93f7.png', NULL, 1, 0)
INSERT [dbo].[HinhAnhChiTietPhong] ([MaHinhAnh], [MaPhong], [DuongDan], [MoTa], [AnhDaiDien], [ThuTuHienThi]) VALUES (29, 22, N'/uploads/rooms/052716e5da6e4453b11f10db89cf2fe4.png', NULL, 1, 0)
SET IDENTITY_INSERT [dbo].[HinhAnhChiTietPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[HinhAnhPhong] ON 

INSERT [dbo].[HinhAnhPhong] ([MaHinhAnh], [MaLoaiPhong], [DuongDan], [MoTa], [AnhDaiDien]) VALUES (2, 2, N'/images/rooms/phong-cao-cap.jpg', N'Hình ảnh phòng cao cấp', 1)
INSERT [dbo].[HinhAnhPhong] ([MaHinhAnh], [MaLoaiPhong], [DuongDan], [MoTa], [AnhDaiDien]) VALUES (3, 3, N'/images/rooms/phong-sang-trong.jpg', N'Hình ảnh phòng sang trọng', 1)
INSERT [dbo].[HinhAnhPhong] ([MaHinhAnh], [MaLoaiPhong], [DuongDan], [MoTa], [AnhDaiDien]) VALUES (4, 4, N'/images/rooms/phong-thuong-hang.jpg', N'Hình ảnh phòng thượng hạng', 1)
INSERT [dbo].[HinhAnhPhong] ([MaHinhAnh], [MaLoaiPhong], [DuongDan], [MoTa], [AnhDaiDien]) VALUES (5, 1, N'/uploads/room-types/7270b5d4ce4e44c7bc561f80a0802133.jpg', NULL, 1)
SET IDENTITY_INSERT [dbo].[HinhAnhPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[HoaDon] ON 

INSERT [dbo].[HoaDon] ([MaHoaDon], [MaDatPhong], [MaNhanVien], [NgayLap], [TienPhong], [TienDichVu], [TienDatCoc], [GiamGia], [TongTien], [SoTienConLai], [TrangThai], [GhiChu]) VALUES (1, 3, 4, CAST(N'2026-09-17T11:00:00.0000000' AS DateTime2), CAST(1300000.00 AS Decimal(18, 2)), CAST(290000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), CAST(1590000.00 AS Decimal(18, 2)), CAST(0.00 AS Decimal(18, 2)), N'Đã thanh toán', N'Hóa đơn mẫu đã thanh toán đủ')
SET IDENTITY_INSERT [dbo].[HoaDon] OFF
GO
SET IDENTITY_INSERT [dbo].[HoSoSoThich] ON 

INSERT [dbo].[HoSoSoThich] ([MaHoSo], [MaKhachHang], [NganSachToiThieu], [NganSachToiDa], [SoNguoiMongMuon], [MaLoaiPhongUuTien], [DienTichToiThieu], [MucDanhGiaMongMuon], [NgayCapNhat]) VALUES (1, 4, CAST(700000.00 AS Decimal(18, 2)), CAST(1500000.00 AS Decimal(18, 2)), 2, 3, CAST(28.00 AS Decimal(10, 2)), CAST(4.00 AS Decimal(3, 2)), CAST(N'2026-10-22T18:23:27.5890210' AS DateTime2))
INSERT [dbo].[HoSoSoThich] ([MaHoSo], [MaKhachHang], [NganSachToiThieu], [NganSachToiDa], [SoNguoiMongMuon], [MaLoaiPhongUuTien], [DienTichToiThieu], [MucDanhGiaMongMuon], [NgayCapNhat]) VALUES (2, 5, CAST(500000.00 AS Decimal(18, 2)), CAST(1000000.00 AS Decimal(18, 2)), 2, 2, CAST(25.00 AS Decimal(10, 2)), CAST(4.00 AS Decimal(3, 2)), CAST(N'2026-10-22T18:23:27.5890210' AS DateTime2))
INSERT [dbo].[HoSoSoThich] ([MaHoSo], [MaKhachHang], [NganSachToiThieu], [NganSachToiDa], [SoNguoiMongMuon], [MaLoaiPhongUuTien], [DienTichToiThieu], [MucDanhGiaMongMuon], [NgayCapNhat]) VALUES (3, 6, CAST(1500000.00 AS Decimal(18, 2)), CAST(3000000.00 AS Decimal(18, 2)), 4, 4, CAST(40.00 AS Decimal(10, 2)), CAST(4.50 AS Decimal(3, 2)), CAST(N'2026-10-22T18:23:27.5890210' AS DateTime2))
SET IDENTITY_INSERT [dbo].[HoSoSoThich] OFF
GO
SET IDENTITY_INSERT [dbo].[KetQuaGoiY] ON 

INSERT [dbo].[KetQuaGoiY] ([MaKetQua], [MaLanGoiY], [MaLoaiPhong], [DiemContentBased], [DiemWeightedScoring], [DiemPhuHop], [ThuHang]) VALUES (1, 1, 3, CAST(0.920000 AS Decimal(10, 6)), CAST(0.900000 AS Decimal(10, 6)), CAST(0.910000 AS Decimal(10, 6)), 1)
INSERT [dbo].[KetQuaGoiY] ([MaKetQua], [MaLanGoiY], [MaLoaiPhong], [DiemContentBased], [DiemWeightedScoring], [DiemPhuHop], [ThuHang]) VALUES (2, 1, 2, CAST(0.850000 AS Decimal(10, 6)), CAST(0.830000 AS Decimal(10, 6)), CAST(0.840000 AS Decimal(10, 6)), 2)
INSERT [dbo].[KetQuaGoiY] ([MaKetQua], [MaLanGoiY], [MaLoaiPhong], [DiemContentBased], [DiemWeightedScoring], [DiemPhuHop], [ThuHang]) VALUES (3, 1, 1, CAST(0.750000 AS Decimal(10, 6)), CAST(0.700000 AS Decimal(10, 6)), CAST(0.725000 AS Decimal(10, 6)), 3)
SET IDENTITY_INSERT [dbo].[KetQuaGoiY] OFF
GO
SET IDENTITY_INSERT [dbo].[KhachHang] ON 

INSERT [dbo].[KhachHang] ([MaKhachHang], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [CCCD], [NgaySinh], [GioiTinh], [DiaChi], [NgayTao]) VALUES (4, 6, N'Lê Ngọc Mai', N'0911000001', N'mai@dnk.example', NULL, CAST(N'2002-04-12' AS Date), N'Nữ', N'Thành phố Hồ Chí Minh', CAST(N'2026-10-22T18:23:27.5643740' AS DateTime2))
INSERT [dbo].[KhachHang] ([MaKhachHang], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [CCCD], [NgaySinh], [GioiTinh], [DiaChi], [NgayTao]) VALUES (5, NULL, N'Phạm Quốc Bảo', N'0911000002', N'bao@dnk.example', NULL, CAST(N'1998-08-20' AS Date), N'Nam', N'Đà Nẵng', CAST(N'2026-10-22T18:23:27.5643740' AS DateTime2))
INSERT [dbo].[KhachHang] ([MaKhachHang], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [CCCD], [NgaySinh], [GioiTinh], [DiaChi], [NgayTao]) VALUES (6, NULL, N'Nguyễn Thảo Vy', N'0911000003', N'vy@dnk.example', NULL, CAST(N'2000-11-05' AS Date), N'Nữ', N'Cần Thơ', CAST(N'2026-10-22T18:23:27.5643740' AS DateTime2))
INSERT [dbo].[KhachHang] ([MaKhachHang], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [CCCD], [NgaySinh], [GioiTinh], [DiaChi], [NgayTao]) VALUES (7, 7, N'Trần Quỳnh', N'03639869699', N'ricon2707@gmail.com', NULL, NULL, NULL, NULL, CAST(N'2026-10-31T22:44:25.8301464' AS DateTime2))
SET IDENTITY_INSERT [dbo].[KhachHang] OFF
GO
SET IDENTITY_INSERT [dbo].[LanGoiY] ON 

INSERT [dbo].[LanGoiY] ([MaLanGoiY], [MaKhachHang], [NgayNhanPhong], [NgayTraPhong], [SoNguoi], [ThoiGianGoiY]) VALUES (1, 4, CAST(N'2026-11-05' AS Date), CAST(N'2026-11-07' AS Date), 2, CAST(N'2026-10-19T08:50:00.0000000' AS DateTime2))
SET IDENTITY_INSERT [dbo].[LanGoiY] OFF
GO
SET IDENTITY_INSERT [dbo].[LichSuTuongTac] ON 

INSERT [dbo].[LichSuTuongTac] ([MaTuongTac], [MaKhachHang], [MaLoaiPhong], [LoaiTuongTac], [ThoiGian], [MucDoQuanTam]) VALUES (1, 4, 3, N'Xem phòng', CAST(N'2026-10-19T09:00:00.0000000' AS DateTime2), CAST(3.00 AS Decimal(5, 2)))
INSERT [dbo].[LichSuTuongTac] ([MaTuongTac], [MaKhachHang], [MaLoaiPhong], [LoaiTuongTac], [ThoiGian], [MucDoQuanTam]) VALUES (2, 4, 3, N'Chọn phòng', CAST(N'2026-10-19T09:10:00.0000000' AS DateTime2), CAST(4.00 AS Decimal(5, 2)))
INSERT [dbo].[LichSuTuongTac] ([MaTuongTac], [MaKhachHang], [MaLoaiPhong], [LoaiTuongTac], [ThoiGian], [MucDoQuanTam]) VALUES (3, 5, 2, N'Đặt phòng', CAST(N'2026-10-18T10:00:00.0000000' AS DateTime2), CAST(5.00 AS Decimal(5, 2)))
INSERT [dbo].[LichSuTuongTac] ([MaTuongTac], [MaKhachHang], [MaLoaiPhong], [LoaiTuongTac], [ThoiGian], [MucDoQuanTam]) VALUES (4, 6, 1, N'Đánh giá', CAST(N'2026-09-18T09:00:00.0000000' AS DateTime2), CAST(5.00 AS Decimal(5, 2)))
SET IDENTITY_INSERT [dbo].[LichSuTuongTac] OFF
GO
SET IDENTITY_INSERT [dbo].[LienHe] ON 

INSERT [dbo].[LienHe] ([MaLienHe], [MaKhachHang], [HoTen], [Email], [SoDienThoai], [ChuDe], [NoiDung], [NgayGui], [TrangThai], [NoiDungPhanHoi], [MaNhanVienPhanHoi], [NgayPhanHoi]) VALUES (1, NULL, N'dede', N'dede@gmail.com', NULL, N'tư vấn chọn phòng', N'tư vấn chọn phòng cho gia đình gồm 5 thành viên 2 người lớn và 3 trẻ nhỏ', CAST(N'2026-10-31T18:32:40.9712396' AS DateTime2), N'Đang xử lý', NULL, NULL, NULL)
SET IDENTITY_INSERT [dbo].[LienHe] OFF
GO
SET IDENTITY_INSERT [dbo].[LoaiPhong] ON 

INSERT [dbo].[LoaiPhong] ([MaLoaiPhong], [TenLoaiPhong], [MoTa], [SucChuaNguoiLon], [SucChuaTreEm], [DienTich], [SoGiuong], [LoaiGiuong], [GiaCoBan], [TrangThai]) VALUES (1, N'Phòng Tiêu Chuẩn', N'Phòng nghỉ tiện nghi cơ bản, thiết kế ấm cúng, phù hợp cho khách cá nhân hoặc cặp đôi.', 2, 1, CAST(28.00 AS Decimal(10, 2)), 1, N'1 giường đôi', CAST(650000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[LoaiPhong] ([MaLoaiPhong], [TenLoaiPhong], [MoTa], [SucChuaNguoiLon], [SucChuaTreEm], [DienTich], [SoGiuong], [LoaiGiuong], [GiaCoBan], [TrangThai]) VALUES (2, N'Phòng Cao Cấp', N'Phòng nghỉ rộng rãi với nội thất cao cấp, giường King, bàn làm việc và minibar.', 2, 1, CAST(35.00 AS Decimal(10, 2)), 1, N'1 giường King', CAST(850000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[LoaiPhong] ([MaLoaiPhong], [TenLoaiPhong], [MoTa], [SucChuaNguoiLon], [SucChuaTreEm], [DienTich], [SoGiuong], [LoaiGiuong], [GiaCoBan], [TrangThai]) VALUES (3, N'Phòng Gia Đình', N'Phòng rộng rãi dành cho gia đình, bố trí một giường đôi và một giường đơn.', 4, 2, CAST(40.00 AS Decimal(10, 2)), 2, N'1 giường đôi và 1 giường đơn', CAST(1200000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[LoaiPhong] ([MaLoaiPhong], [TenLoaiPhong], [MoTa], [SucChuaNguoiLon], [SucChuaTreEm], [DienTich], [SoGiuong], [LoaiGiuong], [GiaCoBan], [TrangThai]) VALUES (4, N'Phòng Suite', N'Phòng cao cấp có phòng ngủ riêng, phòng khách, sofa thư giãn và phòng tắm sang trọng.', 2, 2, CAST(65.00 AS Decimal(10, 2)), 2, N'1 giường King và 1 sofa giường', CAST(2200000.00 AS Decimal(18, 2)), 1)
INSERT [dbo].[LoaiPhong] ([MaLoaiPhong], [TenLoaiPhong], [MoTa], [SucChuaNguoiLon], [SucChuaTreEm], [DienTich], [SoGiuong], [LoaiGiuong], [GiaCoBan], [TrangThai]) VALUES (8, N'Phòng Tổng Thống', N'Phòng Tổng Thống rộng 110 m², có phòng ngủ riêng, phòng khách, phòng thay đồ, phòng tắm cao cấp và khu vực tiếp khách riêng.', 4, 2, CAST(110.00 AS Decimal(10, 2)), 2, N'1 giường King và 1 giường đôi', CAST(3500000.00 AS Decimal(18, 2)), 1)
SET IDENTITY_INSERT [dbo].[LoaiPhong] OFF
GO
SET IDENTITY_INSERT [dbo].[NhanVien] ON 

INSERT [dbo].[NhanVien] ([MaNhanVien], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [DiaChi], [ChucVu], [NgayVaoLam], [TrangThai]) VALUES (3, 4, N'Nguyễn Quốc Huy', N'0900000001', N'quantri@dnk.example', N'Thành phố Hồ Chí Minh', N'Quản lý khách sạn', CAST(N'2025-01-10' AS Date), 1)
INSERT [dbo].[NhanVien] ([MaNhanVien], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [DiaChi], [ChucVu], [NgayVaoLam], [TrangThai]) VALUES (4, 5, N'Trần Minh Anh', N'0900000002', N'nhanvien@dnk.example', N'Thành phố Hồ Chí Minh', N'Nhân viên lễ tân', CAST(N'2025-06-01' AS Date), 1)
INSERT [dbo].[NhanVien] ([MaNhanVien], [MaTaiKhoan], [HoTen], [SoDienThoai], [Email], [DiaChi], [ChucVu], [NgayVaoLam], [TrangThai]) VALUES (5, 8, N'Nguyễn Thị Ngọc Lan', N'0912345678', N'nhanvien2@dnk.example', NULL, N'Nhân viên lễ tân', NULL, 0)
SET IDENTITY_INSERT [dbo].[NhanVien] OFF
GO
SET IDENTITY_INSERT [dbo].[Phong] ON 

INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (1, N'201', 1, 2, N'Bảo trì', N'Phòng Tiêu Chuẩn tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (2, N'202', 1, 2, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (3, N'203', 1, 2, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (4, N'204', 1, 2, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (5, N'205', 1, 2, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (6, N'206', 2, 2, N'Trống', N'Phòng Cao Cấp tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (7, N'207', 2, 2, N'Trống', N'Phòng Cao Cấp tại tầng 2')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (8, N'301', 1, 3, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 3')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (9, N'302', 1, 3, N'Trống', N'Phòng Tiêu Chuẩn tại tầng 3')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (10, N'303', 2, 3, N'Trống', N'Phòng Cao Cấp tại tầng 3')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (11, N'304', 2, 3, N'Trống', N'Phòng Cao Cấp tại tầng 3')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (12, N'305', 2, 3, N'Trống', N'Phòng Cao Cấp tại tầng 3')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (13, N'401', 2, 4, N'Trống', N'Phòng Cao Cấp tại tầng 4')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (14, N'402', 2, 4, N'Trống', N'Phòng Cao Cấp tại tầng 4')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (15, N'403', 3, 4, N'Trống', N'Phòng Gia Đình tại tầng 4')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (16, N'404', 3, 4, N'Trống', N'Phòng Gia Đình tại tầng 4')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (17, N'405', 4, 4, N'Trống', N'Phòng Suite tại tầng 4')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (18, N'501', 3, 5, N'Trống', N'Phòng Gia Đình tại tầng 5')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (19, N'502', 4, 5, N'Trống', N'Phòng Suite tại tầng 5')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (20, N'503', 4, 5, N'Trống', N'Phòng Suite tại tầng 5')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (21, N'601', 8, 6, N'Trống', N'Phòng Tổng Thống tại tầng 6')
INSERT [dbo].[Phong] ([MaPhong], [SoPhong], [MaLoaiPhong], [Tang], [TrangThai], [MoTa]) VALUES (22, N'602', 8, 6, N'Trống', N'Phòng Tổng Thống tại tầng 6')
SET IDENTITY_INSERT [dbo].[Phong] OFF
GO
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (1, 1)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (1, 2)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (1, 3)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (2, 1)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (2, 2)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (2, 3)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (2, 4)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (2, 8)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 1)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 2)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 3)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 4)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 6)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 7)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (3, 8)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 1)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 2)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 3)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 4)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 5)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 6)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 7)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 8)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (4, 10)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 1)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 2)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 3)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 4)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 5)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 6)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 7)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 8)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 9)
INSERT [dbo].[PhongTienNghi] ([MaLoaiPhong], [MaTienNghi]) VALUES (8, 10)
GO
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (1, 1, 5)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (1, 4, 4)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (1, 6, 4)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (2, 1, 4)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (2, 2, 4)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (3, 5, 5)
INSERT [dbo].[SoThichTienNghi] ([MaHoSo], [MaTienNghi], [MucDoUuTien]) VALUES (3, 6, 5)
GO
SET IDENTITY_INSERT [dbo].[SuDungDichVu] ON 

INSERT [dbo].[SuDungDichVu] ([MaSuDungDichVu], [MaDatPhong], [MaPhong], [MaDichVu], [SoLuong], [DonGia], [ThanhTien], [ThoiGianSuDung]) VALUES (1, 3, 1, 1, 2, CAST(120000.00 AS Decimal(18, 2)), CAST(240000.00 AS Decimal(18, 2)), CAST(N'2026-09-16T07:30:00.0000000' AS DateTime2))
INSERT [dbo].[SuDungDichVu] ([MaSuDungDichVu], [MaDatPhong], [MaPhong], [MaDichVu], [SoLuong], [DonGia], [ThanhTien], [ThoiGianSuDung]) VALUES (2, 3, 1, 2, 1, CAST(50000.00 AS Decimal(18, 2)), CAST(50000.00 AS Decimal(18, 2)), CAST(N'2026-09-16T15:00:00.0000000' AS DateTime2))
SET IDENTITY_INSERT [dbo].[SuDungDichVu] OFF
GO
SET IDENTITY_INSERT [dbo].[TaiKhoan] ON 

INSERT [dbo].[TaiKhoan] ([MaTaiKhoan], [TenDangNhap], [MatKhau], [Email], [MaVaiTro], [TrangThai], [NgayTao]) VALUES (4, N'admin_dnk', N'AQAAAAIAAYagAAAAELi2LgItzl7NFWXHVW5MREYS26lxHal8eFlIWK5EdupNLbzpbF7vnwglNOlGa9yrKw==', N'quantri@dnk.example', 1, 1, CAST(N'2026-10-22T18:23:27.5633354' AS DateTime2))
INSERT [dbo].[TaiKhoan] ([MaTaiKhoan], [TenDangNhap], [MatKhau], [Email], [MaVaiTro], [TrangThai], [NgayTao]) VALUES (5, N'nhanvien_dnk', N'AQAAAAIAAYagAAAAEJmR6i6te+Jz/0ngJW0U6o2VDjqBYk9oOWKUqObDUrjNwTuN25KVsFYUW7BsgyRhVg==', N'nhanvien@dnk.example', 2, 1, CAST(N'2026-10-22T18:23:27.5633354' AS DateTime2))
INSERT [dbo].[TaiKhoan] ([MaTaiKhoan], [TenDangNhap], [MatKhau], [Email], [MaVaiTro], [TrangThai], [NgayTao]) VALUES (6, N'khach_dnk', N'AQAAAAIAAYagAAAAEIQCeNEX9RRBPUw5bxNuRvVtZlRjWN3W0fJq3M7aT/r0RyiB/lJEkzgXZcoWs3wcfg==', N'khach@dnk.example', 3, 1, CAST(N'2026-10-22T18:23:27.5633354' AS DateTime2))
INSERT [dbo].[TaiKhoan] ([MaTaiKhoan], [TenDangNhap], [MatKhau], [Email], [MaVaiTro], [TrangThai], [NgayTao]) VALUES (7, N'quynhquynh', N'AQAAAAIAAYagAAAAEHhcoiYEhRsnE/ASq7OFlja1uO4CR2Ch0ZPkXbwMVTen7lYMF1zAlaeFQhhNbnYDUA==', N'ricon2707@gmail.com', 3, 1, CAST(N'2026-10-31T22:44:25.6918510' AS DateTime2))
INSERT [dbo].[TaiKhoan] ([MaTaiKhoan], [TenDangNhap], [MatKhau], [Email], [MaVaiTro], [TrangThai], [NgayTao]) VALUES (8, N'nhanvien2_dnk', N'AQAAAAIAAYagAAAAEA3qdA3N9g3TRcirM8VKI4oK6mBCg/fut34AuIbJ/HQCkVOd4sJSgiot2/TwRl6oig==', N'nhanvien2@dnk.example', 2, 0, CAST(N'2026-11-01T18:54:42.8842357' AS DateTime2))
SET IDENTITY_INSERT [dbo].[TaiKhoan] OFF
GO
SET IDENTITY_INSERT [dbo].[ThanhToan] ON 

INSERT [dbo].[ThanhToan] ([MaThanhToan], [MaHoaDon], [SoTien], [PhuongThuc], [NgayThanhToan], [MaGiaoDich], [TrangThai]) VALUES (1, 1, CAST(1590000.00 AS Decimal(18, 2)), N'Chuyển khoản', CAST(N'2026-09-17T11:10:00.0000000' AS DateTime2), N'DNK-MAU-TT-001', N'Thành công')
SET IDENTITY_INSERT [dbo].[ThanhToan] OFF
GO
SET IDENTITY_INSERT [dbo].[TienNghi] ON 

INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (1, N'Wi-Fi', N'Mạng không dây miễn phí', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (2, N'Máy lạnh', N'Hệ thống điều hòa nhiệt độ', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (3, N'Tivi', N'Tivi màn hình phẳng', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (4, N'Tủ lạnh', N'Tủ lạnh mini trong phòng', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (5, N'Bồn tắm', N'Bồn tắm thư giãn', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (6, N'Ban công', N'Ban công riêng', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (7, N'Bữa sáng', N'Dịch vụ bữa sáng', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (8, N'Két an toàn', N'Két giữ tài sản cá nhân', 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (9, N'Máy chiếu phim', NULL, 1)
INSERT [dbo].[TienNghi] ([MaTienNghi], [TenTienNghi], [MoTa], [TrangThai]) VALUES (10, N'Dịch vụ dọn phòng hằng ngày', NULL, 1)
SET IDENTITY_INSERT [dbo].[TienNghi] OFF
GO
SET IDENTITY_INSERT [dbo].[TieuChiGoiY] ON 

INSERT [dbo].[TieuChiGoiY] ([MaTieuChi], [TenTieuChi], [TrongSo], [MoTa], [TrangThai]) VALUES (1, N'Ngân sách', CAST(0.3500 AS Decimal(5, 4)), N'Mức độ phù hợp với ngân sách', 1)
INSERT [dbo].[TieuChiGoiY] ([MaTieuChi], [TenTieuChi], [TrongSo], [MoTa], [TrangThai]) VALUES (2, N'Sức chứa', CAST(0.2500 AS Decimal(5, 4)), N'Mức độ phù hợp với số người', 1)
INSERT [dbo].[TieuChiGoiY] ([MaTieuChi], [TenTieuChi], [TrongSo], [MoTa], [TrangThai]) VALUES (3, N'Tiện nghi', CAST(0.2000 AS Decimal(5, 4)), N'Mức độ phù hợp với tiện nghi ưu tiên', 1)
INSERT [dbo].[TieuChiGoiY] ([MaTieuChi], [TenTieuChi], [TrongSo], [MoTa], [TrangThai]) VALUES (4, N'Diện tích', CAST(0.1000 AS Decimal(5, 4)), N'Mức độ phù hợp với diện tích mong muốn', 1)
INSERT [dbo].[TieuChiGoiY] ([MaTieuChi], [TenTieuChi], [TrongSo], [MoTa], [TrangThai]) VALUES (5, N'Đánh giá', CAST(0.1000 AS Decimal(5, 4)), N'Mức độ phù hợp với đánh giá', 1)
SET IDENTITY_INSERT [dbo].[TieuChiGoiY] OFF
GO
SET IDENTITY_INSERT [dbo].[VaiTro] ON 

INSERT [dbo].[VaiTro] ([MaVaiTro], [TenVaiTro], [MoTa]) VALUES (1, N'Admin', N'Quản trị toàn bộ hệ thống')
INSERT [dbo].[VaiTro] ([MaVaiTro], [TenVaiTro], [MoTa]) VALUES (2, N'NhanVien', N'Nhân viên quản lý đặt phòng')
INSERT [dbo].[VaiTro] ([MaVaiTro], [TenVaiTro], [MoTa]) VALUES (3, N'KhachHang', N'Khách hàng đặt phòng trực tuyến')
SET IDENTITY_INSERT [dbo].[VaiTro] OFF
GO
/****** Object:  Index [UQ__HoaDon__6344ADEB7192B696]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[HoaDon] ADD UNIQUE NONCLUSTERED 
(
	[MaDatPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ__HoSoSoTh__88D2F0E4A2EF593D]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[HoSoSoThich] ADD UNIQUE NONCLUSTERED 
(
	[MaKhachHang] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UQ__NhanVien__AD7C65288C92EA46]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[NhanVien] ADD UNIQUE NONCLUSTERED 
(
	[MaTaiKhoan] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__Phong__7C736CA1EB7FE40E]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[Phong] ADD UNIQUE NONCLUSTERED 
(
	[SoPhong] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__TaiKhoan__55F68FC076579C44]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[TaiKhoan] ADD UNIQUE NONCLUSTERED 
(
	[TenDangNhap] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__TienNghi__6CE380096A090B32]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[TienNghi] ADD UNIQUE NONCLUSTERED 
(
	[TenTienNghi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__TieuChiG__D7AD86BA1A1EC0DF]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[TieuChiGoiY] ADD UNIQUE NONCLUSTERED 
(
	[TenTieuChi] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UQ__VaiTro__1DA55814F6644640]    Script Date: 11/1/2026 9:55:43 PM ******/
ALTER TABLE [dbo].[VaiTro] ADD UNIQUE NONCLUSTERED 
(
	[TenVaiTro] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[DanhGia] ADD  DEFAULT (sysdatetime()) FOR [NgayDanhGia]
GO
ALTER TABLE [dbo].[DanhGia] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[DatCoc] ADD  DEFAULT (sysdatetime()) FOR [NgayDatCoc]
GO
ALTER TABLE [dbo].[DatCoc] ADD  DEFAULT (N'Đã thanh toán') FOR [TrangThai]
GO
ALTER TABLE [dbo].[DatPhong] ADD  DEFAULT (sysdatetime()) FOR [NgayDat]
GO
ALTER TABLE [dbo].[DatPhong] ADD  DEFAULT ((1)) FOR [SoNguoiLon]
GO
ALTER TABLE [dbo].[DatPhong] ADD  DEFAULT ((0)) FOR [SoTreEm]
GO
ALTER TABLE [dbo].[DatPhong] ADD  DEFAULT (N'Chờ xác nhận') FOR [TrangThai]
GO
ALTER TABLE [dbo].[DichVu] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[HinhAnhChiTietPhong] ADD  DEFAULT ((0)) FOR [AnhDaiDien]
GO
ALTER TABLE [dbo].[HinhAnhChiTietPhong] ADD  DEFAULT ((0)) FOR [ThuTuHienThi]
GO
ALTER TABLE [dbo].[HinhAnhPhong] ADD  DEFAULT ((0)) FOR [AnhDaiDien]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT (sysdatetime()) FOR [NgayLap]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [TienPhong]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [TienDichVu]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [TienDatCoc]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [GiamGia]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [TongTien]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT ((0)) FOR [SoTienConLai]
GO
ALTER TABLE [dbo].[HoaDon] ADD  DEFAULT (N'Chưa thanh toán') FOR [TrangThai]
GO
ALTER TABLE [dbo].[HoSoSoThich] ADD  DEFAULT (sysdatetime()) FOR [NgayCapNhat]
GO
ALTER TABLE [dbo].[KetQuaGoiY] ADD  DEFAULT ((0)) FOR [DiemContentBased]
GO
ALTER TABLE [dbo].[KetQuaGoiY] ADD  DEFAULT ((0)) FOR [DiemWeightedScoring]
GO
ALTER TABLE [dbo].[KetQuaGoiY] ADD  DEFAULT ((0)) FOR [DiemPhuHop]
GO
ALTER TABLE [dbo].[KhachHang] ADD  DEFAULT (sysdatetime()) FOR [NgayTao]
GO
ALTER TABLE [dbo].[LanGoiY] ADD  DEFAULT (sysdatetime()) FOR [ThoiGianGoiY]
GO
ALTER TABLE [dbo].[LichSuTuongTac] ADD  DEFAULT (sysdatetime()) FOR [ThoiGian]
GO
ALTER TABLE [dbo].[LichSuTuongTac] ADD  DEFAULT ((1)) FOR [MucDoQuanTam]
GO
ALTER TABLE [dbo].[LienHe] ADD  CONSTRAINT [DF_LienHe_NgayGui]  DEFAULT (sysdatetime()) FOR [NgayGui]
GO
ALTER TABLE [dbo].[LienHe] ADD  CONSTRAINT [DF_LienHe_TrangThai]  DEFAULT (N'Chờ xử lý') FOR [TrangThai]
GO
ALTER TABLE [dbo].[LoaiPhong] ADD  DEFAULT ((0)) FOR [SucChuaTreEm]
GO
ALTER TABLE [dbo].[LoaiPhong] ADD  DEFAULT ((1)) FOR [SoGiuong]
GO
ALTER TABLE [dbo].[LoaiPhong] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[NhanVien] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[Phong] ADD  DEFAULT (N'Trống') FOR [TrangThai]
GO
ALTER TABLE [dbo].[SoThichTienNghi] ADD  DEFAULT ((1)) FOR [MucDoUuTien]
GO
ALTER TABLE [dbo].[SuDungDichVu] ADD  DEFAULT ((1)) FOR [SoLuong]
GO
ALTER TABLE [dbo].[SuDungDichVu] ADD  DEFAULT (sysdatetime()) FOR [ThoiGianSuDung]
GO
ALTER TABLE [dbo].[TaiKhoan] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[TaiKhoan] ADD  DEFAULT (sysdatetime()) FOR [NgayTao]
GO
ALTER TABLE [dbo].[ThanhToan] ADD  DEFAULT (sysdatetime()) FOR [NgayThanhToan]
GO
ALTER TABLE [dbo].[ThanhToan] ADD  DEFAULT (N'Thành công') FOR [TrangThai]
GO
ALTER TABLE [dbo].[TienNghi] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[TieuChiGoiY] ADD  DEFAULT ((1)) FOR [TrangThai]
GO
ALTER TABLE [dbo].[BangGiaPhong]  WITH CHECK ADD  CONSTRAINT [FK_BangGiaPhong_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[BangGiaPhong] CHECK CONSTRAINT [FK_BangGiaPhong_LoaiPhong]
GO
ALTER TABLE [dbo].[ChiTietDatPhong]  WITH CHECK ADD  CONSTRAINT [FK_ChiTietDatPhong_DatPhong] FOREIGN KEY([MaDatPhong])
REFERENCES [dbo].[DatPhong] ([MaDatPhong])
GO
ALTER TABLE [dbo].[ChiTietDatPhong] CHECK CONSTRAINT [FK_ChiTietDatPhong_DatPhong]
GO
ALTER TABLE [dbo].[ChiTietDatPhong]  WITH CHECK ADD  CONSTRAINT [FK_ChiTietDatPhong_Phong] FOREIGN KEY([MaPhong])
REFERENCES [dbo].[Phong] ([MaPhong])
GO
ALTER TABLE [dbo].[ChiTietDatPhong] CHECK CONSTRAINT [FK_ChiTietDatPhong_Phong]
GO
ALTER TABLE [dbo].[DanhGia]  WITH CHECK ADD  CONSTRAINT [FK_DanhGia_DatPhong] FOREIGN KEY([MaDatPhong])
REFERENCES [dbo].[DatPhong] ([MaDatPhong])
GO
ALTER TABLE [dbo].[DanhGia] CHECK CONSTRAINT [FK_DanhGia_DatPhong]
GO
ALTER TABLE [dbo].[DanhGia]  WITH CHECK ADD  CONSTRAINT [FK_DanhGia_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[DanhGia] CHECK CONSTRAINT [FK_DanhGia_KhachHang]
GO
ALTER TABLE [dbo].[DanhGia]  WITH CHECK ADD  CONSTRAINT [FK_DanhGia_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[DanhGia] CHECK CONSTRAINT [FK_DanhGia_LoaiPhong]
GO
ALTER TABLE [dbo].[DatCoc]  WITH CHECK ADD  CONSTRAINT [FK_DatCoc_DatPhong] FOREIGN KEY([MaDatPhong])
REFERENCES [dbo].[DatPhong] ([MaDatPhong])
GO
ALTER TABLE [dbo].[DatCoc] CHECK CONSTRAINT [FK_DatCoc_DatPhong]
GO
ALTER TABLE [dbo].[DatPhong]  WITH CHECK ADD  CONSTRAINT [FK_DatPhong_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[DatPhong] CHECK CONSTRAINT [FK_DatPhong_KhachHang]
GO
ALTER TABLE [dbo].[DatPhong]  WITH CHECK ADD  CONSTRAINT [FK_DatPhong_NhanVien] FOREIGN KEY([MaNhanVienXacNhan])
REFERENCES [dbo].[NhanVien] ([MaNhanVien])
GO
ALTER TABLE [dbo].[DatPhong] CHECK CONSTRAINT [FK_DatPhong_NhanVien]
GO
ALTER TABLE [dbo].[HinhAnhChiTietPhong]  WITH CHECK ADD  CONSTRAINT [FK_HinhAnhChiTietPhong_Phong] FOREIGN KEY([MaPhong])
REFERENCES [dbo].[Phong] ([MaPhong])
GO
ALTER TABLE [dbo].[HinhAnhChiTietPhong] CHECK CONSTRAINT [FK_HinhAnhChiTietPhong_Phong]
GO
ALTER TABLE [dbo].[HinhAnhPhong]  WITH CHECK ADD  CONSTRAINT [FK_HinhAnhPhong_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[HinhAnhPhong] CHECK CONSTRAINT [FK_HinhAnhPhong_LoaiPhong]
GO
ALTER TABLE [dbo].[HoaDon]  WITH CHECK ADD  CONSTRAINT [FK_HoaDon_DatPhong] FOREIGN KEY([MaDatPhong])
REFERENCES [dbo].[DatPhong] ([MaDatPhong])
GO
ALTER TABLE [dbo].[HoaDon] CHECK CONSTRAINT [FK_HoaDon_DatPhong]
GO
ALTER TABLE [dbo].[HoaDon]  WITH CHECK ADD  CONSTRAINT [FK_HoaDon_NhanVien] FOREIGN KEY([MaNhanVien])
REFERENCES [dbo].[NhanVien] ([MaNhanVien])
GO
ALTER TABLE [dbo].[HoaDon] CHECK CONSTRAINT [FK_HoaDon_NhanVien]
GO
ALTER TABLE [dbo].[HoSoSoThich]  WITH CHECK ADD  CONSTRAINT [FK_HoSoSoThich_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[HoSoSoThich] CHECK CONSTRAINT [FK_HoSoSoThich_KhachHang]
GO
ALTER TABLE [dbo].[HoSoSoThich]  WITH CHECK ADD  CONSTRAINT [FK_HoSoSoThich_LoaiPhong] FOREIGN KEY([MaLoaiPhongUuTien])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[HoSoSoThich] CHECK CONSTRAINT [FK_HoSoSoThich_LoaiPhong]
GO
ALTER TABLE [dbo].[KetQuaGoiY]  WITH CHECK ADD  CONSTRAINT [FK_KetQuaGoiY_LanGoiY] FOREIGN KEY([MaLanGoiY])
REFERENCES [dbo].[LanGoiY] ([MaLanGoiY])
GO
ALTER TABLE [dbo].[KetQuaGoiY] CHECK CONSTRAINT [FK_KetQuaGoiY_LanGoiY]
GO
ALTER TABLE [dbo].[KetQuaGoiY]  WITH CHECK ADD  CONSTRAINT [FK_KetQuaGoiY_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[KetQuaGoiY] CHECK CONSTRAINT [FK_KetQuaGoiY_LoaiPhong]
GO
ALTER TABLE [dbo].[KhachHang]  WITH CHECK ADD  CONSTRAINT [FK_KhachHang_TaiKhoan] FOREIGN KEY([MaTaiKhoan])
REFERENCES [dbo].[TaiKhoan] ([MaTaiKhoan])
GO
ALTER TABLE [dbo].[KhachHang] CHECK CONSTRAINT [FK_KhachHang_TaiKhoan]
GO
ALTER TABLE [dbo].[LanGoiY]  WITH CHECK ADD  CONSTRAINT [FK_LanGoiY_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[LanGoiY] CHECK CONSTRAINT [FK_LanGoiY_KhachHang]
GO
ALTER TABLE [dbo].[LichSuTuongTac]  WITH CHECK ADD  CONSTRAINT [FK_LichSuTuongTac_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[LichSuTuongTac] CHECK CONSTRAINT [FK_LichSuTuongTac_KhachHang]
GO
ALTER TABLE [dbo].[LichSuTuongTac]  WITH CHECK ADD  CONSTRAINT [FK_LichSuTuongTac_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[LichSuTuongTac] CHECK CONSTRAINT [FK_LichSuTuongTac_LoaiPhong]
GO
ALTER TABLE [dbo].[LienHe]  WITH CHECK ADD  CONSTRAINT [FK_LienHe_KhachHang] FOREIGN KEY([MaKhachHang])
REFERENCES [dbo].[KhachHang] ([MaKhachHang])
GO
ALTER TABLE [dbo].[LienHe] CHECK CONSTRAINT [FK_LienHe_KhachHang]
GO
ALTER TABLE [dbo].[LienHe]  WITH CHECK ADD  CONSTRAINT [FK_LienHe_NhanVien] FOREIGN KEY([MaNhanVienPhanHoi])
REFERENCES [dbo].[NhanVien] ([MaNhanVien])
GO
ALTER TABLE [dbo].[LienHe] CHECK CONSTRAINT [FK_LienHe_NhanVien]
GO
ALTER TABLE [dbo].[NhanVien]  WITH CHECK ADD  CONSTRAINT [FK_NhanVien_TaiKhoan] FOREIGN KEY([MaTaiKhoan])
REFERENCES [dbo].[TaiKhoan] ([MaTaiKhoan])
GO
ALTER TABLE [dbo].[NhanVien] CHECK CONSTRAINT [FK_NhanVien_TaiKhoan]
GO
ALTER TABLE [dbo].[Phong]  WITH CHECK ADD  CONSTRAINT [FK_Phong_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[Phong] CHECK CONSTRAINT [FK_Phong_LoaiPhong]
GO
ALTER TABLE [dbo].[PhongTienNghi]  WITH CHECK ADD  CONSTRAINT [FK_PhongTienNghi_LoaiPhong] FOREIGN KEY([MaLoaiPhong])
REFERENCES [dbo].[LoaiPhong] ([MaLoaiPhong])
GO
ALTER TABLE [dbo].[PhongTienNghi] CHECK CONSTRAINT [FK_PhongTienNghi_LoaiPhong]
GO
ALTER TABLE [dbo].[PhongTienNghi]  WITH CHECK ADD  CONSTRAINT [FK_PhongTienNghi_TienNghi] FOREIGN KEY([MaTienNghi])
REFERENCES [dbo].[TienNghi] ([MaTienNghi])
GO
ALTER TABLE [dbo].[PhongTienNghi] CHECK CONSTRAINT [FK_PhongTienNghi_TienNghi]
GO
ALTER TABLE [dbo].[SoThichTienNghi]  WITH CHECK ADD  CONSTRAINT [FK_SoThichTienNghi_HoSo] FOREIGN KEY([MaHoSo])
REFERENCES [dbo].[HoSoSoThich] ([MaHoSo])
GO
ALTER TABLE [dbo].[SoThichTienNghi] CHECK CONSTRAINT [FK_SoThichTienNghi_HoSo]
GO
ALTER TABLE [dbo].[SoThichTienNghi]  WITH CHECK ADD  CONSTRAINT [FK_SoThichTienNghi_TienNghi] FOREIGN KEY([MaTienNghi])
REFERENCES [dbo].[TienNghi] ([MaTienNghi])
GO
ALTER TABLE [dbo].[SoThichTienNghi] CHECK CONSTRAINT [FK_SoThichTienNghi_TienNghi]
GO
ALTER TABLE [dbo].[SuDungDichVu]  WITH CHECK ADD  CONSTRAINT [FK_SuDungDichVu_DatPhong] FOREIGN KEY([MaDatPhong])
REFERENCES [dbo].[DatPhong] ([MaDatPhong])
GO
ALTER TABLE [dbo].[SuDungDichVu] CHECK CONSTRAINT [FK_SuDungDichVu_DatPhong]
GO
ALTER TABLE [dbo].[SuDungDichVu]  WITH CHECK ADD  CONSTRAINT [FK_SuDungDichVu_DichVu] FOREIGN KEY([MaDichVu])
REFERENCES [dbo].[DichVu] ([MaDichVu])
GO
ALTER TABLE [dbo].[SuDungDichVu] CHECK CONSTRAINT [FK_SuDungDichVu_DichVu]
GO
ALTER TABLE [dbo].[SuDungDichVu]  WITH CHECK ADD  CONSTRAINT [FK_SuDungDichVu_Phong] FOREIGN KEY([MaPhong])
REFERENCES [dbo].[Phong] ([MaPhong])
GO
ALTER TABLE [dbo].[SuDungDichVu] CHECK CONSTRAINT [FK_SuDungDichVu_Phong]
GO
ALTER TABLE [dbo].[TaiKhoan]  WITH CHECK ADD  CONSTRAINT [FK_TaiKhoan_VaiTro] FOREIGN KEY([MaVaiTro])
REFERENCES [dbo].[VaiTro] ([MaVaiTro])
GO
ALTER TABLE [dbo].[TaiKhoan] CHECK CONSTRAINT [FK_TaiKhoan_VaiTro]
GO
ALTER TABLE [dbo].[ThanhToan]  WITH CHECK ADD  CONSTRAINT [FK_ThanhToan_HoaDon] FOREIGN KEY([MaHoaDon])
REFERENCES [dbo].[HoaDon] ([MaHoaDon])
GO
ALTER TABLE [dbo].[ThanhToan] CHECK CONSTRAINT [FK_ThanhToan_HoaDon]
GO
ALTER TABLE [dbo].[BangGiaPhong]  WITH CHECK ADD  CONSTRAINT [CK_BangGiaPhong_Gia] CHECK  (([GiaPhong]>=(0)))
GO
ALTER TABLE [dbo].[BangGiaPhong] CHECK CONSTRAINT [CK_BangGiaPhong_Gia]
GO
ALTER TABLE [dbo].[BangGiaPhong]  WITH CHECK ADD  CONSTRAINT [CK_BangGiaPhong_Ngay] CHECK  (([DenNgay] IS NULL OR [DenNgay]>=[TuNgay]))
GO
ALTER TABLE [dbo].[BangGiaPhong] CHECK CONSTRAINT [CK_BangGiaPhong_Ngay]
GO
ALTER TABLE [dbo].[ChiTietDatPhong]  WITH CHECK ADD  CONSTRAINT [CK_ChiTietDatPhong_DonGia] CHECK  (([DonGia]>=(0)))
GO
ALTER TABLE [dbo].[ChiTietDatPhong] CHECK CONSTRAINT [CK_ChiTietDatPhong_DonGia]
GO
ALTER TABLE [dbo].[ChiTietDatPhong]  WITH CHECK ADD  CONSTRAINT [CK_ChiTietDatPhong_SoDem] CHECK  (([SoDem]>(0)))
GO
ALTER TABLE [dbo].[ChiTietDatPhong] CHECK CONSTRAINT [CK_ChiTietDatPhong_SoDem]
GO
ALTER TABLE [dbo].[ChiTietDatPhong]  WITH CHECK ADD  CONSTRAINT [CK_ChiTietDatPhong_ThanhTien] CHECK  (([ThanhTien]>=(0)))
GO
ALTER TABLE [dbo].[ChiTietDatPhong] CHECK CONSTRAINT [CK_ChiTietDatPhong_ThanhTien]
GO
ALTER TABLE [dbo].[DanhGia]  WITH CHECK ADD  CONSTRAINT [CK_DanhGia_SoSao] CHECK  (([SoSao]>=(1) AND [SoSao]<=(5)))
GO
ALTER TABLE [dbo].[DanhGia] CHECK CONSTRAINT [CK_DanhGia_SoSao]
GO
ALTER TABLE [dbo].[DatCoc]  WITH CHECK ADD  CONSTRAINT [CK_DatCoc_SoTien] CHECK  (([SoTien]>(0)))
GO
ALTER TABLE [dbo].[DatCoc] CHECK CONSTRAINT [CK_DatCoc_SoTien]
GO
ALTER TABLE [dbo].[DatPhong]  WITH CHECK ADD  CONSTRAINT [CK_DatPhong_Ngay] CHECK  (([NgayTraPhong]>[NgayNhanPhong]))
GO
ALTER TABLE [dbo].[DatPhong] CHECK CONSTRAINT [CK_DatPhong_Ngay]
GO
ALTER TABLE [dbo].[DatPhong]  WITH CHECK ADD  CONSTRAINT [CK_DatPhong_TrangThai] CHECK  (([TrangThai]=N'Đã hủy' OR [TrangThai]=N'Đã trả phòng' OR [TrangThai]=N'Đã nhận phòng' OR [TrangThai]=N'Đã đặt cọc' OR [TrangThai]=N'Đã xác nhận' OR [TrangThai]=N'Chờ xác nhận'))
GO
ALTER TABLE [dbo].[DatPhong] CHECK CONSTRAINT [CK_DatPhong_TrangThai]
GO
ALTER TABLE [dbo].[DichVu]  WITH CHECK ADD  CONSTRAINT [CK_DichVu_DonGia] CHECK  (([DonGia]>=(0)))
GO
ALTER TABLE [dbo].[DichVu] CHECK CONSTRAINT [CK_DichVu_DonGia]
GO
ALTER TABLE [dbo].[HoSoSoThich]  WITH CHECK ADD  CONSTRAINT [CK_HoSoSoThich_DanhGia] CHECK  (([MucDanhGiaMongMuon] IS NULL OR [MucDanhGiaMongMuon]>=(1) AND [MucDanhGiaMongMuon]<=(5)))
GO
ALTER TABLE [dbo].[HoSoSoThich] CHECK CONSTRAINT [CK_HoSoSoThich_DanhGia]
GO
ALTER TABLE [dbo].[HoSoSoThich]  WITH CHECK ADD  CONSTRAINT [CK_HoSoSoThich_NganSach] CHECK  (([NganSachToiThieu] IS NULL OR [NganSachToiDa] IS NULL OR [NganSachToiDa]>=[NganSachToiThieu]))
GO
ALTER TABLE [dbo].[HoSoSoThich] CHECK CONSTRAINT [CK_HoSoSoThich_NganSach]
GO
ALTER TABLE [dbo].[LichSuTuongTac]  WITH CHECK ADD  CONSTRAINT [CK_LichSuTuongTac_Loai] CHECK  (([LoaiTuongTac]=N'Đánh giá' OR [LoaiTuongTac]=N'Đặt phòng' OR [LoaiTuongTac]=N'Chọn phòng' OR [LoaiTuongTac]=N'Xem phòng'))
GO
ALTER TABLE [dbo].[LichSuTuongTac] CHECK CONSTRAINT [CK_LichSuTuongTac_Loai]
GO
ALTER TABLE [dbo].[LienHe]  WITH CHECK ADD  CONSTRAINT [CK_LienHe_TrangThai] CHECK  (([TrangThai]=N'Đã đóng' OR [TrangThai]=N'Đã phản hồi' OR [TrangThai]=N'Đang xử lý' OR [TrangThai]=N'Chờ xử lý'))
GO
ALTER TABLE [dbo].[LienHe] CHECK CONSTRAINT [CK_LienHe_TrangThai]
GO
ALTER TABLE [dbo].[LoaiPhong]  WITH CHECK ADD  CONSTRAINT [CK_LoaiPhong_Gia] CHECK  (([GiaCoBan]>=(0)))
GO
ALTER TABLE [dbo].[LoaiPhong] CHECK CONSTRAINT [CK_LoaiPhong_Gia]
GO
ALTER TABLE [dbo].[LoaiPhong]  WITH CHECK ADD  CONSTRAINT [CK_LoaiPhong_SucChua] CHECK  (([SucChuaNguoiLon]>(0)))
GO
ALTER TABLE [dbo].[LoaiPhong] CHECK CONSTRAINT [CK_LoaiPhong_SucChua]
GO
ALTER TABLE [dbo].[Phong]  WITH CHECK ADD  CONSTRAINT [CK_Phong_TrangThai] CHECK  (([TrangThai]=N'Ngừng hoạt động' OR [TrangThai]=N'Bảo trì' OR [TrangThai]=N'Đang dọn' OR [TrangThai]=N'Đang sử dụng' OR [TrangThai]=N'Trống'))
GO
ALTER TABLE [dbo].[Phong] CHECK CONSTRAINT [CK_Phong_TrangThai]
GO
ALTER TABLE [dbo].[SoThichTienNghi]  WITH CHECK ADD  CONSTRAINT [CK_SoThichTienNghi_UuTien] CHECK  (([MucDoUuTien]>=(1) AND [MucDoUuTien]<=(5)))
GO
ALTER TABLE [dbo].[SoThichTienNghi] CHECK CONSTRAINT [CK_SoThichTienNghi_UuTien]
GO
ALTER TABLE [dbo].[SuDungDichVu]  WITH CHECK ADD  CONSTRAINT [CK_SuDungDichVu_DonGia] CHECK  (([DonGia]>=(0)))
GO
ALTER TABLE [dbo].[SuDungDichVu] CHECK CONSTRAINT [CK_SuDungDichVu_DonGia]
GO
ALTER TABLE [dbo].[SuDungDichVu]  WITH CHECK ADD  CONSTRAINT [CK_SuDungDichVu_SoLuong] CHECK  (([SoLuong]>(0)))
GO
ALTER TABLE [dbo].[SuDungDichVu] CHECK CONSTRAINT [CK_SuDungDichVu_SoLuong]
GO
ALTER TABLE [dbo].[ThanhToan]  WITH CHECK ADD  CONSTRAINT [CK_ThanhToan_SoTien] CHECK  (([SoTien]>(0)))
GO
ALTER TABLE [dbo].[ThanhToan] CHECK CONSTRAINT [CK_ThanhToan_SoTien]
GO
ALTER TABLE [dbo].[TieuChiGoiY]  WITH CHECK ADD  CONSTRAINT [CK_TieuChiGoiY_TrongSo] CHECK  (([TrongSo]>=(0) AND [TrongSo]<=(1)))
GO
ALTER TABLE [dbo].[TieuChiGoiY] CHECK CONSTRAINT [CK_TieuChiGoiY_TrongSo]
GO
