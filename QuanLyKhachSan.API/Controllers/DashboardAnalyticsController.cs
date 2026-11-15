
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/admin/dashboard-analytics")]
[Authorize(Roles = "Admin")]
public class DashboardAnalyticsController : ControllerBase
{
    private readonly HotelDbContext _db;

    public DashboardAnalyticsController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAnalytics(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var start = from ?? today.AddDays(-6);
        var end = to ?? today;

        if (start.Year < 2000 || end.Year > 2100)
        {
            return BadRequest(new
            {
                message = "Ngày thống kê phải nằm trong khoảng 2000–2100."
            });
        }

        if (start > end)
        {
            return BadRequest(new
            {
                message = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            });
        }

        int numberOfDays = end.DayNumber - start.DayNumber + 1;

        if (numberOfDays > 366)
        {
            return BadRequest(new
            {
                message = "Khoảng thống kê tối đa là 366 ngày."
            });
        }

        DateTime startTime = start.ToDateTime(TimeOnly.MinValue);
        DateTime endTime = end.AddDays(1).ToDateTime(TimeOnly.MinValue);

        var payments = await _db.Set<ThanhToan>()
            .AsNoTracking()
            .Where(x =>
                x.NgayThanhToan >= startTime &&
                x.NgayThanhToan < endTime &&
                (x.TrangThai == "Thành công" ||
                 x.TrangThai == "Đã thanh toán"))
            .Select(x => new
            {
                x.NgayThanhToan,
                x.SoTien
            })
            .ToListAsync();

        var groups = payments
            .GroupBy(x => DateOnly.FromDateTime(x.NgayThanhToan))
            .ToDictionary(
                x => x.Key,
                x => new
                {
                    Amount = x.Sum(p => p.SoTien),
                    Transactions = x.Count()
                }
            );

        var daily = Enumerable.Range(0, numberOfDays)
            .Select(index =>
            {
                var date = start.AddDays(index);
                groups.TryGetValue(date, out var item);

                return new
                {
                    date = date.ToString("yyyy-MM-dd"),
                    amount = item?.Amount ?? 0m,
                    transactions = item?.Transactions ?? 0
                };
            })
            .ToList();

        var roomStatuses = await _db.Set<Phong>()
            .AsNoTracking()
            .GroupBy(x => x.TrangThai)
            .Select(x => new
            {
                status = x.Key,
                count = x.Count()
            })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            from = start.ToString("yyyy-MM-dd"),
            to = end.ToString("yyyy-MM-dd"),
            totalReceived = daily.Sum(x => x.amount),
            successfulTransactions = daily.Sum(x => x.transactions),
            daily,
            roomStatuses,
            totalRooms = roomStatuses.Sum(x => x.count)
        });
    }

    [HttpGet("hourly")]
    public async Task<IActionResult> GetHourly(
        [FromQuery] DateOnly? date)
    {
        var selectedDate = date ??
            DateOnly.FromDateTime(DateTime.Today);

        if (selectedDate.Year < 2000 || selectedDate.Year > 2100)
        {
            return BadRequest(new
            {
                message = "Ngày thống kê không hợp lệ."
            });
        }

        DateTime startTime =
            selectedDate.ToDateTime(TimeOnly.MinValue);

        DateTime endTime = startTime.AddDays(1);

        var payments = await _db.Set<ThanhToan>()
            .AsNoTracking()
            .Where(x =>
                x.NgayThanhToan >= startTime &&
                x.NgayThanhToan < endTime &&
                (x.TrangThai == "Thành công" ||
                 x.TrangThai == "Đã thanh toán"))
            .Select(x => new
            {
                x.NgayThanhToan,
                x.SoTien
            })
            .ToListAsync();

        var groups = payments
            .GroupBy(x => x.NgayThanhToan.Hour)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Amount = g.Sum(x => x.SoTien),
                    Transactions = g.Count()
                }
            );

        var hourly = Enumerable.Range(0, 24)
            .Select(hour =>
            {
                groups.TryGetValue(hour, out var item);

                return new
                {
                    hour,
                    label = $"{hour:00}:00",
                    amount = item?.Amount ?? 0m,
                    transactions = item?.Transactions ?? 0
                };
            })
            .ToList();

        return Ok(new
        {
            success = true,
            date = selectedDate.ToString("yyyy-MM-dd"),
            totalReceived = hourly.Sum(x => x.amount),
            successfulTransactions = hourly.Sum(x => x.transactions),
            hourly
        });
    }
}
