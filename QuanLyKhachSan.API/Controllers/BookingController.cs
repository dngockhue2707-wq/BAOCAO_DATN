
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace QuanLyKhachSan.API.Controllers;

public class CreateBookingDto
{
    public int RoomTypeId { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime CheckOut { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; }
    public string? Note { get; set; }
}

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingController : ControllerBase
{
    private readonly SqlConnection _db;
    private readonly IAntiforgery _antiforgery;

    public BookingController(
        SqlConnection db,
        IAntiforgery antiforgery)
    {
        _db = db;
        _antiforgery = antiforgery;
    }

    private int? GetAccountId()
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out int id
        ) ? id : null;
    }

    private async Task<bool> ValidateCsrfToken()
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

    private async Task OpenConnection()
    {
        if (_db.State != ConnectionState.Open)
        {
            await _db.OpenAsync();
        }
    }

    private static void AddInt(
        SqlCommand command,
        string name,
        int value)
    {
        command.Parameters.Add(name, SqlDbType.Int).Value = value;
    }

    private static void AddDate(
        SqlCommand command,
        string name,
        DateTime value)
    {
        command.Parameters.Add(name, SqlDbType.Date).Value = value.Date;
    }

    private static void AddMoney(
        SqlCommand command,
        string name,
        decimal value)
    {
        var parameter = command.Parameters.Add(
            name,
            SqlDbType.Decimal
        );

        parameter.Precision = 18;
        parameter.Scale = 2;
        parameter.Value = value;
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create(
        [FromBody] CreateBookingDto dto)
    {
        if (!await ValidateCsrfToken())
        {
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ. Vui lòng tải lại trang."
            });
        }

        int? accountId = GetAccountId();

        if (!accountId.HasValue)
        {
            return Unauthorized(new
            {
                message = "Vui lòng đăng nhập để đặt phòng."
            });
        }

        DateTime checkIn = dto.CheckIn.Date;
        DateTime checkOut = dto.CheckOut.Date;

        int nights = (checkOut - checkIn).Days;

        if (dto.RoomTypeId <= 0 ||
            checkIn < DateTime.Today ||
            nights < 1 ||
            nights > 30 ||
            dto.Adults < 1 ||
            dto.Adults > 20 ||
            dto.Children < 0 ||
            dto.Children > 20)
        {
            return BadRequest(new
            {
                message = "Ngày nhận, ngày trả hoặc số lượng khách không hợp lệ."
            });
        }

        string? note = dto.Note?.Trim();

        if (note?.Length > 500)
        {
            return BadRequest(new
            {
                message = "Ghi chú không được vượt quá 500 ký tự."
            });
        }

        await OpenConnection();

        using var transaction =
            (SqlTransaction)await _db.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        try
        {
            int customerId;

            using (var command = new SqlCommand("""
                SELECT TOP 1 MaKhachHang
                FROM dbo.KhachHang
                WHERE MaTaiKhoan = @AccountId
                """, _db, transaction))
            {
                AddInt(command, "@AccountId", accountId.Value);

                object? value = await command.ExecuteScalarAsync();

                if (value is null or DBNull)
                {
                    await transaction.RollbackAsync();

                    return BadRequest(new
                    {
                        message = "Tài khoản chưa có hồ sơ khách hàng."
                    });
                }

                customerId = Convert.ToInt32(value);
            }

            decimal price;

            using (var command = new SqlCommand("""
                SELECT GiaCoBan
                FROM dbo.LoaiPhong
                WHERE MaLoaiPhong = @RoomTypeId
                  AND TrangThai = 1
                  AND SucChuaNguoiLon >= @Adults
                  AND SucChuaTreEm >= @Children
                """, _db, transaction))
            {
                AddInt(command, "@RoomTypeId", dto.RoomTypeId);
                AddInt(command, "@Adults", dto.Adults);
                AddInt(command, "@Children", dto.Children);

                object? value = await command.ExecuteScalarAsync();

                if (value is null or DBNull)
                {
                    await transaction.RollbackAsync();

                    return BadRequest(new
                    {
                        message = "Loại phòng không hoạt động hoặc không đủ sức chứa."
                    });
                }

                price = Convert.ToDecimal(value);
            }

            int roomId;

            using (var command = new SqlCommand("""
                SELECT TOP 1 p.MaPhong
                FROM dbo.Phong p WITH (UPDLOCK, HOLDLOCK)
                WHERE p.MaLoaiPhong = @RoomTypeId
                  AND p.TrangThai = N'Trống'
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM dbo.ChiTietDatPhong ct
                      INNER JOIN dbo.DatPhong dp
                          ON dp.MaDatPhong = ct.MaDatPhong
                      WHERE ct.MaPhong = p.MaPhong
                        AND dp.TrangThai IN
                        (
                            N'Chờ xác nhận',
                            N'Đã xác nhận',
                            N'Đã đặt cọc',
                            N'Đã nhận phòng'
                        )
                        AND dp.NgayNhanPhong < @CheckOut
                        AND dp.NgayTraPhong > @CheckIn
                  )
                ORDER BY p.MaPhong
                """, _db, transaction))
            {
                AddInt(command, "@RoomTypeId", dto.RoomTypeId);
                AddDate(command, "@CheckIn", checkIn);
                AddDate(command, "@CheckOut", checkOut);

                object? value = await command.ExecuteScalarAsync();

                if (value is null or DBNull)
                {
                    await transaction.RollbackAsync();

                    return Conflict(new
                    {
                        message = "Loại phòng này đã hết phòng trống trong thời gian bạn chọn."
                    });
                }

                roomId = Convert.ToInt32(value);
            }

            decimal total = price * nights;
            int bookingId;

            using (var command = new SqlCommand("""
                INSERT INTO dbo.DatPhong
                (
                    MaKhachHang,
                    NgayDat,
                    NgayNhanPhong,
                    NgayTraPhong,
                    SoNguoiLon,
                    SoTreEm,
                    TrangThai,
                    GhiChu
                )
                OUTPUT INSERTED.MaDatPhong
                VALUES
                (
                    @CustomerId,
                    SYSDATETIME(),
                    @CheckIn,
                    @CheckOut,
                    @Adults,
                    @Children,
                    N'Chờ xác nhận',
                    @Note
                )
                """, _db, transaction))
            {
                AddInt(command, "@CustomerId", customerId);
                AddDate(command, "@CheckIn", checkIn);
                AddDate(command, "@CheckOut", checkOut);
                AddInt(command, "@Adults", dto.Adults);
                AddInt(command, "@Children", dto.Children);

                command.Parameters.Add(
                    "@Note",
                    SqlDbType.NVarChar,
                    500
                ).Value = string.IsNullOrWhiteSpace(note)
                    ? DBNull.Value
                    : note;

                bookingId = Convert.ToInt32(
                    await command.ExecuteScalarAsync()
                );
            }

            using (var command = new SqlCommand("""
                INSERT INTO dbo.ChiTietDatPhong
                (
                    MaDatPhong,
                    MaPhong,
                    DonGia,
                    SoDem,
                    ThanhTien
                )
                VALUES
                (
                    @BookingId,
                    @RoomId,
                    @Price,
                    @Nights,
                    @Total
                )
                """, _db, transaction))
            {
                AddInt(command, "@BookingId", bookingId);
                AddInt(command, "@RoomId", roomId);
                AddMoney(command, "@Price", price);
                AddInt(command, "@Nights", nights);
                AddMoney(command, "@Total", total);

                await command.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                success = true,
                message = "Đặt phòng thành công! Đơn đang chờ xác nhận.",
                bookingId,
                roomId,
                nights,
                pricePerNight = price,
                total,
                status = "Chờ xác nhận"
            });
        }
        catch (SqlException ex) when (ex.Number is 1205 or 1222 or 3960)
        {
            await SafeRollbackAsync(transaction);

            return Conflict(new
            {
                message = "Phòng đang được người khác đặt. Vui lòng thử lại."
            });
        }
        catch
        {
            await SafeRollbackAsync(transaction);
            throw;
        }
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMine()
    {
        int? accountId = GetAccountId();

        if (!accountId.HasValue)
        {
            return Unauthorized();
        }

        await OpenConnection();

        using var command = new SqlCommand("""
            SELECT
                dp.MaDatPhong,
                lp.TenLoaiPhong,
                p.SoPhong,
                dp.NgayDat,
                dp.NgayNhanPhong,
                dp.NgayTraPhong,
                dp.SoNguoiLon,
                dp.SoTreEm,
                dp.TrangThai,
                ct.ThanhTien
            FROM dbo.DatPhong dp
            INNER JOIN dbo.KhachHang kh
                ON kh.MaKhachHang = dp.MaKhachHang
            INNER JOIN dbo.ChiTietDatPhong ct
                ON ct.MaDatPhong = dp.MaDatPhong
            INNER JOIN dbo.Phong p
                ON p.MaPhong = ct.MaPhong
            INNER JOIN dbo.LoaiPhong lp
                ON lp.MaLoaiPhong = p.MaLoaiPhong
            WHERE kh.MaTaiKhoan = @AccountId
            ORDER BY dp.NgayDat DESC, dp.MaDatPhong DESC
            """, _db);

        AddInt(command, "@AccountId", accountId.Value);

        var bookings = new List<object>();

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            bookings.Add(new
            {
                bookingId = reader.GetInt32(0),
                roomName = reader.GetString(1),
                roomNumber = reader.GetString(2),
                bookedAt = reader.GetDateTime(3),
                checkIn = reader.GetDateTime(4),
                checkOut = reader.GetDateTime(5),
                adults = reader.GetInt32(6),
                children = reader.GetInt32(7),
                status = reader.GetString(8),
                total = reader.GetDecimal(9)
            });
        }

        return Ok(new
        {
            success = true,
            bookings
        });
    }

    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Cancel(int id)
    {
        if (!await ValidateCsrfToken())
        {
            return BadRequest(new
            {
                message = "Phiên biểu mẫu không hợp lệ."
            });
        }

        int? accountId = GetAccountId();

        if (!accountId.HasValue)
        {
            return Unauthorized();
        }

        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Mã đặt phòng không hợp lệ."
            });
        }

        await OpenConnection();

        using var command = new SqlCommand("""
            UPDATE dp
            SET
                dp.TrangThai = N'Đã hủy',
                dp.LyDoHuy = N'Khách hàng tự hủy'
            FROM dbo.DatPhong dp
            INNER JOIN dbo.KhachHang kh
                ON kh.MaKhachHang = dp.MaKhachHang
            WHERE dp.MaDatPhong = @BookingId
              AND kh.MaTaiKhoan = @AccountId
              AND dp.TrangThai = N'Chờ xác nhận'
              AND dp.NgayNhanPhong > CAST(GETDATE() AS date)
            """, _db);

        AddInt(command, "@BookingId", id);
        AddInt(command, "@AccountId", accountId.Value);

        int affected = await command.ExecuteNonQueryAsync();

        if (affected == 0)
        {
            return BadRequest(new
            {
                message = "Không thể hủy đơn đã xác nhận, đã hủy hoặc đến ngày nhận phòng."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Hủy đặt phòng thành công!"
        });
    }

    private static async Task SafeRollbackAsync(
        SqlTransaction transaction)
    {
        try
        {
            await transaction.RollbackAsync();
        }
        catch (InvalidOperationException)
        {
        }
        catch (SqlException)
        {
        }
    }
}
