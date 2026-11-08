using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;
using Microsoft.AspNetCore.Identity;
using System.Text.RegularExpressions;

namespace QuanLyKhachSan.API.Controllers;

public class AdminRoomStatusDto
{
    public string Status { get; set; } = "";
}

public class AdminBookingStatusDto
{
    public string Status { get; set; } = "";
}

public class AdminEmployeeCreateDto
{
    public string Name { get; set; } = "";
    public string Position { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string Username { get; set; } = "";
}

public class AdminEmployeeUpdateDto
{
    public string Name { get; set; } = "";
    public string Position { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public bool Active { get; set; } = true;
}

public class AdminServiceDto
{
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal Price { get; set; }
    public string Description { get; set; } = "";
    public bool Active { get; set; } = true;
}

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly HotelDbContext _db;
    private readonly IAntiforgery _antiforgery;
    private readonly IPasswordHasher<object> _hasher;
    private readonly IConfiguration _configuration;

    public AdminController(
        HotelDbContext db,
        IAntiforgery antiforgery,
        IPasswordHasher<object> hasher,
        IConfiguration configuration)
    {
        _db = db;
        _antiforgery = antiforgery;
        _hasher = hasher;
        _configuration = configuration;
    }

    private async Task<bool> ValidCsrf()
    {
        try
        {
            await _antiforgery.ValidateRequestAsync(HttpContext);
            return true;
        }
        catch (AntiforgeryValidationException)
        {
            return false;
        }
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var totalRooms = await _db.Set<Phong>().CountAsync();

        var availableRooms = await _db.Set<Phong>()
            .CountAsync(x => x.TrangThai == "Trống");

        var pendingBookings = await _db.Set<DatPhong>()
            .CountAsync(x => x.TrangThai == "Chờ xác nhận");

        var totalCustomers = await _db.Set<KhachHang>()
            .CountAsync();

        var totalEmployees = await _db.Set<NhanVien>()
            .CountAsync();

        var activeServices = await _db.Set<DichVu>()
            .CountAsync(x => x.TrangThai);

        return Ok(new
        {
            totalRooms,
            availableRooms,
            pendingBookings,
            totalCustomers,
            totalEmployees,
            activeServices
        });
    }

    [HttpGet("rooms")]
    public async Task<IActionResult> Rooms()
    {
        var items = await (
            from room in _db.Set<Phong>()
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby room.Tang, room.SoPhong
            select new
            {
                id = room.MaPhong,
                number = room.SoPhong,
                floor = room.Tang ?? 0,
                status = room.TrangThai,
                type = type.TenLoaiPhong
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPut("rooms/{id:int}/status")]
    public async Task<IActionResult> UpdateRoomStatus(
        int id,
        [FromBody] AdminRoomStatusDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string status = dto.Status?.Trim() ?? "";

        string[] allowed =
        {
            "Trống",
            "Đang sử dụng",
            "Đang dọn",
            "Bảo trì",
            "Ngừng hoạt động"
        };

        if (!allowed.Contains(status))
        {
            return BadRequest(new
            {
                message = "Trạng thái không hợp lệ."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        var blockingRoomIds =
            from detail in _db.Set<ChiTietDatPhong>()
            join booking in _db.Set<DatPhong>()
                on detail.MaDatPhong equals booking.MaDatPhong
            where booking.TrangThai == "Chờ xác nhận" ||
                  booking.TrangThai == "Đã xác nhận" ||
                  booking.TrangThai == "Đã đặt cọc" ||
                  booking.TrangThai == "Đã nhận phòng"
            where booking.NgayTraPhong > today
            select detail.MaPhong;

        var query = _db.Set<Phong>()
            .Where(x => x.MaPhong == id);

        if (status == "Bảo trì" ||
            status == "Ngừng hoạt động")
        {
            query = query.Where(x =>
                !blockingRoomIds.Contains(x.MaPhong));
        }

        int affected = await query.ExecuteUpdateAsync(
            setters => setters.SetProperty(
                x => x.TrangThai,
                status));

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Không thể sửa trạng thái phòng này."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật phòng."
        });
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings()
    {
        var items = await (
            from booking in _db.Set<DatPhong>()
            join customer in _db.Set<KhachHang>()
                on booking.MaKhachHang equals customer.MaKhachHang
            join detail in _db.Set<ChiTietDatPhong>()
                on booking.MaDatPhong equals detail.MaDatPhong
            join room in _db.Set<Phong>()
                on detail.MaPhong equals room.MaPhong
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            orderby booking.MaDatPhong descending
            select new
            {
                id = booking.MaDatPhong,
                customer = customer.HoTen,
                roomNumber = room.SoPhong,
                roomType = type.TenLoaiPhong,
                checkIn = booking.NgayNhanPhong,
                checkOut = booking.NgayTraPhong,
                status = booking.TrangThai,
                total = detail.ThanhTien
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPut("bookings/{id:int}/status")]
    public async Task<IActionResult> UpdateBookingStatus(
        int id,
        [FromBody] AdminBookingStatusDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        if (dto.Status != "Đã xác nhận" &&
            dto.Status != "Đã hủy")
        {
            return BadRequest(new
            {
                message = "Chỉ hỗ trợ xác nhận hoặc hủy đơn."
            });
        }

        var today = DateOnly.FromDateTime(DateTime.Today);

        var query = _db.Set<DatPhong>()
            .Where(x =>
                x.MaDatPhong == id &&
                x.TrangThai == "Chờ xác nhận" &&
                x.NgayNhanPhong >= today);

        int affected;

        if (dto.Status == "Đã xác nhận")
        {
            affected = await query.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đã xác nhận")
                    .SetProperty(
                        x => x.NgayXacNhan,
                        DateTime.Now));
        }
        else
        {
            affected = await query.ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(
                        x => x.TrangThai,
                        "Đã hủy")
                    .SetProperty(
                        x => x.LyDoHuy,
                        "Quản trị viên hủy"));
        }

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Đơn không còn chờ xác nhận."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật đặt phòng."
        });
    }

    [HttpGet("customers/{id:int}/bookings")]
    public async Task<IActionResult> CustomerBookings(int id)
    {
        var exists = await _db.Set<KhachHang>()
            .AnyAsync(x => x.MaKhachHang == id);

        if (!exists)
        {
            return NotFound(new
            {
                message = "Không tìm thấy khách hàng."
            });
        }

        var items = await (
            from booking in _db.Set<DatPhong>()
            join detail in _db.Set<ChiTietDatPhong>()
                on booking.MaDatPhong equals detail.MaDatPhong
            join room in _db.Set<Phong>()
                on detail.MaPhong equals room.MaPhong
            join type in _db.Set<LoaiPhong>()
                on room.MaLoaiPhong equals type.MaLoaiPhong
            where booking.MaKhachHang == id
            group new { booking, detail, room, type } by new
            {
                booking.MaDatPhong,
                booking.NgayNhanPhong,
                booking.NgayTraPhong,
                booking.TrangThai
            }
            into g
            orderby g.Key.MaDatPhong descending
            select new
            {
                id = g.Key.MaDatPhong,
                checkIn = g.Key.NgayNhanPhong,
                checkOut = g.Key.NgayTraPhong,
                status = g.Key.TrangThai,
                total = g.Sum(x => x.detail.ThanhTien),
                rooms = string.Join(", ", g.Select(x =>
                    x.type.TenLoaiPhong + " - " + x.room.SoPhong))
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new
        {
            success = true,
            items
        });
    }

    [HttpGet("customers")]
    public async Task<IActionResult> Customers()
    {
        var items = await (
            from customer in _db.Set<KhachHang>()
            join account in _db.Set<TaiKhoan>()
                on customer.MaTaiKhoan equals
                   (int?)account.MaTaiKhoan into accounts
            from account in accounts.DefaultIfEmpty()
            orderby customer.MaKhachHang descending
            select new
            {
                id = customer.MaKhachHang,
                accountId = customer.MaTaiKhoan,
                name = customer.HoTen,
                phone = customer.SoDienThoai ?? "",
                email = customer.Email ?? "",
                address = customer.DiaChi ?? "",
                createdAt = customer.NgayTao,
                username = account != null
                    ? account.TenDangNhap
                    : ""
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPost("employees")]
    public async Task<IActionResult> CreateEmployee(
        [FromBody] AdminEmployeeCreateDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string name = dto.Name?.Trim() ?? "";
        string position = dto.Position?.Trim() ?? "";
        string phone = dto.Phone?.Trim() ?? "";
        string email = dto.Email?.Trim() ?? "";
        string username = dto.Username?.Trim() ?? "";

        if (name.Length < 2 || name.Length > 100 ||
            position.Length < 1 || position.Length > 100 ||
            phone.Length > 20 ||
            email.Length > 150 ||
            username.Length < 4 || username.Length > 100 ||
            !Regex.IsMatch(username, @"^[a-zA-Z0-9_]+$"))
        {
            return BadRequest(new
            {
                message = "Thông tin không hợp lệ. Tên đăng nhập phải có từ 4 ký tự và chỉ chứa chữ, số hoặc dấu gạch dưới."
            });
        }

        if (!string.IsNullOrEmpty(email) &&
            (!System.Net.Mail.MailAddress.TryCreate(email, out var address) ||
            address.Address != email))
        {
            return BadRequest(new
            {
                message = "Email không hợp lệ."
            });
        }

        string password =
            _configuration["EmployeeInitialPassword"] ?? "";

        if (password.Length < 12 || password.Length > 128)
        {
            return StatusCode(500, new
            {
                message = "Chưa cấu hình mật khẩu ban đầu cho nhân viên."
            });
        }

        var role = await _db.Set<VaiTro>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.TenVaiTro == "NhanVien" ||
                x.TenVaiTro == "Nhân viên");

        if (role == null)
        {
            return BadRequest(new
            {
                message = "Chưa thiết lập vai trò nhân viên."
            });
        }

        bool exists = await _db.Set<TaiKhoan>()
            .AnyAsync(x => x.TenDangNhap == username);

        if (exists)
        {
            return Conflict(new
            {
                message = "Tên đăng nhập đã tồn tại."
            });
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync();

        try
        {
            var account = new TaiKhoan
            {
                TenDangNhap = username,
                MatKhau = _hasher.HashPassword(new object(), password),
                Email = string.IsNullOrWhiteSpace(email) ? null : email,
                MaVaiTro = role.MaVaiTro,
                TrangThai = true,
                NgayTao = DateTime.Now
            };

            _db.Set<TaiKhoan>().Add(account);
            await _db.SaveChangesAsync();

            var employee = new NhanVien
            {
                MaTaiKhoan = account.MaTaiKhoan,
                HoTen = name,
                ChucVu = position,
                SoDienThoai = string.IsNullOrWhiteSpace(phone) ? null : phone,
                Email = string.IsNullOrWhiteSpace(email) ? null : email,
                TrangThai = true
            };

            _db.Set<NhanVien>().Add(employee);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                id = employee.MaNhanVien,
                message = "Đã thêm nhân viên và tạo tài khoản đăng nhập thành công."
            });
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Microsoft.Data.SqlClient.SqlException
                { Number: 2601 or 2627 })
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message = "Tên đăng nhập hoặc dữ liệu đã tồn tại."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpGet("employees")]
    public async Task<IActionResult> Employees()
    {
        var items = await (
            from employee in _db.Set<NhanVien>()
            join account in _db.Set<TaiKhoan>()
                on employee.MaTaiKhoan equals account.MaTaiKhoan
            join role in _db.Set<VaiTro>()
                on account.MaVaiTro equals role.MaVaiTro
            orderby employee.MaNhanVien descending
            select new
            {
                id = employee.MaNhanVien,
                name = employee.HoTen,
                phone = employee.SoDienThoai ?? "",
                email = employee.Email ?? "",
                position = employee.ChucVu ?? "",
                active = employee.TrangThai,
                username = account.TenDangNhap,
                role = account.TenDangNhap == "admin_dnk"
                    ? "Admin"
                    : "NhanVien"
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpPut("employees/{id:int}")]
    public async Task<IActionResult> UpdateEmployee(
        int id,
        [FromBody] AdminEmployeeUpdateDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        string name = dto.Name?.Trim() ?? "";
        string position = dto.Position?.Trim() ?? "";
        string phone = dto.Phone?.Trim() ?? "";
        string email = dto.Email?.Trim() ?? "";

        if (name.Length < 1 ||
            name.Length > 100 ||
            position.Length < 1 ||
            position.Length > 100 ||
            phone.Length > 20 ||
            email.Length > 150)
        {
            return BadRequest(new
            {
                message = "Thông tin nhân viên không hợp lệ."
            });
        }


        var data = await (
            from nv in _db.Set<NhanVien>()
            join tk in _db.Set<TaiKhoan>()
                on nv.MaTaiKhoan equals tk.MaTaiKhoan
            join role in _db.Set<VaiTro>()
                on tk.MaVaiTro equals role.MaVaiTro
            where nv.MaNhanVien == id
            && (role.TenVaiTro == "NhanVien" ||
                role.TenVaiTro == "Nhân viên")
            select new
            {
                Employee = nv,
                Account = tk
            }
        ).FirstOrDefaultAsync();
        
        if (data == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy nhân viên được phép sửa."
            });
        }

        var employee = data.Employee;
        var account = data.Account;

        employee.HoTen = name;
        employee.ChucVu = position;
        employee.SoDienThoai =
            string.IsNullOrWhiteSpace(phone) ? null : phone;
        employee.Email =
            string.IsNullOrWhiteSpace(email) ? null : email;
        employee.TrangThai = dto.Active;

        account.TrangThai = dto.Active;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = dto.Active
                ? "Đã cập nhật nhân viên và kích hoạt tài khoản."
                : "Đã ngừng hoạt động và khóa tài khoản nhân viên."
        });

    }

    [HttpGet("services")]
    public async Task<IActionResult> Services()
    {
        var items = await _db.Set<DichVu>()
            .AsNoTracking()
            .OrderByDescending(x => x.MaDichVu)
            .Select(x => new
            {
                id = x.MaDichVu,
                name = x.TenDichVu,
                unit = x.DonViTinh ?? "",
                price = x.DonGia,
                description = x.MoTa ?? "",
                active = x.TrangThai,
                image = x.HinhAnh
            })
            .ToListAsync();

        return Ok(new { items });
    }

    private static string? ValidateService(
        AdminServiceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) ||
            dto.Name.Trim().Length > 100)
            return "Tên dịch vụ không hợp lệ.";

        if ((dto.Unit?.Length ?? 0) > 50)
            return "Đơn vị tính không hợp lệ.";

        if ((dto.Description?.Length ?? 0) > 500)
            return "Mô tả không được vượt quá 500 ký tự.";

        if (dto.Price < 0 ||
            dto.Price > 1000000000)
            return "Giá dịch vụ không hợp lệ.";

        return null;
    }

    [HttpPost("services")]
    public async Task<IActionResult> CreateService(
        [FromBody] AdminServiceDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        var error = ValidateService(dto);

        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        var service = new DichVu
        {
            TenDichVu = dto.Name.Trim(),
            DonViTinh = dto.Unit?.Trim(),
            DonGia = dto.Price,
            MoTa = dto.Description?.Trim(),
            TrangThai = dto.Active
        };

        _db.Set<DichVu>().Add(service);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            id = service.MaDichVu,
            message = "Đã thêm dịch vụ."
        });
    }

    [HttpPut("services/{id:int}")]
    public async Task<IActionResult> UpdateService(
        int id,
        [FromBody] AdminServiceDto dto)
    {
        if (!await ValidCsrf())
        {
            return BadRequest(new
            {
                message = "Mã bảo vệ không hợp lệ."
            });
        }

        var error = ValidateService(dto);

        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        var service = await _db.Set<DichVu>()
            .FirstOrDefaultAsync(x => x.MaDichVu == id);

        if (service == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy dịch vụ."
            });
        }

        service.TenDichVu = dto.Name.Trim();
        service.DonViTinh = dto.Unit?.Trim();
        service.DonGia = dto.Price;
        service.MoTa = dto.Description?.Trim();
        service.TrangThai = dto.Active;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Đã cập nhật dịch vụ."
        });
    }
    
    [HttpGet("invoices/{id:int}")]
    public async Task<IActionResult> InvoiceDetail(int id)
    {
        var invoice = await (
            from hd in _db.Set<HoaDon>()
            join dp in _db.Set<DatPhong>()
                on hd.MaDatPhong equals dp.MaDatPhong
            join kh in _db.Set<KhachHang>()
                on dp.MaKhachHang equals kh.MaKhachHang
            where hd.MaHoaDon == id
            select new
            {
                id = hd.MaHoaDon,
                bookingId = hd.MaDatPhong,
                customer = kh.HoTen,
                phone = kh.SoDienThoai,
                email = kh.Email,
                checkIn = dp.NgayNhanPhong,
                checkOut = dp.NgayTraPhong,
                bookingStatus = dp.TrangThai,
                date = hd.NgayLap,
                roomAmount = hd.TienPhong,
                serviceAmount = hd.TienDichVu,
                deposit = hd.TienDatCoc,
                discount = hd.GiamGia,
                total = hd.TongTien,
                remaining = hd.SoTienConLai,
                status = hd.TrangThai,
                note = hd.GhiChu
            }
        ).AsNoTracking().FirstOrDefaultAsync();

        if (invoice == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy hóa đơn."
            });
        }

        var payments = await _db.Set<ThanhToan>()
            .AsNoTracking()
            .Where(x => x.MaHoaDon == id)
            .OrderByDescending(x => x.NgayThanhToan)
            .Select(x => new
            {
                id = x.MaThanhToan,
                amount = x.SoTien,
                method = x.PhuongThuc,
                date = x.NgayThanhToan,
                transactionCode = x.MaGiaoDich,
                status = x.TrangThai
            })
            .ToListAsync();

        var deposits = await _db.Set<DatCoc>()
            .AsNoTracking()
            .Where(x => x.MaDatPhong == invoice.bookingId)
            .OrderByDescending(x => x.NgayDatCoc)
            .Select(x => new
            {
                id = x.MaDatCoc,
                amount = x.SoTien,
                method = x.PhuongThuc,
                date = x.NgayDatCoc,
                transactionCode = x.MaGiaoDich,
                status = x.TrangThai
            })
            .ToListAsync();

        return Ok(new
        {
            invoice,
            payments,
            deposits
        });
    }


    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        var items = await (
            from invoice in _db.Set<HoaDon>()
            join booking in _db.Set<DatPhong>()
                on invoice.MaDatPhong equals booking.MaDatPhong
            join customer in _db.Set<KhachHang>()
                on booking.MaKhachHang equals customer.MaKhachHang
            orderby invoice.MaHoaDon descending
            select new
            {
                id = invoice.MaHoaDon,
                bookingId = invoice.MaDatPhong,
                customer = customer.HoTen,
                date = invoice.NgayLap,
                roomAmount = invoice.TienPhong,
                serviceAmount = invoice.TienDichVu,
                deposit = invoice.TienDatCoc,
                discount = invoice.GiamGia,
                total = invoice.TongTien,
                remaining = invoice.SoTienConLai,
                status = invoice.TrangThai
            }
        ).AsNoTracking().ToListAsync();

        return Ok(new { items });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports([FromQuery] int? year)
    {
        int selectedYear = year ?? DateTime.Today.Year;

        if (selectedYear < 2000 || selectedYear > 2100)
        {
            return BadRequest(new
            {
                message = "Năm thống kê không hợp lệ."
            });
        }

        var bookings = await _db.Set<DatPhong>()
            .AsNoTracking()
            .Select(x => x.TrangThai)
            .ToListAsync();

        var invoices = await _db.Set<HoaDon>()
            .AsNoTracking()
            .Where(x => x.NgayLap.Year == selectedYear)
            .Select(x => new
            {
                x.NgayLap,
                x.TongTien
            })
            .ToListAsync();

        var payments = await _db.Set<ThanhToan>()
            .AsNoTracking()
            .Where(x =>
                x.NgayThanhToan.Year == selectedYear &&
                (x.TrangThai == "Thành công" ||
                x.TrangThai == "Đã thanh toán"))
            .Select(x => new
            {
                x.NgayThanhToan,
                x.SoTien
            })
            .ToListAsync();

        var roomStatuses = await _db.Set<Phong>()
            .AsNoTracking()
            .GroupBy(x => x.TrangThai)
            .Select(g => new
            {
                status = g.Key,
                count = g.Count()
            })
            .ToListAsync();

        var monthly = Enumerable.Range(1, 12)
            .Select(month => new
            {
                month,
                invoiceAmount = invoices
                    .Where(x => x.NgayLap.Month == month)
                    .Sum(x => x.TongTien),
                receivedAmount = payments
                    .Where(x => x.NgayThanhToan.Month == month)
                    .Sum(x => x.SoTien)
            })
            .ToList();

        var bookingStatuses = bookings
            .GroupBy(x => x ?? "Chưa xác định")
            .Select(g => new
            {
                status = g.Key,
                count = g.Count()
            })
            .OrderByDescending(x => x.count)
            .ToList();

        return Ok(new
        {
            year = selectedYear,
            totalBookings = bookings.Count,
            completedBookings = bookings.Count(x => x == "Đã trả phòng"),
            cancelledBookings = bookings.Count(x => x == "Đã hủy"),
            invoicedAmount = invoices.Sum(x => x.TongTien),
            receivedAmount = payments.Sum(x => x.SoTien),
            monthly,
            bookingStatuses,
            roomStatuses
        });
    }

}