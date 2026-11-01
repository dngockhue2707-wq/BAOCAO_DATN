using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyKhachSan.API.Data;
using QuanLyKhachSan.API.Data.Entities;

namespace QuanLyKhachSan.API.Controllers;

[ApiController]
[Route("api/services")]
[AllowAnonymous]
public class ServicesController : ControllerBase
{
    private readonly HotelDbContext _db;

    public ServicesController(HotelDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetServices()
    {
        var items = await _db.Set<DichVu>()
            .AsNoTracking()
            .Where(x => x.TrangThai)
            .OrderBy(x => x.TenDichVu)
            .Select(x => new
            {
                id = x.MaDichVu,
                name = x.TenDichVu,
                unit = x.DonViTinh ?? "",
                price = x.DonGia,
                description = x.MoTa ?? "",
                image = x.HinhAnh
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            items
        });
    }
}